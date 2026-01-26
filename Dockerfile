FROM node:20-alpine

WORKDIR /app

# Copy server dependency definitions
COPY server/package*.json ./server/
# Copy client dependency definitions
COPY client/package*.json ./client/

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install client dependencies
WORKDIR /app/client
RUN npm install

# Copy source code
WORKDIR /app
COPY server ./server
COPY client ./client

# Build client
WORKDIR /app/client
RUN npm run build

# Setup final environment
WORKDIR /app/server
# Serve static files from client build
# (We need to update server/index.js to serve these later, or use a proxy in dev)
# For the purpose of the single container:
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
