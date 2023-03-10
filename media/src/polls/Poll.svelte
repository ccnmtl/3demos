<script>
    import {forceNumber} from '../utils';

    export let currentPoll;
    export let point;
    export let socket;

    let submitted = false;
    let response = null;

    const handleOnSubmit = function(e) {
        e.preventDefault();

        // Set up response
        response = [];
        if (currentPoll.type === 'numeric') {
            const responseEl =
                  e.target.querySelector('input[name="poll_response"]');
            response = forceNumber(responseEl.value);
        } else if (currentPoll.type === 'multiple choice') {
            const responseEl =
                  e.target.querySelectorAll('input[name="poll_response"]');
            responseEl.forEach(function(el) {
                if (el.checked) {
                    response.push(el.value);
                }
            });
        } else if (currentPoll.type === 'select point') {
            response.push(
                point.position.x.toFixed(3),
                point.position.y.toFixed(3),
                point.position.z.toFixed(3)
            );
        }

        // Send response over websocket
        socket.send(JSON.stringify({
            message: {
                poll: currentPoll.type,
                pollResponse: response
            }
        }));

        // Display "Response Submitted!"
        submitted = true;
    };

    const onPollUpdate = function() {
        // Un-submit the form when the instructor broadcasts a new
        // poll.
        submitted = false;
    };

    $: onPollUpdate(currentPoll);
</script>


{#if currentPoll}
    <div class="card">
        <div class="card-body">
            {#if submitted}
                <p>
                    Response submitted!
                </p>
                {#if currentPoll.type < 2}
                    <p>
                        Your answer: {response}
                    </p>
                {:else}
                    <p>
                        Your answer: x = {response[0]}, y = {response[1]}, z: {response[2]}
                    </p>
                {/if}
            {:else}
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
            {/if}
        </div>
    </div>
{/if}
