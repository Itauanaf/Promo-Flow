FROM node:24.22.0-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/automation/package.json packages/automation/package.json
COPY packages/connectors/package.json packages/connectors/package.json
COPY packages/content/package.json packages/content/package.json
COPY packages/messaging/package.json packages/messaging/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY apps/worker apps/worker
COPY packages/automation packages/automation
COPY packages/connectors packages/connectors
COPY packages/content packages/content
COPY packages/messaging packages/messaging
USER node
CMD ["./apps/worker/node_modules/.bin/tsx","apps/worker/src/index.ts"]
