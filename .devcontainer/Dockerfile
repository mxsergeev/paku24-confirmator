# Development Dockerfile
FROM node:16.20.2-bookworm-slim
RUN apt-get update && apt-get install -y git
WORKDIR /app
EXPOSE 3000 3001
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
CMD [ "echo", "Development container started" ]