<script>
    export let hidden;
    export let onClose;
    export let color;
</script>

<div class="box-title">
    <span>
        <strong style="color: {color};">
            <i class="fa fa-square" />
        </strong>
        <strong><slot></slot></strong>
    </span>
    <div class="item-header">
        <button
            title={hidden ? 'Show' : 'Hide'}
            on:click={() => {hidden = !hidden}}>
            <i class="fa fa-window-minimize"></i>
        </button>
        <button
            title="Remove object"
            on:click={onClose}>
            <i class="fa fa-window-close"></i>
        </button>
    </div>
</div>
