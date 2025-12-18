FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile --production=false
RUN npx prisma generate

# Build the application
COPY . .
RUN yarn build

# Clean dev dependencies to reduce image size
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

EXPOSE 8080

ENV PORT=8080 \
    NODE_ENV=production

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main"]
