<script>
    import { onMount } from 'svelte';

    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { FontLoader } from 'three/addons/loaders/FontLoader.js';
    import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

    // import components
    import Panel from './Panel.svelte';
    import Settings from './settings/Settings.svelte';
    import Stats from 'stats.js';

    import { filterBang } from './utils';

    import { getRoomId, makeSocket } from './rooms';
    import {
        convertToURLParams,
        drawAxes,
        drawGrid,
        joinUrl,
        labelAxes,
        modFloor,
        scaleExp,
        processSearchEncoding,
    } from './utils';
    import {
        // removeObject,
        // updateObject,
        handleSceneEvent,
        findPointerIntersects,
    } from './sceneUtils';
    import { handlePollEvent } from './polls/utils';

    //import stores
    import { tickTock, viewScale } from './stores.js';

    let isMobileView = $state(false);

    // svelte-ignore non_reactive_update
    let debug = false;
    let stats;
    let panel = null;
    let showPanel = $state(true);

    let scaleAnimation = $state(false);
    let scaleUpdate = $state();
    let hoveredObject = $state();
    let selectedObjects = $derived(
        demoObjects.filter((obj) => obj.selected).map((obj) => obj.uuid),
    );

    $inspect(selectedObjects);

    // The demoObjects array store is the declarative data that the scene is based on.
    // import { demoObjects } from './stores.js';
    import { demoObjects } from './states.svelte';
    import { planckTemperatureDependencies } from 'mathjs';

    let gridMax = $state(1);
    let gridStep = $state(1 / 10);

    let currentMode = $state('how-to');
    let gridSetting = false;

    const urlParams = new URLSearchParams(
        processSearchEncoding(location.search),
    );
    if (urlParams.keys()) {
        const objectHolder = {};
        urlParams.forEach((val, key) => {
            // This is bad and stupid, and hopefully it will be done better.
            // make a viewStatus object, maybe?

            if (key === 'grid') {
                gridSetting = val === 'true';
            } else if (key === 'scale') {
                $viewScale = parseFloat(val);
                gridMax = scaleExp($viewScale);
                gridStep = gridMax / 10;
            } else if (key === 'debug') {
                debug = val === 'true';
                console.log('debuggery: ', debug);
            } else if (key.slice(0, 3) === 'obj') {
                // console.log('got an obj');
                const keyParts = key.split('_');
                const obj = objectHolder[keyParts[0]] || { params: {} };
                if (keyParts[1] === 'params') {
                    obj.params[keyParts[2]] = val;
                } else {
                    obj[keyParts[1]] =
                        val === 'false' ? false : val === 'true' ? true : val;
                }
                objectHolder[keyParts[0]] = obj;
            }
        });
        for (const val of Object.values(objectHolder)) {
            demoObjects.push({
                uuid: crypto.randomUUID(),
                animation: false,
                ...val,
            });

            if (debug) console.log(demoObjects);
        }
    }

    let canvas;
    let isPollsOpen = $state(false);

    let lockPoll = $state(false);
    let showPollResults = $state(false);

    const selectObject = (uuid, unique = true) => {
        const obj = demoObjects.find((o) => o.uuid === uuid);
        if (unique) {
            demoObjects.forEach((obj) => (obj.selected = false));
        }
        if (obj) obj.selected = !obj.selected;
    };

    const objectLoader = new THREE.ObjectLoader();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.001,
        1000,
    );
    const raycaster = new THREE.Raycaster();
    const pointerCoords = new THREE.Vector2();

    const camera2 = new THREE.OrthographicCamera(
        -2,
        2,
        (window.innerHeight / window.innerWidth) * 2,
        (-window.innerHeight / window.innerWidth) * 2,
        0,
        100 * 2,
    );

    let controls, controls2;
    let renderer;

    let orthoCamera = $state(false);

    let currentCamera = camera;
    // svelte-ignore non_reactive_update
    let currentControls = controls;

    $inspect(currentControls);

    const pi = Math.PI;

    // Make z the default up
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    camera.position.x = (gridMax * 2) / 2;
    camera.position.y = (-gridMax * 3) / 2;
    camera.position.z = (gridMax * 4.5) / 2;
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    camera2.position.copy(camera.position);
    camera2.up.set(0, 0, 1);
    camera2.lookAt(0, 0, 0);

    scene.background = new THREE.Color(0xddddef);
    // for greenscreen
    // scene.background = new THREE.Color(0x88ff88);

    // soft white light
    scene.add(new THREE.AmbientLight(0xa0a0a0, 1));
    // changes color from color selector

    //something to make shiny things shine - a chandelier
    const chandelier = new THREE.Object3D();
    const candles = 3;
    for (let i = 0; i < candles; i++) {
        for (let j = 0; j < 2; j++) {
            const light = new THREE.PointLight(0xffffff, 600, 1000);
            light.position.set(
                20 *
                    Math.cos(
                        (i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2,
                    ),
                20 *
                    Math.sin(
                        (i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2,
                    ),
                Math.pow(-1, j) * 10,
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
    let gridMeshes = drawGrid({ gridMax, gridStep, lineMaterial });
    gridMeshes.renderDepth = -1;
    gridMeshes.visible = gridSetting;
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
            gridMax,
            gridStep,
            render: requestFrameIfNotRequested,
        },
        fontLoader,
        TextGeometry,
    );

    // from https://threejs.org/manual/#en/responsive
    const resizeRendererToDisplaySize = function (renderer) {
        // const canvas = renderer.domElement;
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

        for (let index = 0; index < axesText.length; index++) {
            const element = axesText[index];
            element.lookAt(currentCamera.position);
        }

        currentControls?.update();
        renderer.render(scene, currentCamera);
        if (debug) {
            stats.end();
        }

        if (scaleAnimation || demoObjects.some((b) => b.animation)) {
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
            // const canvas = renderer.domElement;

            // camera2.top = canvas.clientHeight / 2;
            // camera2.bottom = canvas.clientHeight / -2;
            // camera2.right = canvas.clientWidth / 2;
            // camera2.left = canvas.clientWidth / -2;
            // camera2.updateProjectionMatrix();

            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
            setOrthoCamBox(
                camera2,
                camera,
                controls.target || { x: 0, y: 0, z: 0 },
            );
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

        // controls.addEventListener('change', requestFrameIfNotRequested);
        // controls2.addEventListener('change', requestFrameIfNotRequested);

        // resize();
        requestFrameIfNotRequested();

        return renderer;
    };

    // sceneObjects is the array of three.js objects present in the
    // scene. It's derived from the objects array, as a result of how
    // the data gets rendered by our svelte components
    let sceneObjects = [];

    let currentPoll = $state(null);
    let isHost = $state(false);

    let activeUserCount = $state(0);

    let host = null;

    if (window.SCENE_STATE && window.SCENE_STATE.objects) {
        demoObjects.splice(
            0,
            demoObjects.length,
            ...window.SCENE_STATE.objects,
        );
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
            demoObjects.length = 0;
        }
    };

    isMobileView = window.innerWidth < 768;
    window.addEventListener('resize', () => {
        requestFrameIfNotRequested();

        isMobileView = window.innerWidth < 768;
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
            selectObject(null);
        }

        e.preventDefault();

        pointerCoords.x = (e.offsetX / renderer.domElement.clientWidth) * 2 - 1;
        pointerCoords.y =
            -(e.offsetY / renderer.domElement.clientHeight) * 2 + 1;

        const intersects = findPointerIntersects(
            sceneObjects,
            pointerCoords,
            currentCamera,
            raycaster,
        );
        let nearestVisible = intersects.find(
            (intersect) =>
                intersect.object.visible && intersect.object.parent.visible,
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

        switchCamera();

        // stats window for debugging
        if (debug) {
            stats = new Stats();
            stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(stats.dom);
        }

        // If any of the loaded objects are currently animating, start
        // animation.
        if (demoObjects.some((b) => b.animation)) {
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

        // Handle double click on touch devices
        let lastTouchTime = null;
        let lastTouchX = null;
        let lastTouchY = null;
        renderer.domElement.addEventListener('touchstart', (e) => {
            const nowMS = Date.now();
            const touchX = e.changedTouches[0].clientX;
            const touchY = e.changedTouches[0].clientY;

            // Check if the user already tapped once in the last 300 ms
            // We also check the distance so two-finger-dragging doesn't trigger this
            if (
                lastTouchTime != null &&
                nowMS - lastTouchTime < 300 &&
                (touchX - lastTouchX) ** 2 + (touchY - lastTouchY) ** 2 < 100
            ) {
                lastTouchTime = null; // So we don't trigger this again if the user taps again immediately
                const event = {
                    // We can't just pass e.preventDefault as is because that throws Illegal invocation
                    preventDefault: () => {
                        e.preventDefault();
                    },
                    shiftKey: false,
                    offsetX: touchX,
                    offsetY: touchY,
                };
                onDblClick(event);
            } else {
                lastTouchTime = nowMS;
                lastTouchX = touchX;
                lastTouchY = touchY;
            }
        });

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
                    `3Demos-screencapture-${canvas.width}x${canvas.height}.png`,
                );
            });
        });
    });

    function setOrthoCamBox(cam2, cam, target) {
        const fov = cam.fov * (Math.PI / 180);
        const aspect = cam.aspect;
        const d = Math.hypot(
            target.x - cam.position.x,
            target.y - cam.position.y,
            target.z - cam.position.z,
        );

        const h = 2 * d * Math.tan(fov / 2);
        const w = h * aspect;

        cam2.left = -w / 2;
        cam2.right = w / 2;
        cam2.top = h / 2;
        cam2.bottom = -h / 2;
        cam2.updateProjectionMatrix();
    }

    // Try a sane transfer between cameras instead of turning listeners for the two controls on and off.
    function switchCamera(cam) {
        if (cam === 'ortho') {
            camera2.zoom = camera.zoom;
            camera2.position.copy(camera.position);
            controls2.target.copy(controls.target);
            setOrthoCamBox(camera2, camera, controls.target);

            controls2.enabled = true;
            controls2.addEventListener('change', requestFrameIfNotRequested);
            controls.enabled = false;
            controls.removeEventListener('change', requestFrameIfNotRequested);

            currentControls = controls2;
            currentCamera = camera2;
        } else {
            controls.target.copy(controls2.target);
            camera.position.copy(camera2.position);
            camera.zoom = camera2.zoom;

            camera.updateProjectionMatrix();

            controls.enabled = true;
            controls.addEventListener('change', requestFrameIfNotRequested);
            controls2.enabled = false;
            controls2.removeEventListener('change', requestFrameIfNotRequested);

            currentControls = controls;
            currentCamera = camera;
        }

        render();
    }

    let pollResponses = $state({});

    // The chat buffer: an array of objects.
    let chatBuffer = $state([]);
    const chatLineCount = 5;
    const pointGeometry = new THREE.SphereGeometry(0.2 / 8, 16, 16);
    const pollMaterial = new THREE.MeshLambertMaterial({
        color: 0xffff33,
        transparent: true,
        opacity: 0.5,
    });
    let objectResponses = $state();

    const makeQueryStringObject = function (args) {
        const flattenedObjects = {
            scale: $viewScale,
            showPanel,
            ...args,
        };
        window.location.search = btoa(
            convertToURLParams(flattenedObjects, demoObjects).toString(),
        );
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
                    results.objects,
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
            handleSceneEvent(data, demoObjects);
        }
    };

    let socket = $state(null);
    const router = {};
    const room = location.pathname.match(/\/rooms\/\d+\//);
    const roomId = getRoomId(window.location.pathname);

    if (room) {
        currentMode = 'session';
        router.room = true;
        socket = makeSocket(roomId, handleSocketMessage);
    }

    const keySelect = function (e, moveDown) {
        console.log('keyselect', selectedObjects);
        if (!demoObjects || selectedObjects.length === demoObjects.length) {
            return;
        } else if (selectedObjects.length === 0) {
            demoObjects[moveDown ? demoObjects.length - 1 : 0].selected = true;
        } else {
            const selectedIndex = demoObjects
                .map((x) => x.uuid)
                .indexOf(
                    selectedObjects[moveDown ? selectedObjects.length - 1 : 0],
                );
            const newIdx = modFloor(
                selectedIndex + (moveDown ? -1 : 1),
                demoObjects.length,
            );
            if (!e.shiftKey) selectObject(null);
            demoObjects[newIdx].selected = true;
        }
        render();
    };

    const keyDown = (e) => {
        console.log('App key down');

        if (e.target.matches('input, textarea')) {
            return;
        }
        switch (e.key) {
            case 'm':
                isMobileView = !isMobileView;
                break;
            case 'Escape':
                selectObject(null);
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
        <!-- In the mobile view, the logo is not part of the panel -->
        {#if isMobileView && showPanel}
            <a href="/" title="Home" class="demos-logo">
                <img
                    alt="3Demos logo"
                    src={joinUrl(window.STATIC_PREFIX, './3demos-logo.svg')}
                />
            </a>
        {/if}

        <Panel
            bind:this={panel}
            bind:debug
            bind:currentMode
            bind:gridStep
            bind:gridMax
            bind:chatBuffer
            bind:pollResponses
            bind:lockPoll
            bind:isPollsOpen
            {isMobileView}
            bind:showPanel
            {isHost}
            {blowUpObjects}
            {selectObject}
            {scene}
            {currentCamera}
            {currentControls}
            setTarget={(pt) => {
                currentControls.target.set(
                    pt.position.x,
                    pt.position.y,
                    pt.position.z,
                );
                render();
            }}
            {onRenderObject}
            {onDestroyObject}
            {requestFrameIfNotRequested}
            {socket}
            {animateIfNotAnimating}
            {roomId}
            {currentPoll}
            {objectResponses}
        />

        <canvas class="flex-grow-1" tabIndex="0" id="c" bind:this={canvas}
        ></canvas>

        <div class="settings-panel-box" class:mobile={isMobileView}>
            <Settings
                {isMobileView}
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
                bind:socket
                encode={makeQueryStringObject}
                render={requestFrameIfNotRequested}
                bind:update={scaleUpdate}
                bind:animation={scaleAnimation}
                {switchCamera}
                recenterCamera={() => {
                    currentControls.target.set(0, 0, 0);
                    render();
                }}
                animate={animateIfNotAnimating}
                {roomId}
            />
        </div>

        {#if roomId}
            <div
                class="active-users-count"
                title={activeUserCount + ' users in session'}
            >
                <i class="bi bi-person-fill"></i>
                {activeUserCount}
            </div>

            <a
                class="leave-room"
                href="/"
                title="Exit Room"
                aria-label="Room signout"
            >
                <i class="fa fa-sign-out"></i>
            </a>
        {/if}
    </div>

    {#if roomId}
        <div
            class="scene-overlay active-users-count"
            title={activeUserCount + ' users in session'}
        >
            <i class="bi bi-person-fill"></i>
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
        right: 0;
        z-index: 2;
    }

    .settings-panel-box:not(.mobile) {
        bottom: 0;
    }

    .demos-logo {
        position: absolute;
        top: 5px;
        left: 5px;
        z-index: 1;
    }

    .demos-logo img {
        height: 38px;
    }
</style>
