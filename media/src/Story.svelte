<script>
    import ArcLength from './stories/ArcLength.svelte';
    import Linear from './stories/Linear.svelte';
    import PathIntegral from './stories/PathIntegral.svelte';
    import FluxIntegral from './stories/FluxIntegral.svelte';

    export let objects;

    const options = [
        { title: '', comp: undefined },
        { title: 'Arc Length', comp: ArcLength },
        { title: 'Linearization', comp: Linear },
        { title: 'Path Integrals', comp: PathIntegral },
        { title: 'Flux Integrals', comp: FluxIntegral },
    ];

    let currentStory = '';
    let currentComp = undefined;
</script>

<article>
    <div class="dropdown">
        <button
            class="btn btn-primary dropdown-toggle mb-2"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
        >
            Topic: {currentStory}
        </button>
        <ul class="dropdown-menu">
            {#each options as option}
                <li>
                    <button
                        class="dropdown-item"
                        on:click={() => {
                            currentStory = option.title;
                            currentComp = option.comp;
                        }}>{option.title}</button
                    >
                </li>
            {/each}
        </ul>
    </div>

    {#if currentStory !== ''}
        <svelte:component this={currentComp} bind:objects />
    {:else}
        This is Story Mode. Choose a topic above to explore. Each has
        explanatory text with some interactive components that will populate the
        scene with relevant graphical objects. These can be manipulated further
        in the objects list as in Creative Mode.
    {/if}
</article>
