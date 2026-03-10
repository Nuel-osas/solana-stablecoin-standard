FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production

COPY dist/ ./dist/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
