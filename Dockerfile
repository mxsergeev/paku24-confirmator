# Production Dockerfile 
FROM node:16.20.2-bookworm-slim AS base
WORKDIR /app
EXPOSE 3030
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .
RUN yarn build:ui
CMD [ "yarn", "start" ]