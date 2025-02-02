<script>
    import { curveLinearClosed } from 'd3';

    /**
     * A svelte component for parameter inputs.
     * Input value is checked on change against the parameters. If validated (via a user-supplied checker), dispatch a cleared function, else alert the user with error message.
     */

    let {
        name,
        type = 'text',
        value = '',
        className = 'form-control form-control-sm box box-2',
        params,
        checker = (val) => {
            return Number.isFinite(val);
        },
        cleared = () => {},
    } = $props();

    let inputElement = $state();
</script>

<input
    {type}
    {name}
    {value}
    bind:this={inputElement}
    class={className}
    onchange={(e) => {
        const val = e.target.value;
        if (checker(val, params)) {
            inputElement.classList.remove('is-invalid');
            cleared(val);
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
