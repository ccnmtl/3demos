# mathplayground_django
Django Channels server for mathplayground. Structure based on: https://channels.readthedocs.io/en/latest/tutorial/index.html


## Start-up steps:
Install [Redis](https://redis.io/) and start the redis service.

Start django server:
```
make runserver
```

In order to connect to your development version of the mathplayground front-end code, you'll
need to symlink in the JS bundle:
```
./scripts/link.sh
```
