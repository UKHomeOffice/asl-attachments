# syntax=docker/dockerfile:1.2

FROM quay.io/ukhomeofficedigital/asl-base:v16

RUN apk upgrade --no-cache

USER 999

COPY .npmrc /app/.npmrc
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN --mount=type=secret,id=token,uid=999 \
    --mount=type=secret,id=username,uid=999 \
    NPM_AUTH_USERNAME=`cat /run/secrets/username` \
    NPM_AUTH_TOKEN=`cat /run/secrets/token` \
    npm ci --production --no-optional

COPY . /app

RUN rm /app/.npmrc

CMD node index.js
