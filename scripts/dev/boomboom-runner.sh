#!/bin/bash

set -eu

rm -rf ./apps/boomboom-runner/dist

cd ./apps/boomboom-runner

../../node_modules/.bin/tsc -b --verbose

../../node_modules/.bin/concurrently -k \
  "../../node_modules/.bin/tsc -w --noEmit" \
  "npm run dev"
