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

/**
 * Update the given object in the scene.
 *
 * Returns a new objects array.
 */
const updateObject = (updatedObject, objects, socket=null) => {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                updateObject: updatedObject
            }
        }));
    }

    // Remove old object with this uuid
    objects = objects.filter((b) => b.uuid !== updatedObject.uuid);
    // Append updated object
    return [...objects, updatedObject];
};

const handleSceneEvent = function(data, objects) {
    if (data.message) {
        if (data.message.newObject) {
            const newObject = data.message.newObject;
            objects = makeObject(
                newObject.uuid,
                newObject.kind,
                newObject.params,
                objects);
        } else if (data.message.removeObject) {
            objects = removeObject(data.message.removeObject.uuid, objects);
        } else if (data.message.updateObject) {
            objects = updateObject(data.message.updateObject, objects);
        }
    }

    return objects;
};

export {
    makeObject,
    removeObject,
    updateObject,
    handleSceneEvent
};
