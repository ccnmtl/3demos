import {forceNumber} from './utils.js';

const newPollId = function(polls) {
    return polls.length ? Math.max(...polls.map(p => p.id)) + 1 : 1;
}

const getRoomId = function(urlpath) {
    let m = urlpath.match(/^\/?rooms\/(\d+)\/?/);
    if (m && m.length > 1) {
        return forceNumber(m[1]);
    }

    return null;
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
 * makeSocket
 *
 * Make a WebSocket with the given room name. Connects to a
 * django-channels socket backend. Returns this socket.
 */
const makeSocket = function(roomId, handleMessage) {
    const path = 'wss://'
            + window.location.host
            + '/ws/rooms/'
            + roomId
          + '/';
    const socket = new WebSocket(path);

    socket.onmessage = handleMessage;

    socket.onclose = function() {
        console.error('Chat socket closed unexpectedly');
    };

    return socket;
};

export {
    getRoomId,
    makePoll, makeSocket
};
