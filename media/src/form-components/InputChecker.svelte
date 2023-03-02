<script>
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let name;
    export let type = 'text';
    export let initialValue = '';
    export let className = 'form-control form-control-sm box box-2';
    export let params;
    let okParse = true;
    let inputElement;
    export let checker = (val, params) => {
        try {
            math.parse(val);
        } catch (e) {
            console.log('Parsing error.', e);
            return false;
        }
        return true;
    };
    onMount(() => {
        inputElement.value = initialValue;
    });
</script>

<input
    {type}
    {name}
    bind:this={inputElement}
    class={className}
    on:change={(e) => {
        const val = e.target.value;
        okParse = checker(val, params);
        if (okParse) {
            inputElement.classList.remove('is-invalid');
            params[name] = val;
            dispatch('cleared', {
                text: "Yo, that's smooth",
            });
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
