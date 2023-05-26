<script>
    import { onMount } from 'svelte';
    import DocImport from './DocImport.svelte';
    import DocKeyControls from './DocKeyControls.svelte';
    import DocObjParam from './DocObjParam.svelte';
    import DocObjWindow from './DocObjWindow.svelte';
    import DocPolling from './DocPolling.svelte';
    import DocSession from './DocSession.svelte';
    import Intro from './Intro.svelte';

    let currentOption = Intro;

    const options = [
        { title: 'Intro', comp: Intro },
        { title: 'Session Mode', comp: DocSession },
        { title: 'Importing & Formatting', comp: DocImport },
        { title: 'Keyboard Shortcuts', comp: DocKeyControls },
        { title: 'Special Parameters', comp: DocObjParam },
        { title: 'Object Window', comp: DocObjWindow },
        { title: 'Polling', comp: DocPolling },
    ];
</script>

<article>
    <div class="container">
        <select name="some-menu" id="some-menu" bind:value={currentOption}>
            {#each options as { title, comp }}
                <option value={comp}>{title}</option> ]
            {/each}
        </select>
    </div>

    <svelte:component this={currentOption} />
</article>

<style>
    select {
        background-color: blue;
        color: white;
        font-size: 1.25em;
        padding: 5px;
        margin: 5px;
    }
</style>
