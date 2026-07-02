FROM node:22-trixie-slim

ARG ALREADY_BUILT=0

# Install dependencies
RUN apt update \
 && apt install -y --no-install-recommends openssl ffmpeg python3 python3-pip ca-certificates gnupg gosu build-essential curl git va-driver-all \
 && gosu nobody true \
 && rm /var/lib/apt/lists/* -fR

RUN npm install -g pnpm

# Node images hardcode the node uid to 1000 so that number is not available.
# The "boomboom" user is created as a system account which selects a UID from
# the range of SYS_UID_MIN to SYS_UID_MAX (-1 to 1000] and consistently
# selects 999 given the current image build steps. The same is true for the
# system group range SYS_GID_MIN and SYS_GID_MAX. It is fine to manually assign
# them an ID outside of that range.
ENV DEFAULT_BOOMBOOM_UID=999
ENV DEFAULT_BOOMBOOM_GID=999

# Add boomboom user
RUN groupadd -r -g ${BOOMBOOM_GID:-${DEFAULT_BOOMBOOM_GID}} boomboom \
    && useradd -r -u ${BOOMBOOM_UID:-${DEFAULT_BOOMBOOM_UID}} -g boomboom -m boomboom

# Install BoomBoom
COPY --chown=boomboom:boomboom . /app
WORKDIR /app

USER boomboom

# Install manually client dependencies to apply our network timeout option
RUN if [ "${ALREADY_BUILT}" = 0 ]; then \
    npm run install-node-dependencies \
    && npm run build; \
  else \
    echo "Do not build application inside Docker because of ALREADY_BUILT build argument"; \
  fi; \
  rm -rf ./node_modules ./client/node_modules ./client/.angular \
  && npm run install-node-dependencies -- --production \
  && pnpm store prune

USER root

RUN mkdir /data /config
RUN chown -R boomboom:boomboom /data /config

ENV NODE_ENV production
ENV NODE_CONFIG_DIR /app/config:/app/support/docker/production/config:/config
ENV BOOMBOOM_LOCAL_CONFIG /config

VOLUME /data
VOLUME /config

COPY ./support/docker/production/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

# Expose API, RTMP and RTMPS ports
EXPOSE 9000 1935 1936

# Run the application
CMD [ "node", "dist/server" ]
