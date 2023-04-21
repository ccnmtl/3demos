/**
 * Make a three.js object with the given parameters.
 *
 * Returns a new objects array.
 */
const makeObject = (
    uuid = null, thing = "box", params = null, objects = [], socket = null
) => {
    if (uuid === null) {
        uuid = crypto.randomUUID();
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
const removeObject = (uuid, objects, socket = null) => {
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
const updateObject = (updatedObject, objects, socket = null) => {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                updateObject: updatedObject
            }
        }));
    }

    // Replace old object with this uuid in place, not changing
    // array ordering as this will affect the form UI.
    return objects.map(b => {
        if (b.uuid !== updatedObject.uuid) {
            return b;
        } else {
            return updatedObject;
        }
    });
};


/**
 * Given a scene object (just an array of objects at the moment),
 * publish it to the given websocket.
 */
const publishScene = function (objects, socket = null) {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                publishScene: objects
            }
        }));
    }
};

const handleSceneEvent = function (data, objects) {
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
        } else if (data.message.publishScene) {
            objects = data.message.publishScene;
        }
    }

    return objects;
};

/**
 * Given the scene setup and a pointer/mouse event, return the notable
 * objects in the scene that intersect with this mouse event.
 */
const findPointerIntersects = function (objects, pointer, camera, raycaster) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, true);
    return intersects;
};

export {
    makeObject,
    removeObject,
    updateObject,
    publishScene,
    handleSceneEvent,
    findPointerIntersects
};
