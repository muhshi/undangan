# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build:public
# jaga-jaga kalau file ini di-refer tapi tidak ada
RUN mkdir -p public/js && [ -f public/js/guest-local.js ] || printf '/* noop */\n' > public/js/guest-local.js

# --- runtime ---
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY .deploy/nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
