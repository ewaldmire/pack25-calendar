# ---- Frontend build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY src/lib/dens.js ./src/lib/dens.js
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
