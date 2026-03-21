# SpitRoyale — Alpaca Spit Royale WebSocket game server
# Builds the Vite frontend and serves it alongside the Node.js WS server.

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Vite frontend (output → dist/)
RUN npm run build

EXPOSE 3001

CMD ["node", "server/index.js"]
