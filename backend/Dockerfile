# Backend Dockerfile (Development)
# @owner ValGSgit
# @issue https://github.com/ValGSgit/AlpacaParty/issues/3

FROM node:24-alpine3.22

RUN apk add --no-cache python3 make g++ dotenv

WORKDIR /app

# Copy scripts and strip Windows CRLF line endings so the shebang works on Linux
COPY --chmod=755 tools/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chmod=755 tools/load-secrets.sh /usr/local/bin/load-secrets.sh
COPY --chmod=755 tools/start-prisma-studio.sh /usr/local/bin/start-prisma-studio.sh
COPY --chmod=755 tools/seed-database.sh /usr/local/bin/seed-database.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  /usr/local/bin/load-secrets.sh \
  /usr/local/bin/start-prisma-studio.sh \
  /usr/local/bin/seed-database.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
