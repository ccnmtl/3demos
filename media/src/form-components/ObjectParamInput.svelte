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
    export let className = 'box box-2';

    let submittedValue = initialValue;
</script>

<input
    type={type}
    class={className}
    on:blur={(e) => {
        submittedValue = e.target.value;
        onBlur(submittedValue);
    }}
    value={submittedValue} />
