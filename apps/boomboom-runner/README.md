# BoomBoom runner

Runner program to execute jobs (transcoding...) of remote BoomBoom instances.

Commands below has to be run at the root of BoomBoom git repository.

## Dev

### Install dependencies

```bash
cd boomboom-root
npm run install-node-dependencies
```

### Develop

```bash
cd boomboom-root
npm run dev:boomboom-runner
```

### Build

```bash
cd boomboom-root
npm run build:boomboom-runner
```

### Run

```bash
cd boomboom-root
node apps/boomboom-runner/dist/boomboom-runner.mjs --help
```

### Publish on NPM

```bash
cd boomboom-root
(cd apps/boomboom-runner && npm version patch) && npm run build:boomboom-runner && (cd apps/boomboom-runner && npm login && npm publish --access=public)
```
