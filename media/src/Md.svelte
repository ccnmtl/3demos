<script>
    import katex from 'katex';
    import { afterUpdate, onMount } from 'svelte';

    let div,div2;

    const render = () =>
          katex.render(div.innerText, div2, {
              throwOnError: false,
              displayMode: true
          });

    onMount(render);
    afterUpdate(render);

</script>

<div bind:this={div} class="slot">

    <slot></slot>
</div>

<div class="output" bind:this={div2}></div>
