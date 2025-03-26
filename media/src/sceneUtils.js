import { filterBang } from './utils';

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

    objects.push(newObject);
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

    filterBang((b) => b.uuid !== uuid, objects);
};

/**
 * Update the given object in the scene.
 *
 * Changes objects array in place.
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
    const index = objects.findIndex((b) => b.uuid === updatedObject.uuid);
    if (index > -1) {
        objects[index] = updatedObject;
    } else {
        objects.push(updatedObject);
    }
};


/**
 * Given a scene object (just an array of objects at the moment),
 * publish it to the given websocket.
 */
const publishScene = function (objects, selected, socket = null) {
    if (socket) {
        socket.send(JSON.stringify({
            message: {
                publishScene: objects,
                selected: selected
            }
        }));
    }
};

const handleSceneEvent = function (data, objects) {
    if (data.message) {
        if (data.message.newObject) {
            const newObject = data.message.newObject;
            makeObject(
                newObject.uuid,
                newObject.kind,
                newObject.params,
                objects);
        } else if (data.message.removeObject) {
            removeObject(data.message.removeObject.uuid, objects);
        } else if (data.message.updateObject) {
            updateObject(data.message.updateObject, objects);
        } else if (data.message.publishScene) {
            objects.splice(0, objects.length, ...data.message.publishScene);
        }
    }

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

/**
 * "Flash" the object by animating its color to opaque white and back.
 * @param {THREE.Object3D} mesh - THREE mesh object to be "flashed"
 * @param {function} render - function to render scene
 */
const flashDance = (mesh, render) => {
    // Check if already flashing
    if (mesh.flashFlag) return;
    mesh.flashFlag = true;

    const mat = mesh.material;
    const color = mat.color;
    if (!color) return;
    const newcol = {};
    color.getHSL(newcol);
    const oo = mat.opacity;
    let t = 0;
    let last = null;
    let req;
    let animate = (time) => {
        if (last === null) {
            t = 0;
        } else {
            t += (time - last) / 400;
        }
        const T = ((1 / 2 - Math.cos(2 * Math.PI * t) / 2) * 3) / 4;
        last = time;
        color.setHSL(newcol.h, newcol.s, (1 - T) * newcol.l + T);
        mat.opacity = (1 - T) * oo + T;
        if (t >= 1) {
            t = 0;
            last = null;
            mat.opacity = oo;
            color.setHSL(newcol.h, newcol.s, newcol.l);
            mesh.flashFlag = false;
        } else {
            cancelAnimationFrame(req);
            req = requestAnimationFrame(animate);
        }
        render();
    };

    requestAnimationFrame(animate);
};


export {
    makeObject,
    flashDance,
    removeObject,
    updateObject,
    publishScene,
    handleSceneEvent,
    findPointerIntersects
};
