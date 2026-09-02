COMPOSE_DEV = -f .devcontainer/docker-compose.yaml -f .devcontainer/docker-compose.dev.yaml
COMPOSE_E2E = -f .devcontainer/docker-compose.yaml -f .devcontainer/docker-compose.e2e.yaml
E2E_PROJECT ?= confirmator-e2e
E2E_MONGODB_PORT ?= 27038
E2E_BACKEND_PORT ?= 3040
E2E_FRONTEND_PORT ?= 3041

.PHONY: dev build-ui test test-e2e test-e2e-install stop clean prod

dev:
	docker compose $(COMPOSE_DEV) up app

build-ui:
	docker compose $(COMPOSE_DEV) run --rm app yarn build:ui --mode production

test:
	docker compose -f .devcontainer/docker-compose.yaml -f .devcontainer/docker-compose.test.yaml \
	  -p confirmator-test \
	  up --abort-on-container-exit --exit-code-from app --attach app

test-e2e-install:
	yarn test:e2e:install

test-e2e:
	trap 'status=$$?; trap - EXIT INT TERM; docker compose $(COMPOSE_E2E) -p $(E2E_PROJECT) down -v --remove-orphans; docker compose $(COMPOSE_E2E) -p $(E2E_PROJECT) rm -sf app; exit $$status' EXIT INT TERM; \
	  docker compose $(COMPOSE_E2E) -p $(E2E_PROJECT) up -d mongodb; \
	  E2E_BACKEND_COMMAND='docker compose $(COMPOSE_E2E) -p $(E2E_PROJECT) run --rm --service-ports app' \
	  E2E_MONGODB_PORT=$(E2E_MONGODB_PORT) TEST_MONGODB_URI=mongodb://admin:password@127.0.0.1:$(E2E_MONGODB_PORT)/e2e?authSource=admin \
	  E2E_BACKEND_PORT=$(E2E_BACKEND_PORT) E2E_FRONTEND_PORT=$(E2E_FRONTEND_PORT) yarn test:e2e

stop:
	docker compose $(COMPOSE_DEV) down

clean:
	docker compose $(COMPOSE_DEV) down -v

prod:
	docker compose up -d --build
