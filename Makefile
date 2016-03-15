all: clean node_modules test dist/application.min.js

# Skip test phase, pending Chrome issue
jenkins: clean node_modules dist/application.min.js

node_modules:
	npm install

build:
	grunt build

test: build
	./node_modules/karma/bin/karma start karma.conf.js --single-run

dist/application.min.js:
	grunt dist
	npm shrinkwrap --dev

clean:
	rm -rf build dist node_modules npm-shrinkwrap.json
	npm cache clean
