FROM node:24-alpine
WORKDIR /Bellpocket/app
COPY api/package*.json ./
RUN npm install --omit=dev
COPY api/ ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]