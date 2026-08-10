# syntax=docker/dockerfile:1

FROM node:26-alpine AS build
WORKDIR /app
# node 25+ dropped bundled corepack/yarn. apk it is
RUN apk add --no-cache yarn

# lockfile first, keeps the deps layer cached
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
