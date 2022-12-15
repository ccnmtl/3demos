<script>
    import {
        Modal,
        ModalBody,
        ModalHeader,
        TabContent,
        TabPane
    } from 'sveltestrap';
    import PollResponses from './PollResponses.svelte';
    import {broadcastPoll} from './pollUtils';
    import {initialPolls} from '../stores';
    import {querySelectorIncludesText} from '../utils';

    export let isPollsOpen, togglePolls;
    export let socket;
    export let polls = initialPolls;
    export let pollResponses;

    let activeTab = 'polls';

    const onClickBroadcast = function(e, poll) {
        // Clear current poll responses
        pollResponses = [];

        // Send the given poll to session participants
        broadcastPoll(poll, socket);

        // Open responses pane
        activeTab = 'responses';

        // Old-school workaround for sveltestrap bug:
        // https://github.com/bestguy/sveltestrap/issues/485
        const responsesEl = querySelectorIncludesText(
            '.polls-modal .nav-tabs a', 'Responses');
        responsesEl.click();
    };
</script>

<Modal isOpen={isPollsOpen} toggle={togglePolls} size="lg">
    <ModalHeader toggle={togglePolls}>Polls</ModalHeader>
    <ModalBody class="polls-modal">
        <TabContent>
            <TabPane tabId="polls" tab="Polls"
                     active={activeTab === 'polls'}>
                <ul>
                    {#each polls as poll}
                        <li>
                            <a href={`/polls/${poll.id}/`}>Poll {poll.id}</a> -
                            <strong>Prompt:</strong> {poll.prompt},

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
            </TabPane>
            <TabPane tabId="responses" tab="Responses"
                     active={activeTab === 'responses'}>
                <PollResponses bind:pollResponses />
            </TabPane>
        </TabContent>
    </ModalBody>
</Modal>
