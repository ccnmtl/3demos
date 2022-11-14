<script>
    import * as THREE from "three";
    import { onDestroy, onMount, createEventDispatcher } from "svelte";

    export let scene = new THREE.Scene();
    export let onClose = () => {};
    export let onUpdate = () => {};
    export let update = () => {};
    export let render = () => {};
    export let animation = false;


    export let params = {
        size: 2
    };

    const speed = Math.ceil(Math.random() * 4);

    const dispatch = createEventDispatcher();

    const box = new THREE.Mesh();
    box.position.x = Math.random() * 4 - 2;
    box.position.y = Math.random() * 4 - 2;
    box.position.z = Math.random() * 4 - 2;

    const updateBox = function() {
        if (box.geometry) {
            box.geometry.dispose();
        }
        box.geometry = new THREE.BoxGeometry(
            params.size, params.size, params.size);
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
    };

    $: params && updateBox();

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
        render();
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
        bind:value={params.size}
        on:input={() => {
            onUpdate();
            updateBox();
        }}
        min="0.5"
        max="4"
        step="0.01"
        /> &nbsp; <button on:click={onClose}>
        <i class="fa fa-times"></i>
    </button>

    <button on:click={() => {animation = !animation; if (animation) dispatch('animate');}}>
        {#if !animation}
            <i class="fa fa-play"></i>
        {:else}
            <i class="fa fa-stop"></i> {speed}
        {/if}
    </button>
</div>
