<script>
    export let minimize;
    export let onClose;
    export let color;
    export let objHidden = null;
    export let selectedObjects;
    export let onSelect = function () {};
    export let toggleHide = function () {};
</script>

<div class="box-title">
    <span>
        <strong style="color: {color};">
            <i class="fa fa-square" />
        </strong>
        <a
            href={'#'}
            class="link-light"
            title="Select object"
            on:click|preventDefault={(e) => {
                if (e.shiftKey) {
                    onSelect();
                } else {
                    selectedObjects = [];
                    onSelect();
                }
            }}
        >
            <slot />
        </a>
    </span>
    <div class="item-header">
        {#if objHidden != null}
            <button
                title={(objHidden ? 'Show' : 'Hide') + ' object'}
                on:click={toggleHide}
            >
                <i class={'fa fa-eye' + (objHidden ? '-slash' : '')} />
            </button>
        {/if}
        <button
            title={(minimize ? 'Reveal ' : 'Collapse ') + ' object parameters'}
            on:click={() => {
                minimize = !minimize;
            }}
        >
            <i class="fa fa-window-minimize" />
        </button>
        <button title="Remove object" on:click={onClose}>
            <i class="fa fa-window-close" />
        </button>
    </div>
</div>
