# # # # -------- BUILD STAGE --------
# # # FROM public.ecr.aws/docker/library/node:20-alpine AS builder

# # # WORKDIR /app

# # # # Install build dependencies for native modules
# # # RUN apk add --no-cache python3 make g++

# # # COPY package*.json .npmrc* ./

# # # RUN npm install --include=dev --legacy-peer-deps

# # # COPY . .

# # # RUN npm run build

# # # # -------- PRODUCTION STAGE --------
# # # FROM public.ecr.aws/docker/library/node:20-alpine

# # # WORKDIR /app

# # # # Set production environment
# # # ENV NODE_ENV=production

# # # COPY package*.json .npmrc* ./

# # # # Install only production dependencies
# # # RUN npm install --omit=dev && rm -f .npmrc

# # # # Copy compiled code
# # # COPY --from=builder /app/dist ./dist
# # # COPY --from=builder /app/config ./config
# # # COPY --from=builder /app/migrations ./migrations
# # # COPY --from=builder /app/.sequelizerc* ./

# # # # Security: run as non-root user
# # # USER node

# # # EXPOSE 3009

# # # # Healthcheck
# # # HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
# # #   CMD node -e "require('http').get('http://localhost:3009/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# # # CMD ["sh", "-c", "npx sequelize-cli db:migrate && node dist/server.js"]






# # # Base image
# # FROM public.ecr.aws/docker/library/node:20-alpine

# # WORKDIR /app

# # # Copy only package files first (IMPORTANT for caching)
# # COPY package.json package-lock.json ./

# # # Clean install (production-safe)
# # RUN npm install --omit=dev --no-audit --no-fund

# # # Now copy the rest of the code
# # COPY . .

# # # Build step (if using TypeScript / build step)
# # RUN npm run build

# # # Remove dev files (optional cleanup)
# # RUN rm -f .npmrc

# # # Start production server
# # CMD ["npm", "start"]





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
# COPY --from=builder /app/config ./config
# COPY --from=builder /app/migrations ./migrations
# COPY --from=builder /app/.sequelizerc* ./


# # Security: run as non-root user
# USER node

# EXPOSE 3009

# # Healthcheck
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3009/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# CMD ["sh", "-c", "npx sequelize-cli db:migrate && node dist/server.js"]





# -------- BUILD STAGE --------
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install native build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json .npmrc* ./

# Install all dependencies
RUN npm install --include=dev --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# -------- PRODUCTION STAGE --------
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json .npmrc* ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund && rm -f .npmrc

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy config folder if exists
COPY --from=builder /app/config ./config

# Run as non-root user
USER node

# Expose service port
EXPOSE 3009

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
CMD node -e "require('http').get('http://localhost:3009/health',(res)=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Start app
CMD ["node", "dist/server.js"]


