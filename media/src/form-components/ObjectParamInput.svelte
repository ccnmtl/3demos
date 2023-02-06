<script>
    /**
     * ObjectParamInput
     *
     * A svelte component that renders a text <input> that updates
     * its value on change, and displays error state when appropriate.
     */

    export let initialValue;
    export let onChange;
    export let type = 'text';
    export let className = 'form-control form-control-sm box box-2';

    // Flag to determine whether this component is in an error state.
    export let error = false;

    let submittedValue = initialValue;
</script>

<input
    type={type}
    class={className + (error ? ' is-invalid' : '')}
    on:change={(e) => {
        submittedValue = e.target.value;
        onChange(submittedValue);
    }}
    value={submittedValue} />
