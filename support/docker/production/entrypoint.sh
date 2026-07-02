#!/bin/sh
set -e


find /config ! -user boomboom -exec chown boomboom:boomboom {} \; || true

# first arg is `-f` or `--some-option`
# or first arg is `something.conf`
if [ "${1#-}" != "$1" ] || [ "${1%.conf}" != "$1" ]; then
    set -- node "$@"
fi

# allow the container to be started with `--user`
if [ "$1" = 'node' -a "$(id -u)" = '0' ]; then
    find /data ! -user boomboom -exec  chown boomboom:boomboom {} \;
    exec gosu boomboom "$0" "$@"
fi

exec "$@"
