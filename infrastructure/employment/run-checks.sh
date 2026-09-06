#!/bin/sh
# Run from an isolated validation/release checkout. The test env must target its own DB.
set -eu
: "${SAMMA_NODE_IMAGE:?Pinned Node image required}"
: "${SAMMA_EMPLOYMENT_CHECKOUT:?Isolated checkout required}"
: "${SAMMA_EMPLOYMENT_TEST_ENV:?Private disposable-database env file required}"
exec docker run --rm --init --user "$(id -u):$(id -g)" \
  --network juanity-dev --memory=1g --memory-swap=1g --cpus=0.75 --pids-limit=128 \
  --mount "type=bind,source=$SAMMA_EMPLOYMENT_CHECKOUT,target=/app" --workdir /app \
  --env-file "$SAMMA_EMPLOYMENT_TEST_ENV" "$SAMMA_NODE_IMAGE" \
  node_modules/.bin/tsx --test infrastructure/employment/invitations.test.ts
