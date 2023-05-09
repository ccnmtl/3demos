<script>
    import DocImport from "./DocImport.svelte";
    import DocKeyControls from "./DocKeyControls.svelte";
    import DocObjParam from "./DocObjParam.svelte";
    import DocObjWindow from "./DocObjWindow.svelte";
    import DocPolling from "./DocPolling.svelte";
    import DocSession from "./DocSession.svelte";
    import Intro from "./Intro.svelte";

    let currentOption = 'Intro';

    const options = [
        'Intro', 'Objects Window', 'Special Object Parameters', 'Keyboard Controls',
        'Importing & Formatting', 'Session', 'Polling'
    ]

    const badge = function(text, type) {
        return '<em class="badge rounded-pill text-bg-' + type + '">' + text + '</em>';
    }

</script>

<article>
    <div class="dropdown">
        <button class="btn btn-primary dropdown-toggle mb-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Topic: {currentOption}
        </button>
        <ul class="dropdown-menu">
            {#each options as option}
                <li>
                    <button class="dropdown-item" on:click={() => {currentOption = option}}>{option}</button>
                </li>
            {/each}
        </ul>
    </div>
    {#if currentOption === 'Intro'}
        <Intro />
    {:else if currentOption === 'Objects Window'}
        <DocObjWindow {badge} />
    {:else if currentOption === 'Special Object Parameters'}
        <DocObjParam />
    {:else if currentOption === 'Keyboard Controls'}
        <DocKeyControls {badge}/>
    {:else if currentOption === 'Importing & Formatting'}
        <DocImport />
    {:else if currentOption === 'Session'}
        <DocSession {badge}/>
    {:else if currentOption === 'Polling'}
        <DocPolling {badge}/>
    {/if}
</article>

