# Build stage: versioned MF artifacts (set MFE_ASSET_BASE to the URL you will serve this image at)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG MFE_ASSET_BASE
ENV MFE_ASSET_BASE=${MFE_ASSET_BASE}
RUN test -n "$MFE_ASSET_BASE" || (echo "DOCKER BUILD: pass --build-arg MFE_ASSET_BASE=https://your-host" && exit 1)
RUN node tools/build-versioned-deploy.mjs

# Serve dist/deploy as https://<host>/<mfe>/<version>/...
FROM nginx:alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/deploy/ /usr/share/nginx/html/
