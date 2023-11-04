<script>
    import { onMount } from 'svelte';

    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
    import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

    // import components
    import Panel from './Panel.svelte';
    import Settings from './settings/Settings.svelte';
    import Stats from 'stats.js';

    import { getRoomId, makeSocket } from './rooms';
    import {
        convertToURLParams,
        drawAxes,
        drawGrid,
        labelAxes,
        modFloor,
    } from './utils';
    import {
        // removeObject,
        // updateObject,
        handleSceneEvent,
        findPointerIntersects,
    } from './sceneUtils';
    import { handlePollEvent } from './polls/utils';

    //import stores
    import { tickTock } from './stores.js';

    let debug = false;
    let stats;
    let panel = null;
    let showPanel = true;

    let scaleAnimation = false;
    let scaleUpdate;
    let selectedObjects = [];
    let hoveredObject = null;
    let selectedPoint = null;
    let lockPoll = false;

    let canvas;
    let isPollsOpen = false;

    let showPollResults = false;

    const selectObject = (uuid) => {
        if (uuid === null) {
            selectedObjects = [];
        } else {
            if (selectedObjects.includes(uuid)) {
                selectedObjects = selectedObjects.filter((obj) => obj !== uuid);
            } else {
                //Can't just push. Assignment needed to trigger dynamic update
                selectedObjects = selectedObjects.concat(uuid);
            }
        }

        render();
    };

    const objectLoader = new THREE.ObjectLoader();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.001,
        1000
    );
    const raycaster = new THREE.Raycaster();
    const pointerCoords = new THREE.Vector2();

    const camera2 = new THREE.OrthographicCamera(
        -2,
        2,
        (window.innerHeight / window.innerWidth) * 2,
        (-window.innerHeight / window.innerWidth) * 2,
        0,
        100 * 2
    );

    let controls, controls2;
    let renderer;

    let orthoCamera = false;

    $: currentCamera = orthoCamera ? camera2 : camera;
    $: currentControls = orthoCamera ? controls2 : controls;

    // Try a sane transfer between cameras instead of turning listeners for the two controls on and off.
    $: if (orthoCamera) {
        controls2?.target.copy(controls.target);
        controls2?.addEventListener('change', requestFrameIfNotRequested);

        controls?.removeEventListener('change', requestFrameIfNotRequested);
        camera2?.position.copy(camera.position);
        if (controls) {
            controls.enableDamping = false;
        }
    } else {
        controls?.target.copy(controls2.target);
        controls?.addEventListener('change', requestFrameIfNotRequested);

        controls2?.removeEventListener('change', requestFrameIfNotRequested);
        camera?.position.copy(camera2.position);
        if (controls) {
            controls.enableDamping = true;
        }
    }

    let gridMax = 1,
        gridStep = 1 / 5;
    const pi = Math.PI;

    // Make z the default up
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    camera.position.x = (gridMax * 2) / 2;
    camera.position.y = (-gridMax * 3) / 2;
    camera.position.z = (gridMax * 4.5) / 2;
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    camera2.position.x = (gridMax * 2) / 2;
    camera2.position.y = (-gridMax * 3) / 2;
    camera2.position.z = (gridMax * 4.5) / 2;
    camera2.up.set(0, 0, 1);
    camera2.lookAt(0, 0, 0);

    scene.background = new THREE.Color(0xddddef);
    // for greenscreen
    // scene.background = new THREE.Color(0x88ff88);

    // soft white light
    scene.add(new THREE.AmbientLight(0xa0a0a0));

    //something to make shiny things shine - a chandelier
    const chandelier = new THREE.Object3D();
    const candles = 3;
    for (let i = 0; i < candles; i++) {
        for (let j = 0; j < 2; j++) {
            const light = new THREE.PointLight(0xffffff, 0.5, 1000);
            light.position.set(
                20 *
                    Math.cos(
                        (i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2
                    ),
                20 *
                    Math.sin(
                        (i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2
                    ),
                Math.pow(-1, j) * 10
            );
            chandelier.add(light);
        }
    }
    scene.add(chandelier);

    let frameRequested = false;

    // Grid
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x551122,
        transparent: true,
        opacity: 1,
        depthTest: true,
    });

    // Make xy grid lines (off by default).
    let gridMeshes = drawGrid({ lineMaterial });
    gridMeshes.renderDepth = -1;
    gridMeshes.visible = false;
    scene.add(gridMeshes);

    // Axes
    const axesMaterial = new THREE.MeshLambertMaterial({ color: 0x320032 });
    let axesHolder = drawAxes({ gridMax, gridStep, axesMaterial });
    scene.add(axesHolder);

    const requestFrameIfNotRequested = function () {
        if (!frameRequested) {
            frameRequested = true;
            myReq = requestAnimationFrame(render);
        }
    };

    // Fonts
    const fontLoader = new FontLoader();
    let [axesText] = labelAxes(
        {
            scene,
            render: requestFrameIfNotRequested,
        },
        fontLoader,
        TextGeometry
    );

    // from https://threejs.org/manual/#en/responsive
    const resizeRendererToDisplaySize = function (renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    };

    let myReq,
        last,
        animating = false;

    const animateIfNotAnimating = function () {
        if (!animating) {
            cancelAnimationFrame(myReq);
            frameRequested = true;
            myReq = requestAnimationFrame(animate);
            animating = true;
        }
    };

    const animate = (time = 0) => {
        if (debug) {
            stats.begin();
        }

        if (!last) last = time;

        const dt = (time - last) / 1000;
        last = time;

        // FYI, the linter doesn't like +=
        $tickTock = $tickTock + dt;

        if (scaleAnimation) {
            scaleUpdate(dt);
        }

        currentControls?.update();
        renderer.render(scene, currentCamera);
        if (debug) {
            stats.end();
        }

        if (scaleAnimation || objects.some((b) => b.animation)) {
            myReq = requestAnimationFrame(animate);
            frameRequested = true;
            animating = true;
        } else {
            cancelAnimationFrame(myReq);
            frameRequested = false;
            animating = false;
            last = false;
        }
    };

    const render = function () {
        frameRequested = false;

        for (let index = 0; index < axesText.length; index++) {
            const element = axesText[index];
            element.lookAt(currentCamera.position);
        }

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            if (orthoCamera) {
                currentCamera.top = canvas.clientHeight / 2;
                currentCamera.bottom = canvas.clientHeight / -2;
                currentCamera.right = canvas.clientWidth / 2;
                currentCamera.left = canvas.clientWidth / -2;
            } else {
                currentCamera.aspect = canvas.clientWidth / canvas.clientHeight;
            }
            currentCamera.updateProjectionMatrix();
        }

        currentControls?.update();
        renderer.render(scene, currentCamera);
    };

    /**
     * Create the three.js scene. Returns the three.js renderer.
     */
    const createScene = (el) => {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: el,
        });

        // https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
        renderer.useLegacyLights = true;

        controls = new OrbitControls(camera, el);
        controls2 = new OrbitControls(camera2, el);

        // Enable camera keyboard controls
        controls.listenToKeyEvents(el);
        controls2.listenToKeyEvents(el);

        controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
        controls.dampingFactor = 0.05;

        controls.screenSpacePanning = false;

        controls.maxPolarAngle = Math.PI;
        controls2.maxPolarAngle = Math.PI;

        controls.addEventListener('change', requestFrameIfNotRequested);
        // controls2.addEventListener('change', requestFrameIfNotRequested);

        // resize();
        requestFrameIfNotRequested();

        return renderer;
    };

    // The objects array is the declarative data that the scene is based on.
    export let objects = [];

    // sceneObjects is the array of three.js objects present in the
    // scene. It's derived from the objects array, as a result of how
    // the data gets rendered by our svelte components
    let sceneObjects = [];

    export let currentPoll = null;
    export let isHost = false;
    let activeUserCount = 0;

    let host = null;

    if (window.SCENE_STATE && window.SCENE_STATE.objects) {
        objects = window.SCENE_STATE.objects;
    }

    if (window.SCENE_STATE && window.SCENE_STATE.poll) {
        currentPoll = window.SCENE_STATE.poll;
    }

    if (window.SCENE_STATE && window.SCENE_STATE.host) {
        host = window.SCENE_STATE.host;
    }

    if (host && window.SESSION_KEY && host === window.SESSION_KEY) {
        isHost = true;
    }

    export const blowUpObjects = () => {
        if (confirm('Remove all objects in the scene?')) {
            objects = [];
            selectedObjects = [];
        }
    };

    window.addEventListener('resize', () => {
        requestFrameIfNotRequested();
    });

    /**
     * onRenderObject
     *
     * This callback is intended to be called when the svelte
     * component's three.js object is rendered. This function takes a
     * variable number of visible instances of THREE.Mesh or THREE.Group.
     */
    const onRenderObject = function (...meshes) {
        for (let mesh of meshes) {
            // Remove this object if it exists.
            if (sceneObjects.some((x) => x.uuid === mesh.uuid)) {
                sceneObjects = sceneObjects.filter((x) => x.uuid !== mesh.uuid);
            }

            sceneObjects.push(mesh);
        }
    };

    /**
     * Given a parent three.js object, remove it from the sceneObjects
     * array. This is intended to be called when the svelte component
     * is destroyed.
     */
    const onDestroyObject = function (...meshes) {
        for (let mesh of meshes) {
            sceneObjects = sceneObjects.filter((x) => x.uuid !== mesh.uuid);
        }
    };

    // const onPointerMove = function (e, renderer) {
    //     e.preventDefault();

    //     pointerCoords.x = (e.offsetX / renderer.domElement.clientWidth) * 2 - 1;
    //     pointerCoords.y =
    //         -(e.offsetY / renderer.domElement.clientHeight) * 2 + 1;

    //     const intersects = findPointerIntersects(
    //         sceneObjects,
    //         pointerCoords,
    //         currentCamera,
    //         raycaster
    //     );
    //     let nearestVisible = intersects.find(
    //         (intersect) =>
    //             intersect.object.visible && intersect.object.parent.visible
    //     );
    //     if (nearestVisible) {
    //         let obj = nearestVisible.object;
    //         let uuid = obj.name || obj.parent.name;
    //         if (uuid) {
    //             document.body.style.cursor = 'pointer';
    //             hoveredObject = uuid;
    //         }
    //     } else {
    //         document.body.style.cursor = 'auto';
    //         hoveredObject = null;
    //     }
    // };

    const onDblClick = function (e) {
        if (!e.shiftKey) {
            selectedObjects = [];
        }

        e.preventDefault();

        pointerCoords.x = (e.offsetX / renderer.domElement.clientWidth) * 2 - 1;
        pointerCoords.y =
            -(e.offsetY / renderer.domElement.clientHeight) * 2 + 1;

        const intersects = findPointerIntersects(
            sceneObjects,
            pointerCoords,
            currentCamera,
            raycaster
        );
        let nearestVisible = intersects.find(
            (intersect) =>
                intersect.object.visible && intersect.object.parent.visible
        );
        if (nearestVisible) {
            let obj = nearestVisible.object;
            let uuid = obj.name || obj.parent.name;
            if (uuid) {
                // document.body.style.cursor = 'pointer';
                hoveredObject = uuid;
            }
        } else {
            document.body.style.cursor = 'auto';
            hoveredObject = null;
        }

        selectObject(hoveredObject);
    };

    onMount(() => {
        const renderer = createScene(canvas);

        // stats window for debugging
        if (debug) {
            stats = new Stats();
            stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(stats.dom);
        }

        // If any of the loaded objects are currently animating, start
        // animation.
        if (objects.some((b) => b.animation)) {
            // Do initial render to set canvas size correctly.
            render();
            // Start animation
            animateIfNotAnimating();
        }

        // renderer.domElement.addEventListener('pointermove', (e) =>
        //     onPointerMove(e, renderer)
        // );
        // renderer.domElement.addEventListener('pointerleave', () => {
        //     // Reset cursor to default: let the browser take over
        //     // styling here.
        //     document.body.style.cursor = 'auto';
        // });
        renderer.domElement.addEventListener('dblclick', onDblClick);
        objectResponses = new THREE.Group();
        scene.add(objectResponses);

        // probably a stackexchange snippet, lost the reference
        const saveBlob = (function () {
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            return function saveData(blob, fileName) {
                const url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                a.click();
            };
        })();

        const elem = document.querySelector('#screenshot');
        elem.addEventListener('click', () => {
            renderer.render(scene, camera);
            canvas.toBlob((blob) => {
                saveBlob(
                    blob,
                    `screencapture-${canvas.width}x${canvas.height}.png`
                );
            });
        });
    });

    let currentChapter = 'How To';
    let currentMode = 'how-to';

    let pollResponses = {};

    // The chat buffer: an array of objects.
    let chatBuffer = [];
    const chatLineCount = 5;
    const pointGeometry = new THREE.SphereGeometry(0.2 / 8, 16, 16);
    const pollMaterial = new THREE.MeshLambertMaterial({
        color: 0xffff33,
        transparent: true,
        opacity: 0.5,
    });
    let objectResponses;

    const makeQueryStringObject = function () {
        const flattenedObjects = {
            currentChapter,
            showPanel,
        };
        if (gridMeshes.visible) {
            flattenedObjects['grid'] = true;
        }
        window.location.search = convertToURLParams(
            flattenedObjects,
            objects
        ).toString();
    };

    const handleSocketMessage = function (e) {
        const data = JSON.parse(e.data);
        if (data.message.chatMessage) {
            if (data.message.chatMessage.text) {
                if (chatBuffer.length >= chatLineCount) {
                    // Remove first item of chat buffer if it's full.
                    chatBuffer.shift();
                }
                chatBuffer = [...chatBuffer, data.message.chatMessage];
            }
        } else if (
            data.message.pollResponse &&
            // Show if I am the host, or I am a client with showPollResults
            (isHost || showPollResults)
        ) {
            const sessionKey = data.message.session_key;
            if (!(lockPoll && pollResponses[sessionKey])) {
                if (data.message.poll === 'select point') {
                    if (pollResponses[sessionKey]) {
                        objectResponses.remove(pollResponses[sessionKey]);
                    }
                    isPollsOpen = false;
                    let xyz = data.message.pollResponse;
                    let response = new THREE.Mesh(pointGeometry, pollMaterial);
                    pollResponses[sessionKey] = response;
                    response.position.set(xyz[0], xyz[1], xyz[2]);
                    objectResponses.add(response);
                    render();
                } else {
                    pollResponses[sessionKey] = data.message.pollResponse;
                }
            }
        } else if (data.message.broadcastPoll) {
            currentPoll = handlePollEvent(data);

            // Clear user's poll responses when a new poll is broadcast.
            pollResponses = {};

            if (panel) {
                // When user receives a poll, display the appropriate
                // panel view so they can see it.
                panel.showMainPanelItem();
            }
        } else if (data.message.showPollResults) {
            showPollResults = true;
            const results = data.message.showPollResults;
            pollResponses = results.results;

            if (results && results.objects !== null) {
                objectResponses.clear();
                objectResponses.children = objectLoader.parse(
                    results.objects
                ).children;
                render();
            }

            if (panel) {
                // When user receives pollResults broadcast, display the
                // appropriate panel view so they can see it.
                panel.showMainPanelItem();
            }
        } else if (data.message.hidePollResults) {
            showPollResults = false;
            pollResponses = null;
        } else if (data.message.updateActiveUsers) {
            if (typeof data.message.updateActiveUsers === 'number') {
                activeUserCount = data.message.updateActiveUsers;
            }
        } else {
            objects = handleSceneEvent(data, objects);
        }
    };

    let socket = null;
    const router = {};
    const room = location.pathname.match(/\/rooms\/\d+\//);
    let roomId = null;

    if (room) {
        currentMode = 'session';
        router.room = true;
        roomId = getRoomId(window.location.pathname);
        socket = makeSocket(roomId, handleSocketMessage);
    }

    const keySelect = function (e, moveDown) {
        if (!objects) {
            return;
        } else if (selectedObjects.length === 0) {
            selectedObjects = [objects[moveDown ? objects.length - 1 : 0].uuid];
        } else if (selectedObjects.length === objects.length) {
            return;
        } else {
            const selectedIndex = objects
                .map((x) => x.uuid)
                .indexOf(
                    selectedObjects[moveDown ? selectedObjects.length - 1 : 0]
                );
            const newIdx = modFloor(
                selectedIndex + (moveDown ? -1 : 1),
                objects.length
            );
            if (e.shiftKey) {
                selectedObjects = moveDown
                    ? selectedObjects.concat([objects[newIdx].uuid])
                    : [objects[newIdx].uuid].concat(selectedObjects);
            } else {
                selectedObjects = [objects[newIdx].uuid];
            }
        }
        render();
    };

    const keyDown = (e) => {
        if (e.target.matches('input')) {
            return;
        }
        switch (e.key) {
            case 'Escape':
                selectedObjects = [];
                render();
                break;
            case '[':
                keySelect(e, true);
                break;
            case '{':
                keySelect(e, true);
                break;
            case ']':
                keySelect(e, false);
                break;
            case '}':
                keySelect(e, false);
                break;
            case '1':
                document.getElementById('info').focus();
                break;
            case '2':
                if (currentMode === 'session' && isHost) {
                    document.getElementById('polls').focus();
                }
                break;
            case '3':
                document.getElementById('objects').focus();
                break;
            case '4':
                document.getElementById('settings').focus();
                break;
            case '5':
                document.getElementById('encodeURL').focus();
                break;
            case '6':
                document.getElementById('upload').focus();
                break;
            case '7':
                document.getElementById('download').focus();
                break;
            case '8':
                document.getElementById('cameraReset').focus();
                break;
            case '9':
                document.getElementById('screenshot').focus();
                break;
        }
    };
    window.addEventListener('keydown', keyDown, false);
</script>

<main>
    <div class="d-flex demos-mainview">
        <Panel
            bind:this={panel}
            bind:debug
            bind:currentMode
            bind:objects
            bind:currentChapter
            bind:gridMeshes
            bind:gridStep
            bind:gridMax
            bind:chatBuffer
            bind:pollResponses
            bind:lockPoll
            bind:selectedObjects
            bind:selectedPoint
            bind:isPollsOpen
            bind:showPanel
            {isHost}
            {blowUpObjects}
            {selectObject}
            {scene}
            {onRenderObject}
            {onDestroyObject}
            {currentCamera}
            {currentControls}
            {requestFrameIfNotRequested}
            {socket}
            {animateIfNotAnimating}
            {roomId}
            {currentPoll}
            {objectResponses}
        />

        <canvas class="flex-grow-1" tabIndex="0" id="c" bind:this={canvas} />

        <div class="settings-panel-box">
            <Settings
                {scene}
                {camera}
                controls={currentControls}
                bind:gridMax
                bind:gridStep
                {gridMeshes}
                {axesText}
                {axesHolder}
                {lineMaterial}
                {axesMaterial}
                bind:objects
                bind:socket
                encode={makeQueryStringObject}
                render={requestFrameIfNotRequested}
                bind:update={scaleUpdate}
                bind:animation={scaleAnimation}
                bind:orthoCamera
                on:animate={animateIfNotAnimating}
                {roomId}
            />
        </div>

        {#if roomId}
            <div
                class="active-users-count"
                title={activeUserCount + ' users in session'}
            >
                <i class="bi bi-person-fill" />
                {activeUserCount}
            </div>

            <a class="leave-room" href="/" title="Exit Room">
                <i class="fa fa-sign-out" />
            </a>
        {/if}
    </div>

    {#if roomId}
        <div
            class="scene-overlay active-users-count"
            title={activeUserCount + ' users in session'}
        >
            <i class="bi bi-person-fill" />
            {activeUserCount}
        </div>
    {/if}
</main>

<style>
    /* App takes up full height of screen. */
    .demos-mainview {
        height: 100vh;
    }

    canvas#c {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin: 0;
    }

    .scene-overlay {
        position: absolute;
        color: white;
        background-color: rgba(0, 0, 0, 0.6);
        border: 1px solid black;
        border-radius: 0.5em;
        padding: 5px;
    }

    .active-users-count {
        top: 10px;
        right: 10px;
    }

    .leave-room {
        bottom: 10px;
        right: 10px;
    }

    .settings-panel-box {
        position: fixed;
        bottom: 0;
        right: 0;
        z-index: 2;
    }
</style>
