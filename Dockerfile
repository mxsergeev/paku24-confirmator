# Production Dockerfile 
FROM node:16.20.2-bookworm-slim AS base
WORKDIR /app
EXPOSE 3030
COPY package.json yarn.lock ./
RUN yarn install --production
COPY src ./src
COPY public ./public
COPY .env .eslintrc.json .eslintignore .prettierrc .prettierrc ./ 
RUN yarn build:ui
COPY . .
CMD [ "yarn", "start" ]