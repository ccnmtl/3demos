<script>
    //import {forceNumber} from './utils';

    export let currentPoll;
    export let socket;

    const handleOnSubmit = function(e) {
        e.preventDefault();
        let response = null;
        const responseEl =
            e.target.querySelectorAll('input[name="poll_response"]');
        if (responseEl.length > 1) {
            let i=0;
            while(!response && i < responseEl.length){
                if (responseEl[i].checked){
                    response = responseEl[i].value;
                } else {
                    i++;
                }
            }
        } else {
            response = responseEl[0].value;
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
