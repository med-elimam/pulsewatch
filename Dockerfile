# Pinned to the exact tested Node version.
FROM node:22.22.3-alpine
WORKDIR /app
COPY package.json ./
COPY *.js ./
COPY tests ./tests
ENV NODE_ENV=production
# DB_PATH must point at a MOUNTED PERSISTENT VOLUME in production (see DEPLOY.md).
ENV DB_PATH=/data/pulsewatch.db
RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
CMD ["node","--no-warnings","server.js"]
