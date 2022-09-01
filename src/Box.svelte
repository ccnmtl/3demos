<script>
  import ParSurf from './ParSurf.svelte';

  import * as THREE from "three";
  import { onDestroy, onMount, createEventDispatcher } from "svelte";

  export let scene = new THREE.Scene();
  export let onClose = () => {};
  export let update = (dt) => {};
  export let render = () => {};
  export let animation = false;

  const speed = Math.ceil(Math.random() * 4)

  const dispatch = createEventDispatcher();

  let size = 2;

  const box = new THREE.Mesh();
  box.position.x = Math.random() * 4 - 2;
  box.position.y = Math.random() * 4 - 2;
  box.position.z = Math.random() * 4 - 2;

  const r = Math.sqrt(box.position.x*box.position.x + box.position.y*box.position.y)

  async function updateBox() {
    // await tick();
    if (box.geometry) {
      box.geometry.dispose();
    }
    box.geometry = new THREE.BoxGeometry(size, size, size);
    for (let index = box.children.length - 1 ; index >= 0; index--) {
        const element = box.children[index];
        element.geometry.dispose();
        element.material.dispose();
        box.remove(element);
    }
    const edges = new THREE.EdgesGeometry( box.geometry );
    const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );

    box.add( line );
    render();
  }

  box.material = new THREE.MeshBasicMaterial({ color: 0x2f0077 });

  scene.add(box);

  updateBox();

  onDestroy(() => {
    box.geometry.dispose();
    box.material.dispose();
    box.parent.remove(box);
    animation = false;
    render();
  });

  onMount(() => {
    render()
  })



// Set update function for animation
update = (dt) => {
    box.rotation.x += speed*Math.PI/2*dt;
    box.rotation.y += speed*dt;
    box.rotation.z += speed*Math.PI/4*dt;
}


</script>

<div class="boxItem">
  <input
    type="range"
    bind:value={size}
    on:input={updateBox}
    min="0.5"
    max="4"
    step="0.01"
  /> &nbsp; <button on:click={onClose}> <i class="fa fa-times"></i></button>

  <button  on:click={() => {animation = !animation; if (animation) dispatch('animate');}}>
      {#if !animation}
      <i class="fa fa-play"></i>
      {:else}
      <i class="fa fa-stop"></i> {speed}
      {/if}
</button>
</div>

<!-- <div class="stats">
    <span></span> : <span id="dateNow"></span>
</div> -->

<!-- <link rel="stylesheet" href=""> -->
<style>
  input {
    margin: 0px;
    vertical-align: middle;
  }
  button {
    background-color: rgba(.6, 0.6, 0.6, 0.6);
    border: none;
    color: gray;
  }
  button:hover {
    /* background-color: rgba(0.6,0.6,0.6,0.5); */
    color: white;
  }
  button:active {
    /* background-color: rgba(0.6,0.6,0.6,1); */
    color: black;
  }
  /* .stats {
      color: white;
      border: 1px solid white;
      margin-left: auto;
      margin-right: auto;
      width: 6em;
  } */


</style>

