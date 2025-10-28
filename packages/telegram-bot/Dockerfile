FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/telegram-bot/package.json ./packages/telegram-bot/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/packages/telegram-bot/node_modules ./packages/telegram-bot/node_modules
RUN pnpm --filter @ask-starknet/shared build
RUN pnpm --filter telegram-bot build

FROM base AS deploy
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/packages/telegram-bot/node_modules ./packages/telegram-bot/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/telegram-bot/dist ./packages/telegram-bot/dist
COPY --from=build /app/packages/telegram-bot/package.json ./packages/telegram-bot/package.json

CMD ["node", "packages/telegram-bot/dist/index.js"]

