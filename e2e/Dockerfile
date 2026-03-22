FROM node:20-alpine

# Playwright system dependencies (chromium only for Alpine)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Playwright to use the system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Playwright browsers that aren't skipped (none in this case; we use system chromium)
# RUN npx playwright install --with-deps chromium

COPY . .

# The default command runs the tests
CMD ["npx", "playwright", "test", "--project=chromium"]
