<script>
    import DocImport from './DocImport.svelte';
    import DocKeyControls from './DocKeyControls.svelte';
    import DocObjParam from './DocObjParam.svelte';
    import DocObjWindow from './DocObjWindow.svelte';
    import DocPolling from './DocPolling.svelte';
    import DocSession from './DocSession.svelte';
    import Intro from './Intro.svelte';
    import DocQuickNav from './DocQuickNav.svelte';

    let currentOption = $state(Intro);

    const options = [
        { title: 'Intro', comp: Intro },
        { title: 'Session Mode', comp: DocSession },
        { title: 'Importing & Formatting', comp: DocImport },
        { title: 'Keyboard Shortcuts', comp: DocKeyControls },
        { title: 'Special Parameters', comp: DocObjParam },
        { title: 'Quick Nav', comp: DocQuickNav },
        { title: 'Object Window', comp: DocObjWindow },
        { title: 'Polling', comp: DocPolling },
    ];

    const SvelteComponent = $derived(currentOption);
</script>

<article>
    <div class="container">
        <select
            class="form-select mb-1 bg-primary border-primary text-light"
            name="howto-selector"
            aria-label="Select documentation section"
            bind:value={currentOption}
        >
            {#each options as { title, comp }}
                <option value={comp}>{title}</option>
            {/each}
        </select>
    </div>

    <SvelteComponent />
</article>
