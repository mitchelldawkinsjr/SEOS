FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache git github-cli \
  && npm install -g npm@latest

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8787
ENV SEOS_DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "src/server.mjs"]
