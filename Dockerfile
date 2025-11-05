# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
# Lebih cepat: hanya copy yang dibutuhkan untuk instal deps dulu
COPY package*.json ./
RUN npm ci
# Copy source
COPY . .
# Build artefak deployable ke folder public/
RUN npm run build:public

# --- runtime ---
FROM nginx:alpine
# Hapus default conf dan pakai conf kita
RUN rm -f /etc/nginx/conf.d/default.conf
COPY .deploy/nginx.conf /etc/nginx/conf.d/site.conf
# Salin public/ hasil build ke root html
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
