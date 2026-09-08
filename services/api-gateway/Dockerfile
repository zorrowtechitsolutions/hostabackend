# # # -------- BUILD STAGE --------
# # FROM public.ecr.aws/docker/library/node:20-alpine AS builder

# # WORKDIR /app

# # # Install build dependencies for native modules
# # RUN apk add --no-cache python3 make g++

# # COPY package*.json .npmrc* ./

# # RUN npm install --include=dev --legacy-peer-deps

# # COPY . .

# # RUN npm run build

# # # -------- PRODUCTION STAGE --------
# # FROM public.ecr.aws/docker/library/node:20-alpine

# # WORKDIR /app

# # # Set production environment
# # ENV NODE_ENV=production

# # COPY package*.json .npmrc* ./

# # # Install only production dependencies
# # RUN npm install --omit=dev && rm -f .npmrc

# # # Copy compiled code
# # COPY --from=builder /app/dist ./dist

# # # Security: run as non-root user
# # USER node

# # EXPOSE 3000

# # # Healthcheck
# # HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
# #   CMD node -e "require('http').get('http://localhost:3000/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# # CMD ["node", "dist/server.js"]




# # -------- BUILD STAGE --------
# FROM public.ecr.aws/docker/library/node:20-alpine AS builder

# WORKDIR /app

# # Install build dependencies for native modules
# RUN apk add --no-cache python3 make g++

# COPY package*.json .npmrc* ./

# RUN npm install --include=dev --legacy-peer-deps

# COPY . .

# RUN npm run build

# # -------- PRODUCTION STAGE --------
# FROM public.ecr.aws/docker/library/node:20-alpine

# WORKDIR /app

# # Set production environment
# ENV NODE_ENV=production

# COPY package*.json .npmrc* ./

# # Install only production dependencies
# RUN npm install --omit=dev --legacy-peer-deps && rm -f .npmrc

# # Copy compiled code
# COPY --from=builder /app/dist ./dist

# # Security: run as non-root user
# USER node

# EXPOSE 3000

# # Healthcheck
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# CMD ["node", "dist/server.js"]




# -------- BUILD STAGE --------
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc* ./

RUN npm install --include=dev --legacy-peer-deps

COPY . .

RUN npm run build

# -------- PRODUCTION STAGE --------
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

COPY package*.json .npmrc* ./

# Install only production dependencies
RUN npm install --omit=dev --legacy-peer-deps && rm -f .npmrc

# Copy compiled code
COPY --from=builder /app/dist ./dist

# Security: run as non-root user
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]


