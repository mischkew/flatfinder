FROM node:lts-alpine3.13
ENV NODE_ENV=production

WORKDIR /app
COPY ["./package.json", "./yarn.lock", "./"]
RUN yarn install --no-progress

COPY ["./src", "./config.*.js", "./"]
RUN mkdir /data \  
    && echo -e '#! /bin/sh\nnode /app/index.js' >"/etc/periodic/15min/start" \
    && chmod +x "/etc/periodic/15min/start"

ENV CONFIG_PATH=/app/config.prod.js
CMD "/etc/periodic/15min/start" && crond -f -d 6
