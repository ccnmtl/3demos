<script>
    /**
     * A svelte component for parameter inputs.
     * Input value is checked on change against the parameters. If validated (via a user-supplied checker), dispatch a cleared function, else alert the user with error message.
     */
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let name;
    export let type = 'text';
    export let value = '';
    export let className = 'form-control form-control-sm box box-2';
    export let params;
    let inputElement;
    export let checker = (val) => {
        return Number.isFinite(val);
    };
</script>

<input
    {type}
    {name}
    {value}
    bind:this={inputElement}
    class={className}
    on:change={(e) => {
        const val = e.target.value;
        if (checker(val, params)) {
            inputElement.classList.remove('is-invalid');
            dispatch('cleared', val);
        } else {
            inputElement.classList.add('is-invalid');
        }
    }}
/>

<style>
    input {
        color: black;
    }
</style>
