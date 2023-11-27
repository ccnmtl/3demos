<script>
    import { TabContent, TabPane } from 'sveltestrap';
    import PollResponses from './PollResponses.svelte';
    import PollForm from './PollForm.svelte';
    import { Poll, setIdCounter } from './Poll.js';
    import { broadcastPoll, loadPolls } from './utils';
    import { querySelectorIncludesText } from '../utils';

    export let socket;
    export let pollResponses;
    export let objectResponses;
    export let isPollsOpen;
    export let render;
    export let currentPoll;
    export let lockPoll;

    let polls = loadPolls();
    // Init empty polls to some basic examples
    if (polls && polls.length === 0) {
        polls = [
            new Poll('multiple choice', 'Question test', ['a', 'b', 'c']),
            new Poll('multiple choice', 'Question test 2', [
                'a',
                'b',
                'c',
                'd',
            ]),
            new Poll('numeric', 'What is the square root of 2?'),
            new Poll('select point', 'Select your favorite point.'),
            new Poll('select object', 'Select your favorite object.'),
        ];
    }

    // Reset new poll ids to highest id that exists in current polls
    // array, to prevent overlapping ids with new polls.
    const maxId = Math.max(...polls.map((p) => p.id));
    setIdCounter(maxId);

    let currentPollType = null;
    let activeTab = 'polls';

    let isEditing = false;
    let editingPoll = null;

    const onClickEdit = function (e, p) {
        isEditing = true;
        editingPoll = p;
    };

    const onClickCancel = function (e) {
        e.preventDefault();
        isEditing = false;
    };

    const onSavePoll = function (e, pollObj) {
        e.preventDefault();

        if (polls.some((x) => x.id === pollObj.id)) {
            // Update existing poll
            polls = polls.map((p) => (p.id === pollObj.id ? pollObj : p));
        } else {
            // Append new poll
            polls = [...polls, pollObj];
        }

        // Save to localStorage
        window.localStorage.setItem('polls', JSON.stringify(polls));

        isEditing = false;
    };

    const onDeletePoll = function (e, pollId) {
        e.preventDefault();
        polls = polls.filter((p) => p.id !== pollId);

        // Save to localStorage
        window.localStorage.setItem('polls', JSON.stringify(polls));

        isEditing = false;
    };

    const onClickBroadcast = function (e, p) {
        pollResponses = {};
        lockPoll = false;
        currentPoll = p;
        currentPollType = p.type;

        // Send the given poll to session participants
        broadcastPoll(p, socket);

        // Open responses pane
        if (currentPollType !== 'select point') {
            activeTab = 'responses';
        } else {
            isPollsOpen = false;
        }

        // Old-school workaround for sveltestrap bug:
        // https://github.com/bestguy/sveltestrap/issues/485
        const responsesEl = querySelectorIncludesText(
            '.polls-modal .nav-tabs a',
            'Responses'
        );
        responsesEl.click();
    };

    const onClickMakePoll = function () {
        editingPoll = new Poll('multiple choice', 'undefined', [
            'answer A',
            'answer B',
        ]);
        isEditing = true;
    };
</script>

<div class="polls-modal">
    <TabContent>
        <TabPane tabId="polls" tab="Polls" active={activeTab === 'polls'}>
            {#if isEditing}
                <PollForm
                    poll={editingPoll}
                    {onClickCancel}
                    onSubmit={onSavePoll}
                    {onDeletePoll}
                />
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
                                <td>{poll.type}</td>
                                <td style="white-space: nowrap;">
                                    <button
                                        type="button"
                                        class="btn btn-secondary btn-sm"
                                        title={`Edit poll ${poll.id}`}
                                        on:click={(e) => onClickEdit(e, poll)}
                                    >
                                        <i class="bi bi-pencil" /> Edit
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-primary btn-sm"
                                        title={`Broadcast poll ${poll.id}`}
                                        on:click={(e) =>
                                            onClickBroadcast(e, poll)}
                                    >
                                        <i class="bi bi-broadcast-pin" /> Broadcast
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <button
                    type="button"
                    title="Make new poll"
                    class="btn btn-primary btn-sm"
                    on:click={(e) => onClickMakePoll(e)}
                >
                    Make new poll
                </button>
            {/if}
        </TabPane>
        <TabPane
            tabId="responses"
            tab="Responses"
            active={activeTab === 'responses'}
        >
            <PollResponses
                role="host"
                bind:lockPoll
                {currentPoll}
                {currentPollType}
                {pollResponses}
                {socket}
                {objectResponses}
                {render}
            />
        </TabPane>
    </TabContent>
</div>
