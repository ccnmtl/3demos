<script>
    import ArcLength from './stories/ArcLength.svelte';
    import Linear from './stories/Linear.svelte';
    import PathIntegral from './stories/PathIntegral.svelte';
    import FluxIntegral from './stories/FluxIntegral.svelte';

    export let objects;
    export let scene;
    export let render;

    let currentStory = null;
</script>

<div class="btn-group mb-2">
    <select
        bind:value={currentStory}
        class="demos-obj-select form-select bg-primary border-primary text-light"
        name="story-selector"
    >
        <option value={null}>Select Story...</option>
        <option value={ArcLength}>Arc Length</option>
        <option value={Linear}>Linearization</option>
        <option value={PathIntegral}>Path Integrals</option>
        <option value={FluxIntegral}>Flux Integrals</option>
    </select>
</div>

{#if currentStory}
    <div class="story-content-box">
        <svelte:component
            this={currentStory}
            bind:objects
            {scene}
            {render}
            on:animate
        />
    </div>
{:else}
    <p>
        This is Story Mode. It is in development. Choose a topic to learn more
        theory, see guided examples, and try out exercises.
    </p>
{/if}

<style>
    .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
        width: inherit;
    }
    .story-content-box {
        max-height: 70vh;
        overflow-x: hidden;
        overflow-y: auto;
    }
</style>
