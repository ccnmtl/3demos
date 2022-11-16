<script>
    import {getRoomId, makeSocket} from './rooms.js';
    import {polls} from './stores.js';

    const roomId = getRoomId(window.location.pathname);
    const poll = $polls.find(x => x.id === roomId);

    const isInstructor = false;

    const socket = makeSocket(roomId);

    const handleOnSubmit = function() {
        const message = 'test message!';
        socket.send(JSON.stringify({
            'message': message
        }));
    }
</script>

<h1>Room {roomId}</h1>

{#if !isInstructor}
    Student view
<p>
    Prompt:
    {poll && poll.prompt}
</p>

<p>
    Choices:
</p>

<form on:submit|preventDefault={handleOnSubmit}>
    {#if poll}
        {#each poll.choices as choice}
            <div class="form-check">
                <label class="form-check-label">
                    <input class="form-check-input"
                           type="radio" name="poll_choice">
                    {choice}
                </label>
            </div>
        {/each}
    {/if}
    <button type="submit">Submit</button>
</form>
{:else}
    Instructor view

<p>
    Prompt:
    {poll && poll.prompt}
</p>

<p>
    Choices:
</p>

{#if poll}
    <ul>
        {#each poll.choices as choice}
            <li>{choice}</li>
        {/each}
    </ul>
{/if}

{/if}
