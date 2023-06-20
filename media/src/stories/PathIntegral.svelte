<script>
    import M from '../M.svelte';
    import { gridOn } from '../settings/settings-stores';
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';

    const backupGridOn = get(gridOn);

    onMount(() => {
        $gridOn = true;
    });

    onDestroy(() => {
        $gridOn = backupGridOn;
    });
</script>

<div>
    <h1>Path Integrals</h1>

    <M display>{`\\int_C f\\,ds`}</M>

    <!-- <input type="checkbox" name="gridon" id="gridon" bind:checked={$gridOn} /> -->

    <p>Coming soon...</p>
</div>
