<script>
    let {
        className = 'play-buttons box-2',
        animation = $bindable(false),
        play = () => {},
        pause,
        rew,
        clicker = () => {},
        playMode = 'loop',
        // animate,
    } = $props();
</script>

<div class={className}>
    <button
        class="btn playpausebtn"
        onclick={() => {
            animation = !animation;
            if (animation) {
                play();
                // animate();
            } else {
                pause();
            }
        }}
        aria-label="play/pause"
    >
        {#if !animation}
            <i class="fa fa-play"></i>
        {:else}
            <i class="fa fa-pause"></i>
        {/if}
    </button>
    <button class="btn rewbtn" onclick={rew} aria-label="rewind">
        <i class="fa fa-fast-backward"></i>
    </button>
    <button class="btn modebtn" onclick={clicker} aria-label="play mode">
        {#if playMode == 'loop'}
            <i class="fa fa-retweet"></i>
        {:else if playMode == 'once'}
            <i class="fa fa-arrow-right"></i>
        {:else}
            <i class="fa fa-arrows-alt-h"></i>
        {/if}
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
    .modebtn {
        width: 1rem;
    }
</style>
