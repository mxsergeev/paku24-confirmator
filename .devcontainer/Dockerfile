# Development Dockerfile
FROM node:24-bookworm
WORKDIR /app
EXPOSE 3030 3031
COPY package.json yarn.lock ./
RUN chown -R node:node /app
USER node
RUN yarn install
COPY --chown=node:node . .
CMD [ "echo", "Development container started" ]