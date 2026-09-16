# tippecanoe reproducible build — version PINNED.
# Chosen because no native Windows toolchain is available (ADR-003).
#
# Build:
#   docker build -t mjt-tippecanoe:2.79.0 -f pipeline/docker/tippecanoe.Dockerfile pipeline/docker
# Run:
#   docker run --rm -v "${PWD}:/data" mjt-tippecanoe:2.79.0 tippecanoe --version
#
# Pinned versions (do not bump without updating the manifest + preflight expectation):
#   TIPPECANOE_VERSION = 2.79.0
#   base image         = debian:bookworm-slim (pinned by tag; record digest at first build)

FROM debian:bookworm-slim

ARG TIPPECANOE_VERSION=2.79.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      build-essential \
      libsqlite3-dev \
      zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/felt/tippecanoe/archive/refs/tags/${TIPPECANOE_VERSION}.tar.gz" \
      -o /tmp/tippecanoe.tar.gz \
    && mkdir -p /src \
    && tar -xzf /tmp/tippecanoe.tar.gz -C /src --strip-components=1 \
    && make -C /src -j"$(nproc)" \
    && make -C /src install \
    && rm -rf /src /tmp/tippecanoe.tar.gz

# Fail the build if the pinned version is not present.
RUN tippecanoe --version

WORKDIR /data
ENTRYPOINT ["tippecanoe"]
