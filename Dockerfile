FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile
RUN npx prisma generate

COPY . .
RUN yarn build

EXPOSE 8080

ENV PORT=8080 \
    NODE_ENV=production

CMD ["node", "dist/main"]
