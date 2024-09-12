# 3Demos
3Demos is Drew Youngren's 3D Calculus Visualizations. Developed by Drew Youngren
and the Columbia University Center for Teaching and Learning.

This project comprises of two main parts:
* Django back-end.
  Django Channels server for mathplayground. Structure based on:
  https://channels.readthedocs.io/en/latest/tutorial/index.html All
  Django code is in the `mathplayground/` directory.
* Front-end using [Svelte](https://svelte.dev/) and
  [three.js](https://threejs.org/). The main JavaScript code can be
  found in `media/src/`.


## Start-up steps:
Install [Redis](https://redis.io/) and start the redis service.
```
redis-server
```

Start django server:
```
make runserver
```

In order to get the django daphne application responding to WebSockets,
you will need to set up a proxy with nginx to forward and set certain headers.
See: https://channels.readthedocs.io/en/latest/deploying.html#nginx-supervisor-ubuntu

### Svelte application
To make changes to the svelte application in `media/src/`, first install the
node dependencies with `npm install`. Then you can run the rollup build via 
npm like this:
```
npm run dev
```

Or, make a one-time production build of the applcation with `npm run build`.

Both of these commands will update the compiled JS at `media/mathplayground/build/`.

### Using Docker in Develo0pment

# What's included
`.dockerignore` - This files is used to ignore anything you don't want to be copied inside the docker image
`Dockerfile` - The docker image instructions of what to include to build the image.
`nginx.docker.conf` - The nginx instructions inside docker for reverse proxy to mimic our infrastructure setup, this is copied to the docker image when built

# Versions
- ubuntu 20.04 base image
- redis 5.0.7 (which is used in production)
- node 18.16.0 (which is used in Jenkins during our build process)
- python 3.8.10

# Running docker
Run `docker compose -f docker-compose.dev.yml up` to start the containers in your terminal.  These instructions are unique for using it for development purpose because the `volumnes` are mapped to your local directory.  Any changes that is made locally will reflect directly inside the container.

** Currently only working for Django
** TODO: Fix Svelte hot module re-loading from within docker container


