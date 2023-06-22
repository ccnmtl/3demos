<script>
    export let title = '';
    export let onClick = function() {};

    const loadFocus = function (el) {
        el.focus();
    }
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
            on:click={onClick}
            use:loadFocus
        >
            <i class="bi bi-x-lg" />
        </button>
    </div>
</div>
