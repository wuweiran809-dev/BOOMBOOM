#!/bin/sh

set -eu

BOOMBOOM_PATH=${1:-/var/www/boomboom}

if [ ! -e "$BOOMBOOM_PATH" ]; then
  echo "Error - path \"$BOOMBOOM_PATH\" wasn't found"
  echo ""
  echo "If boomboom was installed in another path, you can specify it with"
  echo "    ./upgrade.sh <PATH>"
  exit 1
fi

if [ ! -e "$BOOMBOOM_PATH/versions" -o ! -e "$BOOMBOOM_PATH/config/production.yaml" ]; then
  echo "Error - Couldn't find boomboom installation in \"$BOOMBOOM_PATH\""
  echo ""
  echo "If boomboom was installed in another path, you can specify it with"
  echo "    ./upgrade.sh <PATH>"
  exit 1
fi

if [ -x "$(command -v awk)" ] && [ -x "$(command -v sed)" ]; then
    REMAINING=$(df -k "$BOOMBOOM_PATH" | awk '{ print $4}' | sed -n 2p)
    THREE_GB=$((3 * 1024 * 1024))

    if [ "$REMAINING" -lt "$THREE_GB" ]; then
      echo "Error - not enough free space for upgrading"
      echo ""
      echo "Make sure you have at least 3 GB of free space in $BOOMBOOM_PATH"
      exit 1
    fi
fi

# Backup database
if [ -x "$(command -v pg_dump)" ]; then
  mkdir -p "$BOOMBOOM_PATH/backup"

  SQL_BACKUP_PATH="$BOOMBOOM_PATH/backup/sql-boomboom_prod-$(date +"%Y%m%d-%H%M").bak"

  echo "Backing up PostgreSQL database in $SQL_BACKUP_PATH"

read DB_HOST DB_SUFFIX DB_NAME DB_USER DB_PASS DB_PORT <<EOF
  $(node -e "
    const config = require('js-yaml').load(require('fs').readFileSync(process.argv[1], 'utf8'))['database'];
    console.log([
      config.hostname || '',
      config.suffix || '',
      config.name || '',
      config.username || '',
      config.password || '',
      config.port || 5432
    ].join('\n'));
  " -- "$BOOMBOOM_PATH/config/production.yaml")
EOF

  pg_dump_cmd() {
    pg_dump -F c "${DB_NAME:-boomboom${DB_SUFFIX}}" -f "$SQL_BACKUP_PATH" "$@"
  }

  # Empty hostname means that we should connect using default postgres socket using peer auth
  # For non-empty host we are using network connection with credentials
  if [ -z "$DB_HOST" ]; then
    pg_dump_cmd
  else
    PGPASSWORD="$DB_PASS" pg_dump_cmd -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT"
  fi

  echo "Backup complete"
else
  echo "pg_dump not found. Cannot make a SQL backup!"
fi

# If there is a pre-release, give the user a choice which one to install.
RELEASE_VERSION=$(curl -s https://api.github.com/repos/chocobozzz/boomboom/releases/latest | grep tag_name | cut -d '"' -f 4)
PRE_RELEASE_VERSION=$(curl -s https://api.github.com/repos/chocobozzz/boomboom/releases | grep tag_name | head -1 | cut -d '"' -f 4)

if [ "$RELEASE_VERSION" != "$PRE_RELEASE_VERSION" ]; then
  printf "Which version do you want to install?\n[1] %s (stable) \n[2] %s (pre-release)\n" "$RELEASE_VERSION" "$PRE_RELEASE_VERSION"
  read choice
  case $choice in
      [1]* ) VERSION="$RELEASE_VERSION";;
      [2]* ) VERSION="$PRE_RELEASE_VERSION";;
      * ) exit;
  esac
else
  VERSION="$RELEASE_VERSION"
fi

if [ -z "$VERSION" ]; then
  echo "Error - could not determine the version to install"
  echo ""
  echo "This usually means the GitHub API call failed (rate limit, network issue,"
  echo "or unexpected response). Please retry in a few minutes."
  exit 1
fi

echo "Installing Boomboom version $VERSION"
wget -q "https://github.com/Chocobozzz/BoomBoom/releases/download/${VERSION}/boomboom-${VERSION}.zip" -O "$BOOMBOOM_PATH/versions/boomboom-${VERSION}.zip"
cd "$BOOMBOOM_PATH/versions"
unzip -o "boomboom-${VERSION}.zip"
rm -f "boomboom-${VERSION}.zip"

RELEASE_PAGE_URL="https://github.com/Chocobozzz/BoomBoom/releases/tag/${VERSION}"
LATEST_VERSION_DIRECTORY="$BOOMBOOM_PATH/versions/boomboom-${VERSION}"
cd "$LATEST_VERSION_DIRECTORY"

npm run install-node-dependencies -- --production

OLD_VERSION_DIRECTORY=$(readlink "$BOOMBOOM_PATH/boomboom-latest")


rm -f "$BOOMBOOM_PATH/boomboom-latest"
ln -s "$LATEST_VERSION_DIRECTORY" "$BOOMBOOM_PATH/boomboom-latest"

RESOLVED_TARGET=$(cd -P "$BOOMBOOM_PATH/boomboom-latest" 2>/dev/null && pwd) || RESOLVED_TARGET=""
EXPECTED_TARGET=$(cd -P "$LATEST_VERSION_DIRECTORY" 2>/dev/null && pwd) || {
  echo "Error - could not resolve $LATEST_VERSION_DIRECTORY"
  exit 1
}

if [ -z "$RESOLVED_TARGET" ] || [ "$RESOLVED_TARGET" != "$EXPECTED_TARGET" ]; then
  echo "Error - boomboom-latest symlink is broken after update"
  echo "  Expected : $EXPECTED_TARGET"
  echo "  Resolved : ${RESOLVED_TARGET:-<unresolvable>}"
  exit 1
fi

cp "$BOOMBOOM_PATH/boomboom-latest/config/default.yaml" "$BOOMBOOM_PATH/config/default.yaml"

echo ""
echo "=========================================================="
echo ""

if [ -x "$(command -v git)" ]; then
  cd "$BOOMBOOM_PATH"

  git merge-file -p config/production.yaml "$OLD_VERSION_DIRECTORY/config/production.yaml.example" "boomboom-latest/config/production.yaml.example" | tee "config/production.yaml.new" > /dev/null
  echo "$BOOMBOOM_PATH/config/production.yaml.new generated"
  echo "You can review it and replace your existing production.yaml configuration"
else
  echo "git command not found: unable to generate config/production.yaml.new configuration file based on your existing production.yaml configuration"
fi

echo ""
echo "=========================================================="
echo ""
echo "Please read the IMPORTANT NOTES on $RELEASE_PAGE_URL"
echo ""
echo "Then restart BoomBoom!"
