TS  := examples/ts-yellowstone
RS  := examples/rust-carbon

.PHONY: help install test test-ts test-rust validate watch smoke

help:
	@echo "make install   - install example deps (npm + cargo fetch)"
	@echo "make test      - run all OFFLINE decode tests (no API key)"
	@echo "make validate  - typecheck/lint TS + Rust and check fixtures"
	@echo "make watch     - run the TS live watcher (needs GRPC_ENDPOINT)"
	@echo "make smoke     - live smoke test, skipped when GRPC_ENDPOINT is unset"

install:
	cd $(TS) && npm install --no-audit --no-fund
	cd $(RS) && cargo fetch

test: test-ts test-rust

test-ts:
	cd $(TS) && npm test

test-rust:
	cd $(RS) && cargo test

validate:
	cd $(TS) && npx tsc --noEmit
	bash scripts/validate.sh

watch:
	cd $(TS) && npm run watch

smoke:
	@if [ -z "$$GRPC_ENDPOINT" ]; then \
		echo "GRPC_ENDPOINT unset - skipping live smoke test (CI-safe)"; \
		exit 0; \
	fi; \
	echo "running live smoke against $$GRPC_ENDPOINT"; \
	cd $(TS) && timeout 15 npm run watch || true
