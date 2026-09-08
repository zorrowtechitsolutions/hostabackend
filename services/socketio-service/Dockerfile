FROM public.ecr.aws/docker/library/node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3019

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3019/health || exit 1

CMD ["npm", "start"]


