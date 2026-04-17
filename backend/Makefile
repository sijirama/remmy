.PHONY: dev build run docker-dev tidy

dev:
	air

build:
	go build -o ./bin/remmy ./cmd/api

run:
	./bin/remmy

docker-dev:
	docker compose -f dev-compose.yml up -d

tidy:
	go mod tidy
