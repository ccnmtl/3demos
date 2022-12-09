<script>
    import {forceNumber} from './utils';

    export let currentPoll;
    export let socket;

    const handleOnSubmit = function(e) {
        e.preventDefault();
        let response = [];

        if (currentPoll.type === 0) {
            const responseEl =
                  e.target.querySelector('input[name="poll_response"]');
            response = forceNumber(responseEl.value);
        } else if (currentPoll.type === 1) {
            const responseEl =
                  e.target.querySelectorAll('input[name="poll_response"]');
            responseEl.forEach(function(el) {
                if (el.checked) {
                    response.push(el.value);
                }
            });
        }

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
                                       id={`pollRadio-${choice}`}
                                       name="poll_response"
                                       value={choice}>
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
