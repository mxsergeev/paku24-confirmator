FROM node:16.20.2-bookworm-slim AS base
WORKDIR /app
EXPOSE 3000 3001
COPY package.json yarn.lock ./
RUN apt-get update
RUN apt-get install -y git
RUN yarn install
COPY . .

FROM base AS dev
CMD [ "echo", "Development container started" ]

FROM base AS prod
CMD [ "yarn", "start" ]