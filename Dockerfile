# ========== 阶段1：构建前端 ==========
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /web
COPY web/package*.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ========== 阶段2：运行后端（托管前端产物，单端口） ==========
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server/ ./
COPY --from=frontend-build /web/dist ./public
RUN mkdir -p ./data
ENV PORT=8668
ENV JWT_SECRET=suisoji-secret-key-2026
EXPOSE 8668
CMD ["node", "app.js"]
