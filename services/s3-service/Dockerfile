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
# RUN npm install --omit=dev && rm -f .npmrc

# # Copy compiled code
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/config ./config

# # Security: run as non-root user
# USER node

# EXPOSE 3017

# # Healthcheck
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3017/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# CMD ["node", "dist/server.js"]




FROM public.ecr.aws/docker/library/node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3017

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3017/health || exit 1

CMD ["npm", "start"]


