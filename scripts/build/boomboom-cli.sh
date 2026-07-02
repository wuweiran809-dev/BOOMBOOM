#!/bin/bash

set -eu

cd ./apps/boomboom-cli
rm -rf ./dist

../../node_modules/.bin/tsc -b --verbose
rm -rf ./dist
mkdir ./dist

npm run build
