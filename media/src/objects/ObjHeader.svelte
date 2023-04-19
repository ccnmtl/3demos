<script>
    export let hidden;
    export let onClose;
    export let color;
    export let onSelect = function() {};
</script>

<div class="box-title">
    <span>
        <strong style="color: {color};">
            <i class="fa fa-square" />
        </strong>
        <a href={'#'} class="link-light"
           title="Select object"
           on:click|preventDefault={onSelect}>
            <slot></slot>
        </a>
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
