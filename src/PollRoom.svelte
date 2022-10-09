<script>
    import {getPollId} from './polls.js';
    import {polls} from './stores.js';

    const pollId = getPollId(window.location.pathname);
    const poll = $polls.find(x => x.id === pollId);
</script>

<h1>Poll {pollId}</h1>
{#if !poll}
    <p>Poll {pollId} is not defined!</p>
{/if}

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
