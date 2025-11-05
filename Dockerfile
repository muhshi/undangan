# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# Salin manifest
COPY package.json ./
# Salin lockfile jika ada (tidak error kalau tidak ada)
COPY package-lock.json* ./

# Install deps: ci jika ada lockfile, else install
RUN if [ -f package-lock.json ]; then \
    npm ci; \
    else \
    npm install --no-audit --no-fund; \
    fi

# Salin source dan build
COPY . .
RUN npm run build:public

# --- runtime ---
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY .deploy/nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
