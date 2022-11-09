# mathplayground
MathPlayground, aka 3Demos is Drew Youngren's 3D Calculus
Visualizations. Developed by Drew Youngren and the Columbia University
Center for Teaching and Learning.

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

### Svelte application
To make changes to the svelte application in `media/src/`, first install the
node dependencies with `npm install`. Then you can run the rollup build via 
npm like this:
```
npm run dev
```

Or, make a one-time production build of the applcation with `npm run build`.

Both of these commands will update the compiled JS at `media/mathplayground/build/`.
