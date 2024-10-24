<script>
    


    
    /**
     * @typedef {Object} Props
     * @property {any} initialValue - ObjectParamInput
A svelte component that renders a text <input> that updates
its value on change, and displays error state when appropriate.
     * @property {any} onChange
     * @property {string} [type]
     * @property {string} [className]
     * @property {boolean} [error] - Flag to determine whether this component is in an error state.
     */

    /** @type {Props} */
    let {
        initialValue,
        onChange,
        type = 'text',
        className = 'form-control form-control-sm box box-2',
        error = false
    } = $props();

    let submittedValue = $state(initialValue);
</script>

<input
    type={type}
    class={className + (error ? ' is-invalid' : '')}
    onchange={(e) => {
        submittedValue = e.target.value;
        onChange(submittedValue);
    }}
    value={submittedValue} />
