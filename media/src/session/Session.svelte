<script>
    import Poll from '../polls/Poll.svelte';
    import PollResponses from '../polls/PollResponses.svelte';
    import Chatroom from './Chatroom.svelte';
    import {getRoomUrl} from '../utils.js';

    export let roomId;
    export let socket;
    export let isHost;
    export let currentPoll;
    export let objects;
    export let chatBuffer;
    export let selectedPoint;
    export let selectedObjects;
    export let pollResponses;

    let role = 'student';
    if (isHost) {
        role = 'host';
    }

    let joinRoomId = '';

    const csrfToken = document.querySelector(
        'meta[name="csrf-token"]').content;

    const onJoinRoom = (joinRoomId) => {
        window.location.href = getRoomUrl(joinRoomId);
    };
</script>

{#if roomId}
<p>
    Connected to room <strong>{roomId}</strong> as {role}!

    <Chatroom {socket} {role} {chatBuffer} />

    {#if currentPoll}
        <Poll bind:currentPoll bind:socket {isHost} {selectedPoint} {objects} {selectedObjects}/>
    {/if}

    {#if pollResponses && Object.keys(pollResponses).length > 0 &&
        role === 'student'}
        <PollResponses
            currentPollType={currentPoll.type}
            {objects}
            {role}
            {socket}
            {pollResponses}
            />
    {/if}
</p>
{:else}
    <form on:submit|preventDefault={() => onJoinRoom(joinRoomId)}
        class="mt-2 row row-cols-lg-auto align-items-center">
        <div class="col-12">
            <input type="text" class="form-control form-control-sm" id="joinRoomId"
                   placeholder="Room ID"
                   bind:value={joinRoomId} />
        </div>
        <div class="col-12">
            <button
                type="submit"
                class={`btn btn-sm btn-primary ${joinRoomId ? '' : 'disabled'}`}>
                Join Room
            </button>
        </div>
    </form>

    <hr />

    <form method="post">
        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />

        <input type="hidden" name="objects" value={JSON.stringify(objects)} />

        <button type="submit" class="btn btn-sm btn-primary">
            Make Room
        </button>
    </form>
{/if}
