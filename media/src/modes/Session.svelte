<script>
    import Poll from '../polls/Poll.svelte';
    import {getRoomUrl} from '../utils.js';
    import {makeSocket, setHost} from '../rooms';

    export let roomId;
    export let socket;
    export let isHost;
    export let currentPoll;

    let role = 'student';
    if (isHost) {
        role = 'host';
    }

    let joinRoomId = '';

    const onJoinRoom = (joinRoomId) => {
        window.location.href = getRoomUrl(joinRoomId);
    };

    const onMakeRoom = () => {
        // Generate random room ID between 1 and 100
        const newRoomId = Math.round(Math.random() * 100) + 1;

        socket = makeSocket(newRoomId);
        // Need to wait for socket's readyState to be open
        // to send messages.
        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
        socket.addEventListener('open', () => {
            // Become the host of this new room.
            setHost(socket);
            window.location.href = getRoomUrl(newRoomId);
        });
    };
</script>

{#if roomId}
<p>
    Connected to room <strong>{roomId}</strong> as {role}!

    {#if currentPoll}
        <Poll bind:currentPoll bind:socket />
    {/if}
</p>
{:else}
    <form on:submit|preventDefault={() => onJoinRoom(joinRoomId)}
        class="row row-cols-lg-auto align-items-center">
        <div class="col-12">
            <input type="text" class="form-control" id="joinRoomId"
                   placeholder="Room ID"
                   bind:value={joinRoomId} />
        </div>
        <div class="col-12">
            <button
                type="submit"
                class={`btn btn-primary ${joinRoomId ? '' : 'disabled'}`}>
                Join Room
            </button>
        </div>
    </form>

    <hr />

    <button
        type="button" class="btn btn-primary"
        on:click={onMakeRoom}>
        Make Room
    </button>
{/if}
