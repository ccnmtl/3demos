<script>
    /**
     * @typedef {Object} Props
     * @property {string} [title]
     * @property {any} [onClick]
     */

    /** @type {Props} */
    let { title = '', onClick = function () {} } = $props();
</script>

<div class="row">
    <div class="col-auto me-auto">
        <h3>{title}</h3>
    </div>
    <div class="col-auto">
        <button
            type="button"
            title="Close"
            class="btn btn-sm btn-light"
            onclick={onClick}
        >
            <i class="bi bi-x-lg"></i>
        </button>
    </div>
</div>
