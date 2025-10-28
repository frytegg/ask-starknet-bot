FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/discord-bot/package.json ./packages/discord-bot/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/packages/discord-bot/node_modules ./packages/discord-bot/node_modules
RUN pnpm --filter @ask-starknet/shared build
RUN pnpm --filter discord-bot build

FROM base AS deploy
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/packages/discord-bot/node_modules ./packages/discord-bot/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/discord-bot/dist ./packages/discord-bot/dist
COPY --from=build /app/packages/discord-bot/package.json ./packages/discord-bot/package.json

CMD ["node", "packages/discord-bot/dist/index.js"]

