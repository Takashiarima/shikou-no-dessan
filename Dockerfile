FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY agent ./agent
COPY --from=build /app/dist ./dist
ENV PORT=8080
ENV SERVE_STATIC=1
EXPOSE 8080
CMD ["node", "server/index.mjs"]
