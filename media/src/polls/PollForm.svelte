<script>
    import {stringifyPoll} from './utils.js';

    export let poll;
    export let onClickCancel;
    export let onSubmit;
    export let onDeletePoll;

    let isInvalid = false;

    const onClickDelete = function(e, pollId) {
        if (window.confirm(`Remove poll ${pollId}?`)) {
            return onDeletePoll(e, pollId);
        }
    };

    /**
     * Validate that the form's poll value is formatted as valid JSON.
     * On success, pass the data along to parent onSubmit handler.
     * Otherwise, show error state.
     */
    const onValidateSubmit = function(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const pollString = formData.get('poll');

        let pollObj = null;
        try {
            pollObj = JSON.parse(pollString);
            pollObj.id = poll.id;
        } catch {
            isInvalid = true;
            return;
        }

        isInvalid = false;
        return onSubmit(e, pollObj);
    };
</script>

Poll Form
<form on:submit={onValidateSubmit}>
    {#if isInvalid}
        <div class="alert alert-danger" role="alert">
            Error: invalid JSON
        </div>
    {/if}

    <textarea
        class="form-control"
        name="poll"
        rows="8">{stringifyPoll(poll)}</textarea>

    <button
        on:click={onClickCancel}
        class="btn btn-sm btn-secondary mt-1">
        Cancel
    </button>
    <button type="submit"
            title="Save poll"
            class="btn btn-sm btn-primary mt-1">
        Save
    </button>

    <button
        on:click={(e) => onClickDelete(e, poll.id)}
        type="button"
        title="Delete poll"
        class="btn btn-sm btn-danger mt-1 pull-right">
        <i class="bi bi-trash"></i>
        Delete
    </button>
</form>

<style>
    textarea {
        font-family: monospace;
        font-size: 12px;
    }
</style>
