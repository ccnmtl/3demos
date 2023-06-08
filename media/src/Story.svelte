<script>
    import ArcLength from './stories/ArcLength.svelte';
    import Linear from './stories/Linear.svelte';
    import PathIntegral from './stories/PathIntegral.svelte';
    import FluxIntegral from './stories/FluxIntegral.svelte';

    export let objects;

    let currentStory = null;
</script>

<select bind:value={currentStory}>
    <option value={null}>Select Story...</option>
    <option value={ArcLength}>Arc Length</option>
    <option value={Linear}>Linearization</option>
    <option value={PathIntegral}>Path Integrals</option>
    <option value={FluxIntegral}>Flux Integrals</option>
</select>

{#if currentStory}
    <div class="story-content-box">
        <svelte:component this={currentStory} bind:objects />
    </div>
{:else}
    <p>
        This is Story Mode. It is in development. Choose a topic to learn more
        theory, see guided examples, and try out exercises.
    </p>
{/if}

<style>
    select {
        background-color: blue;
        color: white;
        font-size: 1.25em;
        padding: 5px;
        margin: 5px;
    }

    .story-content-box {
        max-height: 70vh;
        overflow-x: hidden;
        overflow-y: auto;
    }
</style>
