# Development Dockerfile
FROM node:24-bookworm

WORKDIR /app
EXPOSE 3030 3031

COPY --chown=node:node package.json yarn.lock ./

RUN mkdir -p /app/node_modules && chown node:node /app/node_modules

USER node
RUN yarn install

CMD ["echo", "Development container started"]
