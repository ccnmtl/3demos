<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    export let className = 'play-buttons box-2';
    export let animation = false;
</script>

<div class={className}>
    <button
        class="btn playpausebtn"
        on:click={() => {
            dispatch(animation ? 'pause' : 'animate');
            animation = !animation;
        }}
    >
        {#if !animation}
            <i class="fa fa-play" />
        {:else}
            <i class="fa fa-pause" />
        {/if}
    </button>
    <button
        class="btn rewbtn"
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
    }
</style>
