# Frontend Dockerfile (Development)
# @owner fankahou, LukasStefanek
# @issue https://github.com/ValGSgit/AlpacaParty/issues/1

FROM node:24-alpine3.22

WORKDIR /app
RUN chown -R node:node /app

EXPOSE 5173

# Copy scripts and strip Windows CRLF line endings so the shebang works on Linux
COPY --chmod=755 tools/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

USER node

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
