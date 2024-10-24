<script>
    import { preventDefault } from 'svelte/legacy';

    let { title = $bindable() } = $props();

    let edit = $state(false);
    let backupTitle = $state();
    let editBar = $state();

    const init = (el) => {
        el.focus();
        el.select();
        backupTitle = el.value;
    };
</script>

{#if edit}
    <input
        type="text"
        bind:this={editBar}
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
    <strong
        ><span class="edit-hover">
            {title}&nbsp;
            <a
                href={'#'}
                onclick={preventDefault((e) => {
                    edit = true;
                    e.stopPropagation();
                })}
            >
                <i class="bi bi-pencil-square"></i></a
            ></span
        >
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
