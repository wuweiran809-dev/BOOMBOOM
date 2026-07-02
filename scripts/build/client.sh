#!/bin/bash

set -eu

defaultLanguage="en-US"

# Supported languages (key:locale pairs) - Bash 3.2 compatible for macOS
languages=(
    en:en-US
    zh-Hans:zh-Hans-CN
)


rm -rf ./client/dist

npm run build:embed

cd client

# Don't build other languages if --light arg is provided
if [ -z ${1+x} ] || ([ "$1" != "--light" ] && [ "$1" != "--analyze-bundle" ]); then
    additionalParams=""
    if [ -z ${1+x} ] || [ "$1" != "--source-map" ]; then
        additionalParams="--source-map=false"
    fi

    NODE_OPTIONS=--max_old_space_size=8192 node_modules/.bin/ng build --configuration production --output-path "dist/build" $additionalParams

    for entry in "${languages[@]}"; do
        key="${entry%%:*}"
        lang="${entry#*:}"

        mv "dist/build/browser/$key" "dist/$lang"

        if [ "$lang" != "en-US" ]; then
            # Do not duplicate assets
            rm -r "./dist/$lang/assets"
        fi
    done

    mv "./dist/$defaultLanguage/assets" "./dist"

    rm -r "dist/build"
else
    additionalParams=""
    if [ ! -z ${1+x} ] && [ "$1" == "--analyze-bundle" ]; then
        additionalParams="--named-chunks=true --output-hashing=none"

        # For Vite
        export ANALYZE_BUNDLE=true
    fi

    NODE_OPTIONS=--max_old_space_size=8192 node_modules/.bin/ng build --localize=false --output-path "dist/$defaultLanguage/" \
                                                              --configuration production --stats-json $additionalParams
fi

# Copy runtime locales
cp -r "./src/locale" "./dist/locale"
