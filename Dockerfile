FROM node:20-bookworm-slim

# ── 1. Install System Dependencies ────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Install Arduino CLI ────────────────────────────────────
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# ── 3. Setup Arduino AVR Core & Official Libraries ────────────
# Install AVR Core (Uno, Nano, Mega 2560, Pro Mini, Leonardo) and Servo
RUN arduino-cli config init && \
    arduino-cli core update-index && \
    arduino-cli lib update-index && \
    arduino-cli core install arduino:avr && \
    arduino-cli lib install Servo

# ── 4. Copy Bundled Custom Libraries ──────────────────────────
# Copy to global Arduino libraries directory
RUN mkdir -p /root/Arduino/libraries
COPY libraries/ /root/Arduino/libraries/

# ── 5. Setup Application Directory & Dependencies ─────────────
WORKDIR /app

# Copy package manifests and install production npm dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy entire application source code (including public, server, libraries)
COPY . .

# Ensure temp and libraries directories exist with proper permissions
RUN mkdir -p temp libraries

# ── 6. Networking, Environment & Healthcheck ──────────────────
# Default port (Railway will override via $PORT at runtime)
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV HOME=/root

# Railway & Docker container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# ── 7. Start ArduiBlok Service ─────────────────────────────────
CMD ["node", "server/app.js"]
