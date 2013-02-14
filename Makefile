test:
	node_modules/.bin/jshint lib/* --config .jshintrc
	node_modules/.bin/mocha --reporter spec --require test/env

.PHONY: test
