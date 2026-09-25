FROM node:22-bookworm

# Herramientas básicas + chromium para testing e2e (patrón invessoft)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libgbm1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# pnpm vía corepack (versión fija, igual que la que genera el lockfile en el repo)
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Wrapper de chromium sin sandbox (para docker rootless devcontainers)
RUN mkdir -p /home/node/.local/bin \
    && printf '#!/bin/bash\n/usr/bin/chromium --no-sandbox --disable-setuid-sandbox "$@"\n' > /home/node/.local/bin/chromium-no-sandbox \
    && chmod +x /home/node/.local/bin/chromium-no-sandbox \
    && chown -R node:node /home/node/.local

# Workspace
WORKDIR /workspace
RUN chown -R node:node /workspace

USER node