<script>
    import {
        Button,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader
    } from 'sveltestrap';
    import {broadcastPoll} from './pollUtils';
    import {initialPolls} from './stores';

    export let isPollsOpen, togglePolls;
    export let socket;
    export let polls = initialPolls;

    const onClickBroadcast = function(e, poll) {
        // Send the given poll to session participants
        broadcastPoll(poll, socket);
    };

    const closePolls = function() {
        isPollsOpen = false;
    }
</script>

<Modal isOpen={isPollsOpen} toggle={togglePolls} size="lg">
    <ModalHeader toggle={togglePolls}>Polls</ModalHeader>
    <ModalBody>
        <ul>
            {#each polls as poll}
                <li>
                    <a href={`/polls/${poll.id}/`}>Poll {poll.id}</a> -
                    <strong>Prompts:</strong> {poll.prompt},

                    {#if poll.type === 0}
                        Numerical poll
                    {:else if poll.type === 1 && poll.choices}
                        {poll.choices.length} choices
                    {/if}

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        on:click={(e) => onClickBroadcast(e, poll)}>
                        Broadcast
                    </button>
                </li>
            {:else}
                No polls created!
            {/each}
        </ul>
    </ModalBody>

    <ModalFooter>
        <Button color="secondary" on:click={closePolls}>
            Cancel
        </Button>
    </ModalFooter>
</Modal>
