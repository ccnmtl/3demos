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

    const newObject = { id: uuid, kind: thing, params: params };

    if (socket) {
        socket.send(JSON.stringify({
            message: {
                newObject: newObject
            }
        }));
    }

    return [...objects, newObject];
};

const removeObject = (id, objects) => {
    return objects.filter((b) => b.id !== id);
};

export {
    makeObject,
    removeObject
};
