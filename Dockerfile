FROM node:22-bookworm-slim AS base
WORKDIR /app

# Install system dependencies & bun
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    python3 \
    make \
    g++ \
    git \
 && curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.4" \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"
ENV NODE_ENV=production
ENV PORT=9000
ENV HOST=0.0.0.0

# Copy workspace manifests
COPY package.json bun.lock turbo.json ./
COPY apps ./apps
COPY packages ./packages

# Install dependencies and build monorepo
RUN bun install --frozen-lockfile
RUN bun run build

EXPOSE 9000

CMD ["sh", "-c", "cd packages/api && bun x medusa db:migrate && bun run start"]
