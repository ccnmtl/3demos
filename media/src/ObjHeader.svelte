<script>
    export let hidden;
    export let onClose;
</script>

<span>
    <button 
        class="item-header"
        on:click={() => {hidden = !hidden}}
    >
        <i class="fa fa-window-minimize"></i>
    </button>
    <button 
        class="item-header"
        on:click={onClose}
    >
        <i class="fa fa-window-close"></i>
    </button>
</span>
