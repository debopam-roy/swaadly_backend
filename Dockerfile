FROM node:24-alpine

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

CMD ["node", "dist/src/main"]
