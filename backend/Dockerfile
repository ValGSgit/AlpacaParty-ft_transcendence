# Backend Dockerfile (Development)
# @owner ValGSgit
# @issue https://github.com/ValGSgit/Cleanscendence/issues/3

FROM node:20-alpine

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 3000

# Run with --watch for development hot-reload
CMD ["npm", "run", "dev"]
