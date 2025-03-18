<script>
    let {
        minimize = $bindable(false),
        onClose,
        color,
        objHidden,
        onSelect,
        toggleHide = () => {},
        children,
    } = $props();
</script>

<div class="box-title">
    <span>
        <strong style="color: {color};">
            <i class="fa fa-square"></i>
        </strong>
        <a
            href={'#'}
            class="link-light"
            title="Select object"
            onclick={(e) => {
                e.preventDefault();
                onSelect(e);
            }}
        >
            {@render children?.()}
        </a>
    </span>
    <div class="item-header">
        {#if !objHidden}
            <button
                title={(objHidden ? 'Show' : 'Hide') + 'object'}
                onclick={toggleHide}
                aria-label="Hide"
            >
                <i class={'fa fa-eye' + (objHidden ? '-slash' : '')}></i>
            </button>
        {/if}
        <button
            title={(minimize ? 'Reveal ' : 'Collapse ') + 'object parameters'}
            onclick={() => {
                minimize = !minimize;
            }}
            aria-label={(minimize ? 'Reveal ' : 'Collapse ') +
                'object parameters'}
        >
            <i class="fa fa-window-minimize"></i>
        </button>
        <button
            title="Remove object"
            onclick={onClose}
            aria-label="Close/delete object"
        >
            <i class="fa fa-window-close"></i>
        </button>
    </div>
</div>
