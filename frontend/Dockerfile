FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
COPY lib ./lib
COPY frontend ./frontend
RUN pnpm --filter @workspace/ski-service run build

FROM nginx:alpine
COPY --from=builder /app/frontend/dist/public /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
