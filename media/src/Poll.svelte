<script>
    export let currentPoll;
    export let socket;

    const handleOnSubmit = function(e) {
        e.preventDefault();

        const responseEl =
              e.target.querySelector('input[name="poll_response"]');
        const response = responseEl.value;

        socket.send(JSON.stringify({
            message: {
                pollResponse: response
            }
        }));
    }
</script>

{#if currentPoll}
    <div class="card">
        <div class="card-body">
            <form on:submit={handleOnSubmit}>
                <div class="mb-3">
                    {currentPoll.prompt}
                </div>

                {#if currentPoll.type === 0}
                    <input type="number" step="0.01"
                           style="width: 100px;"
                           name="poll_response"
                           class="form-control mb-2" />
                {/if}

                {#if currentPoll.choices}
                    {#each currentPoll.choices as choice}
                        <div class="form-check">
                            <label class="form-check-label">
                                <input class="form-check-input"
                                       type="radio"
                                       name={`pollRadio-${choice}`}>
                                {choice}
                            </label>
                        </div>
                    {/each}
                {/if}

                <button type="submit" class="btn btn-primary">
                    Submit
                </button>
            </form>
        </div>
    </div>
{/if}
