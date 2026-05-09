# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools needed by native addons (sharp, etc.)
RUN apk add --no-cache python3 make g++

# Copy dependency manifests first (maximises Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the production bundle
COPY . .

# Accept the backend URL at build-time so Vite can inline it
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


# ── Stage 2: Serve ────────────────────────────────────────────────────
FROM nginx:alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
