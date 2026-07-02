# Release

## BoomBoom

 * Fix remaining important bugs
 * Ensure French translation is 100% (for the screens in the JoinBoomBoom blog post)
 * Update [/CHANGELOG.md](/CHANGELOG.md)
 * Check migrations:
```
npm run clean:server:test
git checkout master && rm -rf ./node_modules && npm run install-node-dependencies && npm run build:server
NODE_APP_INSTANCE=6 NODE_ENV=test node dist/server --benchmark-startup
git checkout develop && rm -rf ./node_modules && npm run install-node-dependencies && npm run build:server
NODE_APP_INSTANCE=6 NODE_ENV=test node dist/server --benchmark-startup
```
 * Run `rm -rf node_modules && rm -rf client/node_modules && npm run install-node-dependencies && npm run build` to see if all the supported languages compile correctly
 * Update https://boomboom2.cpy.re and check it works correctly
 * Check CI tests are green
 * Run BrowserStack **and** local E2E tests
 * Release: `GITHUB_TOKEN=my_token npm run release -- 1.x.x`
 * Update `openapi.yaml` version
 * Create a dedicated branch: `git checkout -b release/1.x.x && git push origin release/1.x.x`
 * Check the release is okay: https://github.com/Chocobozzz/BoomBoom/releases
 * Update https://boomboom3.cpy.re and check it works correctly
 * Update all other instances and check it works correctly
 * After a couple of days, update https://joinboomboom.org/api/v1/versions.json


## @boomboom/embed-api

At the root of BoomBoom:

```
cd client/src/standalone/embed-player-api
npm version patch
cd ../../../../
npm run release-embed-api
```
