<script>
    import ArcLength from './stories/ArcLength.svelte';
    import Linear from './stories/Linear.svelte';
    import PathIntegral from './stories/PathIntegral.svelte';
    import FluxIntegral from './stories/FluxIntegral.svelte';

    export let objects;

    let currentStory = '';
</script>

<select bind:value={currentStory}>
    <option value={ArcLength}>Arc Length</option>
    <option value={Linear}>Linearization</option>
    <option value={PathIntegral}>Path Integrals</option>
    <option value={FluxIntegral}>Flux Integrals</option>
</select>

<svelte:component this={currentStory} bind:objects />
