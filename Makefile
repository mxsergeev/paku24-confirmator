COMPOSE_DEV = -f .devcontainer/docker-compose.yaml -f .devcontainer/docker-compose.dev.yaml

.PHONY: dev build-ui test stop clean prod

dev:
	docker compose $(COMPOSE_DEV) up app

build-ui:
	docker compose $(COMPOSE_DEV) run --rm app yarn build:ui --mode production

test:
	docker compose -f .devcontainer/docker-compose.yaml -f .devcontainer/docker-compose.test.yaml \
	  -p confirmator-test \
	  up --abort-on-container-exit --exit-code-from app --attach app

stop:
	docker compose $(COMPOSE_DEV) down

clean:
	docker compose $(COMPOSE_DEV) down -v

prod:
	docker compose up -d --build
