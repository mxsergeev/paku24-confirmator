# Development Dockerfile
FROM node:24-bookworm
WORKDIR /app
EXPOSE 3030 3031
RUN chown -R node:node /app
USER node
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
CMD [ "echo", "Development container started" ]