const stringifyPoll = function(pollObj) {
    pollObj = Object.assign({}, pollObj);
    delete pollObj.id;

    return JSON.stringify(pollObj, null, 4);
};

/**
 * Load polls from localStorage.
 */
const loadPolls = function() {
    let polls = window.localStorage.getItem('polls');

    try {
        polls = JSON.parse(polls);
    } catch (e) {
        console.error('Error loading polls from localStorage:', e);
        polls = [];
    }

    return polls || [];
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
 * Send the given poll out to recipients via websocket.
 */
const showPollResults = function(results, pollType, socket, objects=null) {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                showPollResults: {
                    pollType: pollType,
                    results: results,
                    objects: objects
                }
            }
        }));
    }
};

const hidePollResults = function(socket) {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                hidePollResults: true
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
    stringifyPoll,
    loadPolls,
    broadcastPoll,
    showPollResults,
    hidePollResults,
    handlePollEvent
};
