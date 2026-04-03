FROM postgres:17-alpine3.22

RUN apk add --no-cache musl-locales musl-locales-lang

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Optional: Add any custom configuration or scripts
# Files in this folder are executed on startup
# COPY init.sql /docker-entrypoint-initdb.d/

# You can also install extra tools if needed
# RUN apk add --no-cache postgis
