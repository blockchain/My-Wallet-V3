all: clean node_modules semistandard test dist/my-wallet.js dist/my-wallet.min.js changelog

node_modules:
	npm install

build: node_modules
	npm run build

test: build
	./node_modules/karma/bin/karma start karma.conf.js --single-run

dist/my-wallet.js: build

dist/my-wallet.min.js: node_modules
	npm run dist
	npm shrinkwrap --dev

semistandard:
	node_modules/.bin/semistandard

# git-changelog uses the most recent tag, which is not what we want after we
# just tagged a release. Use the previous tag instead.
IS_TAGGED_COMMIT:=$(shell git describe --exact-match HEAD > /dev/null && echo 1 || echo 0)
ifeq ($(IS_TAGGED_COMMIT), 1)
	TAG_ARG:=-t "$(shell git tag --sort=version:refname | tail -n2 | head -1)"
else
  TAG_ARG:=
endif

changelog: node_modules
	node_modules/git-changelog/tasks/command.js $(TAG_ARG)

clean:
	rm -rf dist node_modules npm-shrinkwrap.json Changelog.md
	npm cache clean
