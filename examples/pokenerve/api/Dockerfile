FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY examples/pokenerve/api/package.json ./examples/pokenerve/api/
COPY examples/pokenerve/shared/ ./examples/pokenerve/shared/

RUN corepack enable && pnpm install --frozen-lockfile

COPY examples/pokenerve/api/ ./examples/pokenerve/api/

WORKDIR /app/examples/pokenerve/api
RUN pnpm build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/examples/pokenerve/api/dist ./dist
COPY --from=builder /app/examples/pokenerve/api/package.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/server.js"]
