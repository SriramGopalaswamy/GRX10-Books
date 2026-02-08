# ============================================
# Stage 1: Build (has build tools, discarded after)
# ============================================
FROM node:22-alpine AS builder

# Install build tools needed for native modules (bcrypt, sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Frontend: install deps and build
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend/src ./src
# COPY frontend/public ./public
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/index.html ./
RUN npm run build

# Backend: install deps (native modules compile here with build tools)
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# ============================================
# Stage 2: Production runtime (clean, no build tools)
# ============================================
FROM node:22-alpine

# sqlite3 native module may dynamically link to libsqlite3.so from the
# builder stage (where sqlite-libs was present as a python3 dependency).
# We must provide it here at runtime or the module will crash on load.
RUN apk add --no-cache sqlite-libs

WORKDIR /app

# Copy only what the server needs from the builder
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend ./backend

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

WORKDIR /app/backend
CMD ["node", "src/server.js"]
