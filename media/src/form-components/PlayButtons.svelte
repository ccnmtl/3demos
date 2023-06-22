<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    export let className = 'play-buttons box-2';
    export let animation = false;
</script>

<div class={className}>
    <button
        class="btn playpausebtn"
        title={animation ? 'Pause animation' : 'Play animation'}
        on:click={() => {
            dispatch(animation ? 'pause' : 'animate');
            animation = !animation;
        }}
    >
        {#if !animation}
            <i class="fa fa-play"/>
        {:else}
            <i class="fa fa-pause"/>
        {/if}
    </button>
    <button
        class="btn rewbtn"
        title="Restart animation"
        on:click={() => {
            dispatch('rew');
            // animation = false;
        }}
    >
        <i class="fa fa-fast-backward" />
    </button>
</div>

<style>
    div {
        display: flex;
        align-items: center;
        justify-content: space-around;
    }
    .btn {
        color: white;
        border: solid 3px transparent;
    }
    .btn:hover, .btn:focus {
        border: solid 3px #6caddf;
    }
</style>
