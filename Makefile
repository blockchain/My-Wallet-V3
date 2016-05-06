all: clean node_modules test dist/application.min.js Changelog.md

node_modules:
	npm install

build:
	grunt build

test: build
	./node_modules/karma/bin/karma start karma.conf.js --single-run

dist/application.min.js:
	grunt dist
	npm shrinkwrap --dev

# git-changelog uses the most recent tag, which is not what we want after we
# just tagged a release. Use the previous tag instead.
IS_TAGGED_COMMIT:=$(shell git describe --exact-match HEAD > /dev/null && echo 1 || echo 0)
ifeq ($(IS_TAGGED_COMMIT), 1)
	TAG_ARG:=-t "$(shell git tag --sort=version:refname | tail -n2 | head -1)"
else
  TAG_ARG:=
endif

Changelog.md: node_modules
	node_modules/git-changelog/tasks/command.js $(TAG_ARG) -f "Changelog.md" -g "^fix|^feat|^docs|^refactor|^chore|^test|BREAKING" -i "" -a "Blockchain Wallet V3" --repo_url "https://github.com/blockchain/My-Wallet-V3"

clean:
	rm -rf build dist node_modules npm-shrinkwrap.json Changelog.md
	npm cache clean
