<script>
    import { preventDefault } from 'svelte/legacy';

    /**
     * @typedef {Object} Props
     * @property {any} minimize
     * @property {any} onClose
     * @property {any} color
     * @property {any} [objHidden]
     * @property {any} selectedObjects
     * @property {any} [onSelect]
     * @property {any} [toggleHide]
     * @property {import('svelte').Snippet} [children]
     */

    /** @type {Props} */
    let {
        minimize = $bindable(),
        onClose,
        color,
        objHidden = null,
        selectedObjects = $bindable(),
        onSelect = function () {},
        toggleHide = function () {},
        children
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
            onclick={preventDefault((e) => {
                if (e.shiftKey) {
                    onSelect();
                } else {
                    selectedObjects = [];
                    onSelect();
                }
            })}
        >
            {@render children?.()}
        </a>
    </span>
    <div class="item-header">
        {#if objHidden != null}
            <button
                title={(objHidden ? 'Show' : 'Hide') + 'object'}
                onclick={toggleHide}
            >
                <i class={'fa fa-eye' + (objHidden ? '-slash' : '')}></i>
            </button>
        {/if}
        <button
            title={(minimize ? 'Reveal ' : 'Collapse ') + 'object parameters'}
            onclick={() => {
                minimize = !minimize;
            }}
        >
            <i class="fa fa-window-minimize"></i>
        </button>
        <button title="Remove object" onclick={onClose}>
            <i class="fa fa-window-close"></i>
        </button>
    </div>
</div>
