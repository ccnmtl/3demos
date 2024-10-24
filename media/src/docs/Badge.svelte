<script>
    /**
     * @typedef {Object} Props
     * @property {string} [type]
     * @property {import('svelte').Snippet} [children]
     */

    /** @type {Props} */
    let { type = 'secondary', children } = $props();
</script>

<strong class={`badge rounded-pill text-bg-${type}`}>
    {#if children}{@render children()}{:else}<!-- optional fallback -->{/if}
</strong>
