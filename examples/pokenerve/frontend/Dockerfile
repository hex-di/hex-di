FROM node:22-alpine AS builder

WORKDIR /app

# Copy full monorepo for workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY integrations/ ./integrations/
COPY libs/ ./libs/
COPY examples/pokenerve/ ./examples/pokenerve/

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /app/examples/pokenerve/frontend
RUN pnpm build

FROM nginx:alpine

COPY --from=builder /app/examples/pokenerve/frontend/dist /usr/share/nginx/html

# SPA fallback: redirect all routes to index.html
RUN printf 'server {\n  listen 5173;\n  root /usr/share/nginx/html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
