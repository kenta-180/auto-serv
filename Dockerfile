# Stage 1: Build Client Web App
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server Engine
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server/src/server.js"]
