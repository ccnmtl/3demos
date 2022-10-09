import {forceNumber} from './utils.js';

const newPollId = function(polls) {
    return polls.length ? Math.max(...polls.map(p => p.id)) + 1 : 1;
}

const getPollId = function(urlpath) {
    let m = urlpath.match(/^\/?polls\/(\d+)\/?/);
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

    console.log('polls', polls);

    return poll;
};

/**
 * makeSocket
 *
 * Make a WebSocket with the given room name. Connects to a
 * django-channels socket backend. Returns this socket.
 */
const makeSocket = function(roomName) {
    const socket = new WebSocket(
        'ws://'
            + window.location.host
            + '/ws/polls/'
            + roomName
            + '/'
    );

    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('socket.onmessage', data);
    };

    socket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    return socket;
};

export {
    getPollId,
    makePoll, makeSocket
};
