#!/bin/sh
set -e

# Process the nginx template
SOURCE_FILE="/etc/nginx/conf.d/boomboom.template"
TARGET_FILE="/etc/nginx/conf.d/default.conf"
export WEBSERVER_HOST="$BOOMBOOM_WEBSERVER_HOSTNAME"
export BOOMBOOM_HOST="boomboom:9000"

envsubst '${WEBSERVER_HOST} ${BOOMBOOM_HOST}' < $SOURCE_FILE > $TARGET_FILE
