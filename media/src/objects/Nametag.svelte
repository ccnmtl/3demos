<script>
    let { title = $bindable() } = $props();

    let edit = $state(false);
    let backupTitle;

    const init = (el) => {
        el.focus();
        el.select();
        backupTitle = el.value;
    };
</script>

{#if edit}
    <input
        type="text"
        bind:value={title}
        use:init
        onkeydown={(e) => {
            if (e.key === 'Escape') {
                console.log(e.key);
                title = backupTitle;
                edit = false;
                e.stopPropagation();
            } else {
                if (e.key === 'Enter') {
                    edit = false;
                }
            }
        }}
        onblur={() => {
            edit = false;
        }}
        onchange={() => {
            edit = false;
        }}
        onclick={(e) => e.stopPropagation()}
    />
{:else}
    <strong>
        <span class="edit-hover">
            {title}&nbsp;
            <a
                href={'#'}
                onclick={(e) => {
                    e.preventDefault();
                    edit = true;
                    e.stopPropagation();
                }}
                aria-label="Edit object title"
            >
                <i class="bi bi-pencil-square"></i>
            </a>
        </span>
    </strong>
{/if}

<style>
    .edit-hover a {
        visibility: hidden;
    }

    .edit-hover:hover a {
        visibility: visible;
    }
</style>
