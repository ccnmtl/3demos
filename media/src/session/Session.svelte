<script>
    import { preventDefault } from 'svelte/legacy';

    import Poll from '../polls/Poll.svelte';
    import PollResponses from '../polls/PollResponses.svelte';
    import Chatroom from './Chatroom.svelte';
    import { getRoomUrl } from '../utils.js';
    import { demoObjects } from '../stores';

    let {
        roomId,
        socket = $bindable(),
        isHost,
        currentPoll = $bindable(),
        chatBuffer,
        selectedPoint,
        selectedObjects,
        pollResponses
    } = $props();

    let role = $state('student');
    if (isHost) {
        role = 'host';
    }

    let joinRoomId = $state('');

    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    const onJoinRoom = (joinRoomId) => {
        window.location.href = getRoomUrl(joinRoomId);
    };
</script>

{#if roomId}
    <p>
        Connected to room <strong>{roomId}</strong> as {role}!

        <Chatroom {socket} {role} {chatBuffer} />

        {#if currentPoll}
            <Poll
                bind:currentPoll
                bind:socket
                {isHost}
                {selectedPoint}
                {selectedObjects}
            />
        {/if}

        {#if pollResponses && Object.keys(pollResponses).length > 0 && role === 'student'}
            <PollResponses
                {currentPoll}
                currentPollType={currentPoll.type}
                {role}
                {socket}
                {pollResponses}
            />
        {/if}
    </p>
{:else}
    <form
        onsubmit={preventDefault(() => onJoinRoom(joinRoomId))}
        class="mt-2 row row-cols-lg-auto align-items-center"
    >
        <div class="col-12">
            <input
                type="text"
                class="form-control form-control-sm"
                id="joinRoomId"
                placeholder="Room ID"
                bind:value={joinRoomId}
            />
        </div>
        <div class="col-12">
            <button
                type="submit"
                class={`btn btn-sm btn-primary ${joinRoomId ? '' : 'disabled'}`}
            >
                Join Room
            </button>
        </div>
    </form>

    <hr />

    <form method="post">
        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />

        <input
            type="hidden"
            name="objects"
            value={JSON.stringify($demoObjects)}
        />

        <button type="submit" class="btn btn-sm btn-primary">
            Make Room
        </button>
    </form>
{/if}
