# SafeScript QuickJS Example
#
# Prerequisites:
#   - QuickJS installed (https://bellard.org/quickjs/)
#   - Node.js (to generate the bundle)
#
# Usage:
#   make bundle      # generate dist/safescript-quickjs.js
#   make example     # build the C example
#   make run         # run hello.safe through the example
#   make clean

QUICKJS_DIR ?= /usr/local/include/quickjs
QUICKJS_LIB ?= /usr/local/lib

CC ?= cc
CFLAGS = -I$(QUICKJS_DIR) -O2
LDFLAGS = -L$(QUICKJS_LIB) -lquickjs -lm -ldl -lpthread

.PHONY: bundle example run clean

bundle:
	node bundle.js

example: bundle
	$(CC) $(CFLAGS) -o safescript-embed src/main.c $(LDFLAGS)

run: example
	./safescript-embed examples/hello.safe

clean:
	rm -f safescript-embed
	rm -rf dist/
