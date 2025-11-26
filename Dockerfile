# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the root package.json and package-lock.json
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React frontend
RUN npm run build

# Move to server directory and install dependencies
WORKDIR /app/server
RUN npm install

# Return to root for final startup command context (optional, but good for clarity)
WORKDIR /app

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Define environment variable for port
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]
