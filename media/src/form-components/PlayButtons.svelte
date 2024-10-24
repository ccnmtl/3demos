<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    /**
     * @typedef {Object} Props
     * @property {string} [className]
     * @property {boolean} [animation]
     */

    /** @type {Props} */
    let { className = 'play-buttons box-2', animation = $bindable(false) } = $props();
</script>

<div class={className}>
    <button
        class="btn playpausebtn"
        onclick={() => {
            dispatch(animation ? 'pause' : 'animate');
            if (!animation) dispatch('play');
            animation = !animation;
        }}
    >
        {#if !animation}
            <i class="fa fa-play"></i>
        {:else}
            <i class="fa fa-pause"></i>
        {/if}
    </button>
    <button
        class="btn rewbtn"
        onclick={() => {
            dispatch('rew');
            // animation = false;
        }}
    >
        <i class="fa fa-fast-backward"></i>
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
