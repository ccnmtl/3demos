<script>
    export let socket;
    export let role;
    export let chatBuffer;

    let currentMsg = '';

    /**
     * Send a chat message over WebSocket.
     */
    const sendChatMessage = function(socket, msg) {
        if (socket) {
            socket.send(JSON.stringify({
                message: {
                    chatMessage: msg
                }
            }));
        }
    };

    /**
     * Handle event when a user submits a chat message.
     */
    const onSubmitChat = function(e) {
        e.preventDefault();

        if (!currentMsg) {
            return;
        }

        const newMsg = {
            text: currentMsg,
            timestamp: Date.now()
        };

        if (chatBuffer.length >= 5) {
            // Remove first item of chat buffer if it's full.
            chatBuffer.shift();
        }

        chatBuffer = [...chatBuffer, newMsg];
        sendChatMessage(socket, newMsg);

        currentMsg = '';
    };
</script>

{#if chatBuffer.length > 0}
    <div class="messagelist border rounded">
        {#each chatBuffer as chatLine}
            <div class="messagelist-item">
                <i class="bi bi-caret-right-fill"></i>
                {chatLine.text}
            </div>
        {/each}
    </div>
{/if}

{#if role === 'student'}
    <form on:submit={onSubmitChat}>
        <div class="input-group mt-1">
            <input type="text"
                   class="form-control form-control-sm"
                   name="chat-message"
                   placeholder="Chat message"
                   aria-label="Chat message"
                   aria-describedby="send-chat-btn"
                   autocomplete="off"
                   bind:value={currentMsg} />
            <button class="btn btn-primary btn-sm"
                    type="submit"
                    id="send-chat-btn">
                Send
            </button>
        </div>
    </form>
{/if}

<style>
    .messagelist {
        padding: 0.5em;
    }

    .messagelist .messagelist-item {
        /* Some basic length limits on text display here */
        max-height: 8em;
        overflow: hidden;
        text-overflow: ellipsis;
        word-wrap: break-word;
    }
</style>
