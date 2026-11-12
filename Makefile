WEB_EXT = pnpm exec web-ext

.PHONY: firefox check test lint build sign open install

# Steps depend on each other, so ignore a global -j in MAKEFLAGS.
.NOTPARALLEL:

# Check, sign, and open the signed add-on in Firefox.
firefox: check sign open

# Everything CI runs.
check: install lint test build

install:
	pnpm install --frozen-lockfile

test:
	pnpm test

lint:
	pnpm exec biome check .
	$(WEB_EXT) lint

# Unsigned zip in web-ext-artifacts/. Upload it to the Chrome Web Store,
# or load it in Firefox with "Load Temporary Add-on" in about:debugging.
build:
	$(WEB_EXT) build --overwrite-dest

# Signed .xpi in web-ext-artifacts/. Reads AMO_JWT_ISSUER and AMO_JWT_SECRET from .env.
# Mozilla only signs each version once, so bump "version" in manifest.json first.
sign:
	@set -a && . ./.env && set +a && \
	$(WEB_EXT) sign --api-key "$$AMO_JWT_ISSUER" --api-secret "$$AMO_JWT_SECRET"

open:
	open -a Firefox "$$(ls -t web-ext-artifacts/*.xpi | head -1)"
