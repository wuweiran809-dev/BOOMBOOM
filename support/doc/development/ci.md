# Continuous integration

BoomBoom uses Github Actions as a CI platform.
CI tasks are described in `.github/workflows`.

## benchmark.yml

*Scheduled*

Run various benchmarks (build, API etc) and upload results on https://builds.joinboomboom.org/boomboom-stats/ to be publicly consumed.

## codeql.yml

*Scheduled, on push on develop and on pull request*

Run CodeQL task to throw code security issues in Github. https://lgtm.com/projects/g/Chocobozzz/BoomBoom can also be used.

## docker.yml

*Scheduled and on push on master*

Build `chocobozzz/boomboom-webserver:latest`, `chocobozzz/boomboom:production-...`, `chocobozzz/boomboom:v-...` (only latest BoomBoom tag) and `chocobozzz/boomboom:develop-...` Docker images. Scheduled to automatically upgrade image software (Debian security issues etc).

## nightly.yml

*Scheduled*

Build BoomBoom nightly build (`develop` branch) and upload the release on https://builds.joinboomboom.org/nightly.

## stats.yml

*On push on develop*

Create various BoomBoom stats (line of codes, build size, lighthouse report) and upload results on https://builds.joinboomboom.org/boomboom-stats/ to be publicly consumed.

## test.yml

*Scheduled, on push and pull request*

Run BoomBoom lint and tests.
