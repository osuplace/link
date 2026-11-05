# syntax=docker/dockerfile:1

# ── 1. The Auth.js fork ──────────────────────────────────────────────────────
# auth.js/ is a git submodule (clone with --recurse-submodules). It has to be
# built before link can install it: these are README steps 1.1–1.4, minus the
# rest of the monorepo.
FROM node:22-bookworm-slim AS authjs
RUN corepack enable
WORKDIR /build/auth.js
COPY auth.js/ ./
# --ignore-scripts: the monorepo root pulls in native modules (better-sqlite3)
# that none of these three packages use, and that won't compile without Python.
RUN pnpm install --frozen-lockfile --ignore-scripts \
		--filter root --filter utils \
		--filter @auth/core --filter @auth/express --filter @auth/prisma-adapter
RUN pnpm --filter @auth/core build \
	&& pnpm --filter @auth/express build \
	&& pnpm --filter @auth/prisma-adapter build
# README step 1.4: workspace: only means something inside the pnpm workspace.
# Then drop pnpm's node_modules so yarn copies just the built packages.
RUN sed -i -E 's#"@auth/core": "workspace:[^"]*"#"@auth/core": "file:../core"#' \
		packages/frameworks-express/package.json packages/adapter-prisma/package.json \
	&& rm -rf packages/core/node_modules packages/frameworks-express/node_modules packages/adapter-prisma/node_modules

# ── 2. link ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
# OpenSSL here too, not just at runtime: Prisma picks which engine binaries to
# fetch by the OpenSSL it finds, and without one it fetches the 1.1 builds, which
# the runtime image (OpenSSL 3) can't use and tries to re-download on boot.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/patches ./.yarn/patches
COPY --from=authjs /build/auth.js/packages/core ./auth.js/packages/core
COPY --from=authjs /build/auth.js/packages/frameworks-express ./auth.js/packages/frameworks-express
COPY --from=authjs /build/auth.js/packages/adapter-prisma ./auth.js/packages/adapter-prisma
RUN yarn install
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# Client first: src imports its types (Account etc.).
RUN yarn prisma generate && yarn build
# Drop typescript and @types, then generate the Prisma client again: the prune
# reinstalls node_modules and can take it with it.
RUN yarn workspaces focus --production && yarn prisma generate

# ── 3. Runtime ───────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim
# Prisma's engines need OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
# With NODE_ENV=production, Auth.js refuses every request (UntrustedHost) unless
# told to trust the Host header, which it builds its own URLs (the OAuth
# redirect_uri) from. Fine behind the tunnel: Cloudflare only routes the
# hostname you configured, so Host is always the real one.
ENV AUTH_TRUST_HOST=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# package.json is load-bearing: "type": "module" and the #link/* import map
COPY package.json ./
COPY prisma ./prisma
COPY views ./views
COPY public ./public

# The SQLite database lives in /app/data (prisma/schema.prisma: file:../data/database.db).
# Mount a volume there or every redeploy starts from an empty database.
RUN mkdir -p data && chown node:node data
VOLUME /app/data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
	CMD node -e "fetch('http://localhost:'+(process.env.LINK_PORT||3000)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# Migrations on boot. SQLite and one container, so there's nothing for two
# instances to race over; against the existing database it's a no-op.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node ."]
