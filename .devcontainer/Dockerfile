# Development Dockerfile
FROM node:24-bookworm

WORKDIR /app
EXPOSE 3030 3031

COPY --chown=node:node package.json yarn.lock ./

USER node
RUN yarn install

CMD ["echo", "Development container started"]