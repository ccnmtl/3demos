<script>
    import { forceNumber } from '../utils';
    import { demoObjects } from '../states.svelte';

    export let currentPoll;
    export let socket;
    export let isHost;
    export let selectedPoint;
    export let selectedObjects;

    let submitted = false;
    let response = null;

    const handleOnSubmit = function (e) {
        e.preventDefault();

        // Set up response
        let responseEl;
        response = [];

        if (currentPoll.type === 'numeric') {
            responseEl = e.target.querySelector('input[name="poll_response"]');
            response = forceNumber(responseEl.value);
        } else if (currentPoll.type === 'multiple choice') {
            responseEl = e.target.querySelectorAll(
                'input[name="poll_response"]',
            );
            responseEl.forEach(function (el) {
                if (el.checked) {
                    response = el.value;
                }
            });
        } else if (currentPoll.type === 'select point') {
            response = [
                selectedPoint.position.x.toFixed(2),
                selectedPoint.position.y.toFixed(2),
                selectedPoint.position.z.toFixed(2),
            ];
        } else if (currentPoll.type === 'select object') {
            response = demoObjects.find((x) => x.uuid === selectedObjects[0]);
        }

        // Send response over websocket
        socket.send(
            JSON.stringify({
                message: {
                    poll: currentPoll.type,
                    pollResponse: response,
                },
            }),
        );

        // Display "Response Submitted!"
        submitted = true;
    };

    const unsubmitPoll = function () {
        submitted = false;
    };

    // Un-submit the form when the instructor broadcasts a new
    // poll.
    $: unsubmitPoll(currentPoll);
</script>

{#if currentPoll && !isHost}
    <div class="card">
        <div class="card-body">
            {#if submitted}
                <p>Response submitted!</p>
                <p>
                    Your answer:
                    {#if currentPoll.type == 'select point'}
                        x: {response[0]}, y: {response[1]}, z: {response[2]}
                    {:else if currentPoll.type == 'select object'}
                        {response.kind}
                    {:else}
                        {response}
                    {/if}
                </p>

                <button class="btn btn-secondary" on:click={unsubmitPoll}>
                    Edit response
                </button>
            {:else}
                <form on:submit={handleOnSubmit}>
                    <div class="mb-3">
                        {currentPoll.prompt}
                    </div>

                    {#if currentPoll.type === 'numeric'}
                        <input
                            type="number"
                            step="0.01"
                            style="width: 100px;"
                            name="poll_response"
                            class="form-control form-control-sm mb-2"
                            required
                        />
                    {/if}

                    {#if currentPoll.choices}
                        {#each currentPoll.choices as choice}
                            <div class="form-check">
                                <label class="form-check-label">
                                    <input
                                        class="form-check-input"
                                        type="radio"
                                        id={`pollRadio-${choice}`}
                                        name="poll_response"
                                        value={choice}
                                        required
                                    />
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
