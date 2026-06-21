FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=https://claude-api-wrapper-production.up.railway.app

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["sh", "-c", "npm start"]
