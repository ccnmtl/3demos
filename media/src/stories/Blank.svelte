<script>
    let { animate = null } = $props();
</script>

<p>
    This is Story Mode. It is in development. Choose a topic to learn more
    theory, see guided examples, and try out exercises.
</p>

{#if animate}
    <p>animate found</p>
{:else}
    <p>No animate.</p>
{/if}
