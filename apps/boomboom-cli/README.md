# BoomBoom CLI

## Usage

See https://docs.joinboomboom.org/maintain/tools#remote-tools

## Dev

## Install dependencies

```bash
cd boomboom-root
npm run install-node-dependencies
```

## Develop

```bash
cd boomboom-root
npm run dev:boomboom-cli
```

## Build

```bash
cd boomboom-root
npm run build:boomboom-cli
```

## Run

```bash
cd boomboom-root
node apps/boomboom-cli/dist/boomboom.js --help
```

## Publish on NPM

```bash
cd boomboom-root
(cd apps/boomboom-cli && npm version patch) && npm run build:boomboom-cli && (cd apps/boomboom-cli && npm login && npm publish --access=public)
```
