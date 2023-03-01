import {forceNumber} from './utils.js';
import ReconnectingWebSocket from 'reconnecting-websocket';

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
    const socket = new ReconnectingWebSocket(path);

    if (handleMessage) {
        socket.onmessage = handleMessage;
    }

    return socket;
};

export {
    getRoomId,
    makeSocket
};
