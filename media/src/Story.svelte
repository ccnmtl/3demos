<script>
    import Blank from './stories/Blank.svelte';
    import ArcLength from './stories/ArcLength.svelte';
    import Linear from './stories/Linear.svelte';
    import PathIntegral from './stories/PathIntegral.svelte';
    import SurfaceArea from './stories/SurfaceArea.svelte';
    import FluxIntegral from './stories/FluxIntegral.svelte';

    let { scene, render, animate = () => {} } = $props();

    /**
     * @type {typeof import('./stories/Blank.svelte').default}
     */
    let CurrentStory = $state(Blank);
</script>

<div class="btn-group mb-2">
    <select
        bind:value={CurrentStory}
        class="demos-obj-select form-select bg-primary border-primary text-light"
        name="story-selector"
    >
        <option value={Blank}>Select Story...</option>
        <option value={ArcLength}>Arc Length</option>
        <option value={Linear}>Linearization</option>
        <option value={PathIntegral}>Path Integrals</option>
        <option value={SurfaceArea}>Surface Area</option>
        <option value={FluxIntegral}>Flux Integrals</option>
    </select>
</div>

<div class="story-content-box">
    <CurrentStory {scene} {render} {animate} />
</div>

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
