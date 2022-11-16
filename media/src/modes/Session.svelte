<script>
    import {getRoomUrl} from '../utils.js';

    export let sessionId;
    let joinSessionId = '';

    const onJoinSession = (joinSessionId) => {
        window.location.href = getRoomUrl(joinSessionId);
    };

    const onMakeSession = () => {
        // Generate random session ID between 1 and 100
        const newSessionId = Math.round(Math.random() * 100) + 1;
        window.location.href = getRoomUrl(newSessionId);
    };
</script>

{#if sessionId}
<p>
    Connected to session <strong>{sessionId}</strong>!
</p>
{:else}
    <form on:submit|preventDefault={() => onJoinSession(joinSessionId)}
        class="row row-cols-lg-auto align-items-center">
        <div class="col-12">
            <input type="text" class="form-control" id="joinSessionId"
                   placeholder="Session ID"
                   bind:value={joinSessionId} />
        </div>
        <div class="col-12">
            <button
                type="submit"
                class={`btn btn-primary ${joinSessionId ? '' : 'disabled'}`}>
                Join Session
            </button>
        </div>
    </form>

    <hr />

    <button
        type="button" class="btn btn-primary"
        on:click={onMakeSession}>
        Make Session
    </button>
{/if}
