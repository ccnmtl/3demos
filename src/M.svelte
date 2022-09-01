<script>
  import katex from "katex";
  import { afterUpdate, onMount } from "svelte";

  let span, span2;

  const render = () =>
    katex.render(span.innerText, span2, {
      throwOnError: false,
      displayMode: false,
    });

  onMount(render);
  afterUpdate(render);
</script>

<span bind:this={span} class="input">
  <slot />
</span>

<span bind:this={span2} class="output"></span>

<style>
  .input {
    display: none;
  }
</style>
