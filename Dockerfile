FROM node:20-bookworm-slim

# Install system utilities needed for downloading tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install official arduino-cli
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# Initialize arduino-cli, install AVR core (Uno, Nano, Mega, Pro Mini, Leonardo) and Servo library
RUN arduino-cli config init && \
    arduino-cli core update-index && \
    arduino-cli core install arduino:avr && \
    arduino-cli lib install Servo

# Set working directory
WORKDIR /app

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Ensure temp directory exists for sketch compilation
RUN mkdir -p temp

# Expose web port
EXPOSE 3000

# Set environment defaults
ENV PORT=3000
ENV NODE_ENV=production

# Start the ArduiBlok web service
CMD ["node", "server/app.js"]
