# # -------- BUILD STAGE --------
# FROM public.ecr.aws/docker/library/node:20 AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # -------- PRODUCTION STAGE --------
# FROM public.ecr.aws/docker/library/node:20-slim
# WORKDIR /app
# COPY package*.json ./
# RUN npm install --omit=dev
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/config ./config
# COPY --from=builder /app/migrations ./migrations
# COPY --from=builder /app/.sequelizerc ./.sequelizerc

# # SECURITY: run as non-root user
# USER node

# EXPOSE 3013

# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD node -e 'require("http").get("http://localhost:3013/health", (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))'

# CMD ["sh", "-c", "npx sequelize-cli db:migrate && node dist/server.js"]







# -------- BUILD STAGE --------
FROM public.ecr.aws/docker/library/node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# -------- PRODUCTION STAGE --------
FROM public.ecr.aws/docker/library/node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.sequelizerc ./.sequelizerc

# SECURITY: run as non-root user
USER node

EXPOSE 3013

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e 'require("http").get("http://localhost:3013/health", (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))'

CMD ["sh", "-c", "npx sequelize-cli db:migrate && node dist/server.js"]


