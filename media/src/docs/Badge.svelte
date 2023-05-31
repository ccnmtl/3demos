<script>
    export let type = 'secondary';
</script>

<strong class={`badge rounded-pill text-bg-${type}`}>
    <slot><!-- optional fallback --></slot>
</strong>
