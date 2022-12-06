const newPollId = function(polls) {
    return polls.length ? Math.max(...polls.map(p => p.id)) + 1 : 1;
};

/**
 * makePoll
 *
 * Make a poll and add it to the store of polls, given the
 * parameters. Do validation as necessary.
 *
 * Returns the new Poll object, or throws an error if validation fails.
 */
const makePoll = function(polls, type=0, prompt='', choices=null) {
    const id = newPollId(polls);

    const poll = {
        id: id,
        type: type,
        prompt: prompt,
        choices: choices
    };

    return poll;
};

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
    makePoll,
    broadcastPoll,
    handlePollEvent
};
