# All-in-one image for cloud deploy: API + seeded Postgres data + built React UI on one port.
FROM node:20-alpine AS fe-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=fe-build /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(/OK/.test(d)&&r.statusCode===200?0:1))}).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/server.js"]