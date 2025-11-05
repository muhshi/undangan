# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

COPY . .
# build bundling
RUN npm run build \
    && mkdir -p public \
    && for f in assets css dist index.html dashboard.html; do \
    [ -e "$f" ] && cp -r "$f" public/ || true; \
    done \
    && [ -d js ] && mkdir -p public/js && cp -r js/* public/js/ || true

# --- runtime ---
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY .deploy/nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
