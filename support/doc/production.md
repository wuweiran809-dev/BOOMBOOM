# Production guide

  * [Installation](#installation)
  * [Upgrade](#upgrade)

## Installation

Please don't install BoomBoom for production on a device behind a low bandwidth connection (example: your ADSL link).
If you want information about the appropriate hardware to run BoomBoom, please see the [FAQ](https://joinboomboom.org/en_US/faq#should-i-have-a-big-server-to-run-boomboom).

### :hammer: Dependencies

Follow the steps of the [dependencies guide](/support/doc/dependencies.md).

### :construction_worker: BoomBoom user

Create a `boomboom` user with `/var/www/boomboom` home:

::: code-group

```bash [GNU/Linux]
sudo useradd -m -d /var/www/boomboom -s /usr/sbin/nologin boomboom
```

```bash [FreeBSD]
sudo pw useradd -n boomboom -d /var/www/boomboom -s /usr/sbin/nologin -m
```

:::

Ensure the boomboom root directory is traversable by nginx:

```bash
sudo chmod 755 /var/www/boomboom
```

### :card_file_box: Database

Create the production database and a boomboom user inside PostgreSQL:

```bash
cd /var/www/boomboom
sudo -u postgres createuser -P boomboom
```

Here you should enter a password for PostgreSQL `boomboom` user, that should be copied in `production.yaml` file.
Don't just hit enter else it will be empty.

```bash
sudo -u postgres createdb -O boomboom -E UTF8 -T template0 boomboom_prod
```

Then enable extensions BoomBoom needs:

```bash
sudo -u postgres psql -c "CREATE EXTENSION pg_trgm;" boomboom_prod
sudo -u postgres psql -c "CREATE EXTENSION unaccent;" boomboom_prod
```

### :page_facing_up: Prepare BoomBoom directory

Fetch the latest tagged version of Boomboom:

```bash
VERSION=$(curl -s https://api.github.com/repos/chocobozzz/boomboom/releases/latest | grep tag_name | cut -d '"' -f 4) && echo "Latest Boomboom version is $VERSION"
```


Open the boomboom directory, create a few required directories:

```bash
cd /var/www/boomboom
sudo -u boomboom mkdir config storage versions
sudo -u boomboom chmod 750 config/
```


Download the latest version of the Boomboom client, unzip it and remove the zip:

```bash
cd /var/www/boomboom/versions
# Releases are also available on https://builds.joinboomboom.org/release
sudo -u boomboom wget -q "https://github.com/Chocobozzz/BoomBoom/releases/download/${VERSION}/boomboom-${VERSION}.zip"
sudo -u boomboom unzip -q boomboom-${VERSION}.zip && sudo -u boomboom rm boomboom-${VERSION}.zip
```


Install Boomboom:

::: code-group

```bash [GNU/Linux]
cd /var/www/boomboom
sudo -u boomboom ln -s versions/boomboom-${VERSION} ./boomboom-latest
cd ./boomboom-latest && sudo -H -u boomboom npm run install-node-dependencies -- --production
```

```bash [FreeBSD]
cd /var/www/boomboom
sudo -u boomboom ln -s versions/boomboom-${VERSION} ./boomboom-latest
cd ./boomboom-latest && sudo -H -u boomboom npm run install-node-dependencies -- --production
sudo -u boomboom pnpm add --workspace-root --no-lockfile --prod node-addon-api node-gyp
sudo -u boomboom SHARP_FORCE_GLOBAL_LIBVIPS=1 npm explore sharp -- npm run build
```

:::

### :wrench: BoomBoom configuration

Copy the default configuration file that contains the default configuration provided by BoomBoom.
You **must not** update this file.

```bash
cd /var/www/boomboom
sudo -u boomboom cp boomboom-latest/config/default.yaml config/default.yaml
```

Now copy the production example configuration:

```bash
cd /var/www/boomboom
sudo -u boomboom cp boomboom-latest/config/production.yaml.example config/production.yaml
```

Then edit the `config/production.yaml` file according to your webserver and database configuration. In particular:
 * `webserver`: Reverse proxy public information
 * `secrets`: Secret strings you must generate manually (BoomBoom version >= 5.0)
 * `database`: PostgreSQL settings
 * `redis`: Redis settings
 * `smtp`: If you want to use emails
 * `admin.email`: To correctly fill `root` user email

Keys defined in `config/production.yaml` will override keys defined in `config/default.yaml`.

**BoomBoom does not support webserver host change**. Even though [BoomBoom CLI can help you to switch hostname](https://docs.joinboomboom.org/maintain/tools#update-host-js) there's no official support for that since it is a risky operation that might result in unforeseen errors.

### :truck: Webserver

We only provide official configuration files for Nginx.

Copy the nginx configuration template:

```bash
sudo cp /var/www/boomboom/boomboom-latest/support/nginx/boomboom /etc/nginx/sites-available/boomboom
```

Set the domain for the webserver configuration file by replacing `[boomboom-domain]` with the domain for the boomboom server:

```bash
sudo sed -i 's/${WEBSERVER_HOST}/[boomboom-domain]/g' /etc/nginx/sites-available/boomboom
sudo sed -i 's/${BOOMBOOM_HOST}/127.0.0.1:9000/g' /etc/nginx/sites-available/boomboom
```

Then modify the webserver configuration file. Please pay attention to:
 * the `alias`, `root` and `rewrite` directives paths, the paths must correspond to your BoomBoom filesystem location
 * the `proxy_limit_rate` and `limit_rate` directives if you plan to stream high bitrate videos (like 4K at 60FPS)

```bash
sudo vim /etc/nginx/sites-available/boomboom
```

Activate the configuration file:

```bash
sudo ln -s /etc/nginx/sites-available/boomboom /etc/nginx/sites-enabled/boomboom
```

To generate the certificate for your domain as required to make https work you can use [Let's Encrypt](https://letsencrypt.org/):

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone --post-hook "systemctl restart nginx"
sudo systemctl restart nginx
```

Certbot should have installed a cron to automatically renew your certificate.
Since our nginx template supports webroot renewal, we suggest you to update the renewal config file to use the `webroot` authenticator:

```bash
# Replace authenticator = standalone by authenticator = webroot
# Add webroot_path = /var/www/certbot
sudo vim /etc/letsencrypt/renewal/your-domain.com.conf
```

If you plan to have many concurrent viewers on your BoomBoom instance, consider increasing `worker_connections` value: https://nginx.org/en/docs/ngx_core_module.html#worker_connections.

<details>
<summary><strong>If using FreeBSD</strong></summary>

On FreeBSD you can use [Dehydrated](https://dehydrated.io/) `security/dehydrated` for [Let's Encrypt](https://letsencrypt.org/)

```bash
sudo pkg install dehydrated
```
</details>

### :alembic: Linux TCP/IP Tuning

```bash
sudo cp /var/www/boomboom/boomboom-latest/support/sysctl.d/30-boomboom-tcp.conf /etc/sysctl.d/
sudo sysctl -p /etc/sysctl.d/30-boomboom-tcp.conf
```

Your distro may enable this by default, but at least Debian 9 does not, and the default FIFO
scheduler is quite prone to "Buffer Bloat" and extreme latency when dealing with slower client
links as we often encounter in a video server.

### :bricks: systemd

If your OS uses systemd, copy the configuration template:

```bash
sudo cp /var/www/boomboom/boomboom-latest/support/systemd/boomboom.service /etc/systemd/system/
```

Check the service file (BoomBoom paths and security directives):

```bash
sudo vim /etc/systemd/system/boomboom.service
```


Tell systemd to reload its config:

```bash
sudo systemctl daemon-reload
```

If you want to start BoomBoom on boot:

```bash
sudo systemctl enable boomboom
```

Run:

```bash
sudo systemctl start boomboom
sudo journalctl -feu boomboom
```

<details>
<summary><strong>If using FreeBSD</strong></summary>

On FreeBSD, copy the startup script and update rc.conf:

```bash
sudo install -m 0555 /var/www/boomboom/boomboom-latest/support/freebsd/boomboom /usr/local/etc/rc.d/
sudo sysrc boomboom_enable="YES"
```

Run:

```bash
sudo service boomboom start
```
</details>

<details>
<summary><strong>If using OpenRC</strong></summary>

If your OS uses OpenRC, copy the service script:

```bash
sudo cp /var/www/boomboom/boomboom-latest/support/init.d/boomboom /etc/init.d/
sudo cp /var/www/boomboom/boomboom-latest/support/conf.d/boomboom /etc/conf.d/
```

If you want to start BoomBoom on boot:

```bash
sudo rc-update add boomboom default
```

Run and print last logs:

```bash
sudo /etc/init.d/boomboom start
tail -f /var/log/boomboom/boomboom.log
```
</details>

### :technologist: Administrator

The administrator username is `root` and the password is automatically generated. It can be found in BoomBoom
logs (path defined in `production.yaml`). You can also set another password with:

```bash
cd /var/www/boomboom/boomboom-latest && sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run reset-password -- -u root
```

Alternatively you can set the environment variable `PT_INITIAL_ROOT_PASSWORD`,
to your own administrator password, although it must be 6 characters or more.

### :tada: What now?

Now your instance is up you can:

 * Add your instance to the public BoomBoom instances index if you want to: https://instances.joinboomboom.org/
 * Check [available CLI tools](/support/doc/tools.md)

## Upgrade

### BoomBoom instance

**Check the changelog (in particular the *IMPORTANT NOTES* section):** https://github.com/Chocobozzz/BoomBoom/blob/develop/CHANGELOG.md

Run the upgrade script (the password it asks is BoomBoom's database user password):

::: code-group

```bash [GNU/Linux]
cd /var/www/boomboom/boomboom-latest/scripts && sudo -H -u boomboom ./upgrade.sh
```

```bash [FreeBSD]
cd /var/www/boomboom/boomboom-latest/scripts && sudo -H -u boomboom ./upgrade.sh
sudo -u boomboom pnpm add --workspace-root --no-lockfile --prod node-addon-api node-gyp
sudo -u boomboom SHARP_FORCE_GLOBAL_LIBVIPS=1 npm explore sharp -- npm run build
```

:::

If you have `git` installed on your system, the upgrade will create a `production.yaml.new` file with differences marked as merge conflicts.
Review this file and replace your existing `production.yaml` with it before restarting.

```bash
# Make sure you first updated your configuration per the note above
sudo systemctl restart boomboom # Or use your OS command to restart BoomBoom if you don't use systemd
```

You may want to run `sudo -u boomboom pnpm store prune` after several upgrades to free up disk space.

<details>
<summary><strong>Prefer manual upgrade?</strong></summary>

Make a SQL backup

```bash
SQL_BACKUP_PATH="backup/sql-boomboom_prod-$(date -Im).bak" && \
    cd /var/www/boomboom && sudo -u boomboom mkdir -p backup && \
    sudo -u postgres pg_dump -F c boomboom_prod | sudo -u boomboom tee "$SQL_BACKUP_PATH" >/dev/null
```

Fetch the latest tagged version of Boomboom:

```bash
VERSION=$(curl -s https://api.github.com/repos/chocobozzz/boomboom/releases/latest | grep tag_name | cut -d '"' -f 4) && echo "Latest Boomboom version is $VERSION"
```

Download the new version and unzip it:

```bash
cd /var/www/boomboom/versions && \
    sudo -u boomboom wget -q "https://github.com/Chocobozzz/BoomBoom/releases/download/${VERSION}/boomboom-${VERSION}.zip" && \
    sudo -u boomboom unzip -o boomboom-${VERSION}.zip && \
    sudo -u boomboom rm boomboom-${VERSION}.zip
```

Install node dependencies:

```bash
cd /var/www/boomboom/versions/boomboom-${VERSION} && \
    sudo -H -u boomboom npm run install-node-dependencies -- --production
```

Copy new configuration defaults values and update your configuration file:

```bash
sudo -u boomboom cp /var/www/boomboom/versions/boomboom-${VERSION}/config/default.yaml /var/www/boomboom/config/default.yaml
diff -u /var/www/boomboom/versions/boomboom-${VERSION}/config/production.yaml.example /var/www/boomboom/config/production.yaml
```

Change the link to point to the latest version:

```bash
cd /var/www/boomboom && \
    sudo unlink ./boomboom-latest && \
    sudo -u boomboom ln -s versions/boomboom-${VERSION} ./boomboom-latest
```
</details>

### Update BoomBoom configuration

If your system has `git` installed, the auto upgrade script should have created a `config/production.yaml.new` file that merges your current configuration file with the new configuration keys introduced by the new BoomBoom version.

Review the file, check and fix any potential conflicts:

```bash
cd /var/www/boomboom && sudo -u boomboom diff config/production.yaml config/production.yaml.new
```

Then replace your current configuration file by the new one:

```bash
cd /var/www/boomboom && sudo -u boomboom cp config/production.yaml.new config/production.yaml
```

### Update nginx configuration

Check changes in nginx configuration:

```bash
cd /var/www/boomboom/versions
diff -u "$(ls -t | head -2 | tail -1)/support/nginx/boomboom" "$(ls -t | head -1)/support/nginx/boomboom"
```

### Update systemd service

Check changes in systemd configuration:

```bash
cd /var/www/boomboom/versions
diff -u "$(ls -t | head -2 | tail -1)/support/systemd/boomboom.service" "$(ls -t | head -1)/support/systemd/boomboom.service"
```

<details>
<summary><strong>If using OpenRC</strong></summary>

```bash
cd /var/www/boomboom/versions
diff -u "$(ls -t | head -2 | tail -1)/support/init.d/boomboom" "$(ls -t | head -1)/support/init.d/boomboom"
diff -u "$(ls -t | head -2 | tail -1)/support/conf.d/boomboom" "$(ls -t | head -1)/support/conf.d/boomboom"
```
</details>

### Restart BoomBoom

If you changed your nginx configuration:

```bash
sudo systemctl reload nginx
```

If you changed your systemd configuration:

```bash
sudo systemctl daemon-reload
```

Restart BoomBoom and check the logs:

```bash
sudo systemctl restart boomboom && sudo journalctl -fu boomboom
```

### Things went wrong?

Change `boomboom-latest` destination to the previous version and restore your SQL backup:

```bash
OLD_VERSION="v0.42.42" && SQL_BACKUP_PATH="backup/sql-boomboom_prod-20180119-1018.bak" && \
  cd /var/www/boomboom && sudo -u boomboom unlink ./boomboom-latest && \
  sudo -u boomboom ln -s "versions/boomboom-$OLD_VERSION" boomboom-latest && \
  sudo -u postgres pg_restore -c -C -d boomboom_prod "$SQL_BACKUP_PATH" && \
  sudo systemctl restart boomboom
```
