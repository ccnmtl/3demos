APP=mathplayground
JS_FILES=media/src media/test

include *.mk

daphne: $(PY_SENTINAL)
	./ve/bin/daphne -b 0.0.0.0 -p 8000 --proxy-headers \
		mathplayground.asgi:application
.PHONY: daphne

js-build: $(JS_SENTINAL)
	rm -rf media/mathplayground/build/*
	npm run build
.PHONY: js-build
