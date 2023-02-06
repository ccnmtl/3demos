<script>
    /**
     * ObjectParamInput
     *
     * A svelte component that renders a text <input> that updates
     * its value on blur.
     */

    export let initialValue;
    export let onBlur;
    export let type = 'text';
    export let className = 'form-control form-control-sm box box-2';

    // Flag to determine whether this component is in an error state.
    export let error = false;

    let submittedValue = initialValue;
</script>

<input
    type={type}
    class={className + (error ? ' is-invalid' : '')}
    on:blur={(e) => {
        submittedValue = e.target.value;
        onBlur(submittedValue);
    }}
    value={submittedValue} />
