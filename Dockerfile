# Use an official Node.js runtime as a parent image
FROM node:22-alpine

# Set the working directory to /app
WORKDIR /app

# Copy frontend package files and install dependencies
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy frontend source and build
COPY frontend/src ./src
# COPY frontend/public ./public
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/index.html ./
RUN npm run build

# Move to backend and install dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Return to root
# WORKDIR /app

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Define environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["node", "src/server.js"]
