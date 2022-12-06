<script>
    export let currentPoll;
</script>

{#if currentPoll}
    <div class="card">
        <div class="card-body">
            <form>
                <div class="mb-3">
                    {currentPoll.prompt}
                </div>

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

                <button type="submit" class="btn btn-primary">
                    Submit
                </button>
            </form>
        </div>
    </div>
{/if}
