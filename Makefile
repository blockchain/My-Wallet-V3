all: clean node_modules semistandard test dist/my-wallet.js dist/my-wallet.min.js changelog

node_modules:
	yarn --ignore-engines

build: node_modules
	npm run build

test: build
	./node_modules/karma/bin/karma start karma.conf.js --single-run

dist/my-wallet.js: build

dist/my-wallet.min.js: node_modules
	npm run dist

semistandard: node_modules
	node_modules/.bin/semistandard --verbose | snazzy

# git-changelog uses the most recent tag, which is not what we want after we
# just tagged a release. Use the previous tag instead.
IS_TAGGED_COMMIT:=$(shell git describe --exact-match HEAD > /dev/null && echo 1 || echo 0)
ifeq ($(IS_TAGGED_COMMIT), 1)
	TAG=$(shell git tag --sort=version:refname | grep '^v[0-9]*\.[0-9]*\.[0-9]*' | tail -n2 | head -1)
	TAG_ARG:=-t $(TAG)
else
  TAG_ARG:=
endif

changelog: node_modules
	node_modules/git-changelog/tasks/command.js $(TAG_ARG)

clean:
	rm -rf dist node_modules Changelog.md
	npm cache clean
