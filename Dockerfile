# El Laboratorio — imagen de producción
FROM node:24-alpine

WORKDIR /app

# sin dependencias: solo el código
COPY server ./server
COPY public ./public
COPY package.json ./package.json

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
# la base vive aquí: montar un volumen persistente en /data
ENV DATA_DIR=/data

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.js"]
