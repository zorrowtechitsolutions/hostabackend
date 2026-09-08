# FROM public.ecr.aws/docker/library/node:18-slim

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .

# # Compile TypeScript
# RUN npm run build

# EXPOSE 3018

# CMD ["node", "dist/server.js"]




FROM public.ecr.aws/docker/library/node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compile TypeScript
RUN npm run build

EXPOSE 3018

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3018/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]


