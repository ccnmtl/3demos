import {forceNumber} from './utils.js';

const getRoomId = function(urlpath) {
    let m = urlpath.match(/^\/?rooms\/(\d+)\/?/);
    if (m && m.length > 1) {
        return forceNumber(m[1]);
    }

    return null;
};

/**
 * makeSocket
 *
 * Make a WebSocket with the given room name. Connects to a
 * django-channels socket backend. Returns this socket.
 */
const makeSocket = function(roomId, handleMessage=null) {
    const path = 'wss://'
            + window.location.host
            + '/ws/rooms/'
            + roomId
          + '/';
    const socket = new WebSocket(path);

    if (handleMessage) {
        socket.onmessage = handleMessage;
    }

    socket.onclose = function() {
        console.error('Chat socket closed unexpectedly');
    };

    return socket;
};

const setHost = (socket=null) => {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                setHost: true
            }
        }));
    }
};

export {
    getRoomId,
    makeSocket,
    setHost
};
