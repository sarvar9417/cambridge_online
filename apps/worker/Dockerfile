# Development image. Sources are bind-mounted by docker-compose, so this layer
# only has to install the workspace and start the dev process.
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /app/apps/worker
CMD ["pnpm", "dev"]
