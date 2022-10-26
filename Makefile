APP=mathplayground

include *.mk

daphne: $(PY_SENTINAL)
	./ve/bin/daphne -b 0.0.0.0 -p 8000 --proxy-headers \
		mathplayground.asgi:application

.PHONY: daphne
