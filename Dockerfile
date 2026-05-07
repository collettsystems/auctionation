FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY workers ./workers

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS api

WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/server.js"]

FROM node:22-alpine AS notifications-worker

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/workers/notifications ./workers/notifications

USER node
CMD ["node", "workers/notifications/dist/workers/notifications/src/index.js"]

FROM nginx:1.27-alpine AS admin
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY infra/nginx/admin.conf /etc/nginx/conf.d/default.conf

FROM nginx:1.27-alpine AS embed
COPY --from=build /app/apps/embed/dist /usr/share/nginx/html

FROM nginx:1.27-alpine AS widget-demo
COPY --from=build /app/apps/widget-demo/dist /usr/share/nginx/html
