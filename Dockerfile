# Multi-stage build for production
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma Client (requires DATABASE_URL but doesn't connect)
ARG DATABASE_URL="postgresql://postgres:Swaadly@2025@/swaadly-postgres-db?host=/cloudsql/swaadly-backend:asia-south1:swaadly-postgres-db"
RUN npx prisma generate

# Build application
RUN yarn build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock ./
COPY prisma ./prisma/
ARG DATABASE_URL="postgresql://postgres:Swaadly@2025@/swaadly-postgres-db?host=/cloudsql/swaadly-backend:asia-south1:swaadly-postgres-db"
RUN yarn install --frozen-lockfile --production && \
    npx prisma generate && \
    yarn cache clean

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Cloud Run uses PORT environment variable
ENV PORT=5000

# Run migrations and start
CMD npx prisma migrate deploy && node dist/main