/**
 * Send the given poll out to recipients via websocket.
 */
const broadcastPoll = function(poll, socket) {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                broadcastPoll: poll
            }
        }));
    }
};

/**
 * Handle poll events on session clients.
 */
const handlePollEvent = function(data) {
    if (data.message && data.message.broadcastPoll) {
        const poll = data.message.broadcastPoll;
        return poll;
    }

    return null;
};

export {
    broadcastPoll,
    handlePollEvent
};
