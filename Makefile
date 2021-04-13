default: all

.PHONY: all
all: install test

.PHONY: install
install:
	npm install


.PHONY: test
test:
	export SUPPRESS_NO_CONFIG_WARNING=1 && npm run test

.PHONY: lint
lint: 
	npm run lint

.PHONY: lint-fix
lint-fix:
	npm run lint:fix

.PHONY: test-cov
test-cov:
	npm run test-cov
