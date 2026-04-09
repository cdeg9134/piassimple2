FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
COPY lib ./lib
COPY backend ./backend
RUN pnpm --filter @workspace/api-server run build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
RUN pnpm install --prod 2>/dev/null || pnpm install
COPY --from=builder /app/backend/dist ./backend/dist
COPY lib ./lib
CMD ["node", "--enable-source-maps", "./backend/dist/index.mjs"]
