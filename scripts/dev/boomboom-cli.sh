#!/bin/bash

set -eu

rm -rf ./apps/boomboom-cli/dist

cd ./apps/boomboom-cli

../../node_modules/.bin/concurrently -k \
  "../../node_modules/.bin/tsc -w --noEmit" \
  "npm run dev"
