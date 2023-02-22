<script>
    import {
        Modal,
        ModalBody,
        ModalHeader,
        TabContent,
        TabPane
    } from 'sveltestrap';
    import PollResponses from './PollResponses.svelte';
    import PollForm from './PollForm.svelte';
    import {POLL_TYPES, Poll} from './Poll.js';
    import {broadcastPoll} from './pollUtils';
    import {querySelectorIncludesText} from '../utils';

    export let isPollsOpen, togglePolls;
    export let socket;
    export let polls = [
        new Poll(1, 'Question test', ['a', 'b', 'c']),
        new Poll(1, 'Question test 2', ['a', 'b', 'c', 'd']),
        new Poll(0, 'What is the square root of 2?')
    ];
    export let pollResponses;

    let currentPollType = null;
    let activeTab = 'polls';

    let isEditing = false;
    let editingPoll = null;

    const onClickEdit = function(e, p) {
        isEditing = true;
        editingPoll = p;
    };

    const onClickCancel = function(e) {
        e.preventDefault();
        isEditing = false;
    };

    const onSavePoll = function(e, pollObj) {
        e.preventDefault();
        polls = polls.map(p => p.id === pollObj.id ? pollObj : p);

        isEditing = false;
    };

    const onClickBroadcast = function(e, p) {
        currentPollType = p.type;

        // Clear current poll responses
        // This causes the weird property bug where currentPollType
        // is not updated.
        //pollResponses = [];

        // Send the given poll to session participants
        broadcastPoll(p, socket);

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
                    {#if isEditing}
                        <PollForm
                            poll={editingPoll}
                            onClickCancel={onClickCancel}
                            onSubmit={onSavePoll} />
                    {:else}
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">#</th>
                                    <th scope="col">Prompt</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="table-group-divider">
                                {#each polls as poll}
                                    <tr>
                                        <th scope="row">{poll.id}</th>
                                        <td>{poll.prompt}</td>
                                        <td>{POLL_TYPES[poll.type]}</td>
                                        <td>
                                            <button
                                                type="button"
                                                class="btn btn-secondary btn-sm"
                                                on:click={(e) => onClickEdit(e, poll)}>
                                                <i class="bi bi-pencil" /> Edit
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-primary btn-sm"
                                                on:click={(e) => onClickBroadcast(e, poll)}>
                                                <i class="bi bi-broadcast-pin" /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    {/if}
                </ul>
            </TabPane>
            <TabPane tabId="responses" tab="Responses"
                     active={activeTab === 'responses'}>
                <PollResponses bind:currentPollType bind:pollResponses />
            </TabPane>
        </TabContent>
    </ModalBody>
</Modal>
