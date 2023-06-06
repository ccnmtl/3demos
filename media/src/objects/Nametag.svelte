<script>
    import { e } from 'mathjs';

    export let title;

    let edit = false;
    let backupTitle;
    let editBar;

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
        on:keydown={(e) => {
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
        on:blur={() => {
            edit = false;
        }}
        on:change={() => {
            edit = false;
        }}
        on:click={(e) => e.stopPropagation()}
    />
{:else}
    <strong
        ><span class="edit-hover">
            {title}&nbsp;
            <a
                href={'#'}
                on:click|preventDefault={(e) => {
                    edit = true;
                    e.stopPropagation();
                }}
            >
                <i class="bi bi-pencil-square" /></a
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
