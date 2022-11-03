import { v4 as uuidv4 } from 'uuid';

/**
 * Make a three.js object with the given parameters.
 *
 * Returns a new objects array.
 */
const makeObject = (
    uuid=null, thing="box", params=null, objects=[], socket=null
) => {
    if (uuid === null) {
        uuid = uuidv4();
    }

    const newObject = { uuid: uuid, kind: thing, params: params };

    if (socket) {
        socket.send(JSON.stringify({
            message: {
                newObject: newObject
            }
        }));
    }

    return [...objects, newObject];
};

/**
 * Remove the object with the given ID from the scene.
 *
 * Returns a new objects array.
 */
const removeObject = (uuid, objects, socket=null) => {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                removeObject: {
                    uuid: uuid
                }
            }
        }));
    }

    return objects.filter((b) => b.uuid !== uuid);
};

export {
    makeObject,
    removeObject
};
