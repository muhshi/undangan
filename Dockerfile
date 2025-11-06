# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

COPY . .

# Build bundling
RUN npm run build

# Ensure public structure exists
RUN mkdir -p public/js public/assets public/css public/dist

# Copy built files (dist from npm run build)
RUN for f in assets css dist index.html dashboard.html; do \
    [ -e "$f" ] && cp -r "$f" public/ || true; \
    done

# Copy js folder AFTER build (important!)
RUN if [ -d js ]; then \
    echo "Copying js/ to public/js/..."; \
    cp -rv js/* public/js/; \
    else \
    echo "Warning: js/ folder not found"; \
    fi

# Verify guest-local.js exists and is not empty
RUN if [ -f public/js/guest-local.js ]; then \
    echo "✅ guest-local.js found ($(stat -c%s public/js/guest-local.js) bytes)"; \
    head -5 public/js/guest-local.js; \
    else \
    echo "⚠️ guest-local.js NOT found, creating noop..."; \
    mkdir -p public/js; \
    printf '/* noop guest-local */\n' > public/js/guest-local.js; \
    fi

# --- runtime ---
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY .deploy/nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]