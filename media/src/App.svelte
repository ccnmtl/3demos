<script>
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
    import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

    import {
        Button,
        ButtonDropdown,
        DropdownItem,
        DropdownMenu,
        DropdownToggle,
    } from 'sveltestrap';

    // import components
    import M from './M.svelte';
    import ParSurf from './objects/ParSurf.svelte';
    import Level from './objects/Level.svelte';
    import Curve from './objects/Curve.svelte';
    import Field from './objects/Field.svelte';
    import Function from './objects/Function.svelte';
    import Vector from './objects/Vector.svelte';
    import Point from './objects/Point.svelte';
    import Settings from './settings/Settings.svelte';

    const kindToComponent = {
        point: Point,
        vector: Vector,
        field: Field,
        graph: Function,
        curve: Curve,
        level: Level,
        parsurf: ParSurf,
    };

    import Stats from 'stats.js';

    import Linear from './Linear.svelte';
    import Chapter from './Chapter.svelte';
    import Intro from './Intro.svelte';
    import Session from './modes/Session.svelte';
    import KeyboardControls from './KeyboardControls.svelte';

    import { getRoomId, makeSocket } from './rooms';
    import {
        drawAxes,
        drawGrid,
        labelAxes,
        makeHSLColor,
        convertToURLParams,
        modFloor,
    } from './utils';
    import {
        makeObject,
        // removeObject,
        // updateObject,
        publishScene,
        handleSceneEvent,
        findPointerIntersects,
    } from './sceneUtils';
    import { handlePollEvent } from './polls/utils';

    //import stores
    import { tickTock } from './stores.js';

    let debug = false;
    let stats;

    let flipInfo = false;
    let shadeUp = false;
    let scaleAnimation = false;
    let scaleUpdate;
    let selectedObject = null;
    let hoveredObject = null;

    const selectObject = (uuid) => {
        selectedObject = uuid;
    };

    let canvas;

    // When the shade goes up, focus on the canvas (for keydown events)
    $: if (shadeUp) canvas?.focus();

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

    // from https://threejsfundamentals.org
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
        }
    };

    window.addEventListener('resize', () => {
        requestFrameIfNotRequested();
    });

    const makeQueryStringObject = function () {
        const flattenedObjects = {
            currentChapter,
        };
        if (flipInfo) {
            flattenedObjects['flipInfo'] = true;
        }
        if (shadeUp) {
            flattenedObjects['shadeUp'] = true;
        }
        if (gridMeshes.visible) {
            flattenedObjects['grid'] = true;
        }
        window.location.search = convertToURLParams(
            flattenedObjects,
            objects
        ).toString();
    };

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

    const onPointerMove = function (e, renderer) {
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
        if (intersects.length > 0) {
            if (intersects[0].object) {
                let obj = intersects[0].object;
                let uuid = obj.name || obj.parent.name;
                if (uuid) {
                    document.body.style.cursor = 'pointer';
                    hoveredObject = uuid;
                }
            }
        } else {
            document.body.style.cursor = 'auto';
            hoveredObject = null;
        }
    };

    const onClick = function () {
        selectedObject = hoveredObject;
    };

    onMount(() => {
        const renderer = createScene(canvas);

        const urlParams = new URLSearchParams(location.search);
        if (urlParams.keys()) {
            const objectHolder = {};
            urlParams.forEach((val, key) => {
                // This is bad and stupid, and hopefully it will be done better.
                // make a viewStatus object, maybe?
                if (key === 'currentChapter') {
                    currentChapter = val;
                }
                if (key === 'shadeUp') {
                    shadeUp = true;
                }
                if (key === 'grid') {
                    gridMeshes.visible = val === 'true';
                }
                if (key === 'debug') {
                    debug = val === 'true';
                    console.log('debuggery: ', debug);
                }
                if (key === 'flipInfo') {
                    flipInfo = true;
                }
                if (key.slice(0, 3) === 'obj') {
                    const keyParts = key.split('_');
                    const obj = objectHolder[keyParts[0]] || { params: {} };
                    if (keyParts[1] === 'params') {
                        obj.params[keyParts[2]] = val;
                    } else {
                        obj[keyParts[1]] = val;
                    }
                    objectHolder[keyParts[0]] = obj;
                }
            });

            for (const val of Object.values(objectHolder)) {
                // objects = makeObject(val.uuid, val.kind, val.params, objects);
                objects = [...objects, { uuid: crypto.randomUUID(), ...val }];
                if (debug) console.log(objects);
            }
        }

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

        renderer.domElement.addEventListener('pointermove', (e) =>
            onPointerMove(e, renderer)
        );
        renderer.domElement.addEventListener('pointerleave', () => {
            // Reset cursor to default: let the browser take over
            // styling here.
            document.body.style.cursor = 'auto';
        });
        renderer.domElement.addEventListener('click', onClick);
    });

    const onPublishScene = function () {
        publishScene(objects, socket);
    };

    let currentChapter = 'Intro';
    let currentMode = 'intro';

    let pollResponses = {};
    let userResponseList = {};

    const handleSocketMessage = function (e) {
        const data = JSON.parse(e.data);
        if (
            data.message.pollResponse &&
            !(data.session_key in userResponseList)
        ) {
            userResponseList[data.session_key] = true;
            let choice = data.message.pollResponse;
            if (choice in pollResponses) {
                pollResponses[choice]++;
            } else {
                pollResponses[choice] = 1;
            }
        } else if (data.message.broadcastPoll) {
            currentPoll = handlePollEvent(data);
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

    const altDown = (e) => {
        if (e.altKey) {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    shadeUp = !shadeUp;
                    break;
                case 'BracketRight':
                    e.preventDefault();
                    if (!objects) {
                        return;
                    }

                    if (!selectedObject) {
                        selectedObject = objects[objects.length - 1].uuid;
                    } else {
                        const selectedIndex = objects
                            .map((x) => x.uuid)
                            .indexOf(selectedObject);
                        const newIdx = modFloor(
                            selectedIndex - 1,
                            objects.length
                        );
                        selectedObject = objects[newIdx].uuid;
                    }
                    break;
                case 'BracketLeft':
                    e.preventDefault();
                    if (!objects) {
                        return;
                    }

                    if (!selectedObject) {
                        selectedObject = objects[0].uuid;
                    } else {
                        const selectedIndex = objects
                            .map((x) => x.uuid)
                            .indexOf(selectedObject);
                        const newIdx = modFloor(
                            selectedIndex + 1,
                            objects.length
                        );
                        selectedObject = objects[newIdx].uuid;
                    }
                    break;
            }
        }
    };
    window.addEventListener('keydown', altDown, false);

    const onToggleSession = function () {
        currentMode = currentMode !== 'session' ? 'session' : 'intro';
    };
</script>

<main>
    <canvas bind:this={canvas} id="c" tabIndex="0" />

    <div class="info">
        <div class="info-inner">
            <div class="chapterBox" hidden={flipInfo}>
                <div class="collapse-info" hidden={shadeUp}>
                    <div class="d-flex mb-2">
                        <h1 class="flex-grow-1 px-2">
                            <a class="titlefont" href="/" title="Home"
                                >3Demos (βeta)</a
                            >
                        </h1>
                        <Button
                            class="me-2"
                            active={currentMode === 'session'}
                            on:click={onToggleSession}
                        >
                            {#if currentMode === 'session'}
                                Information
                            {:else}
                                Session
                            {/if}
                        </Button>
                        <button
                            class="ms-auto btn btn-light px-2"
                            on:click={() => {
                                flipInfo = !flipInfo;
                            }}
                        >
                            Object List
                            <i class="fa fa-sliders" />
                        </button>
                    </div>
                    {#if currentMode !== 'session'}
                        <div class="object-box-title d-flex">
                            <ButtonDropdown class="mb-2">
                                <DropdownMenu>
                                    <DropdownItem
                                        on:click={() =>
                                            (currentChapter = 'Intro')}
                                    >
                                        Introduction
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() =>
                                            (currentChapter =
                                                'Keyboard Controls')}
                                    >
                                        Keyboard Controls
                                    </DropdownItem>
                                    <DropdownItem divider />
                                    <DropdownItem
                                        on:click={() =>
                                            (currentChapter = 'Chapter')}
                                    >
                                        Arc Length & Curvature
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() =>
                                            (currentChapter = 'Linear')}
                                    >
                                        Linearization
                                    </DropdownItem>
                                </DropdownMenu>
                            </ButtonDropdown>
                        </div>
                    {/if}
                    {#if currentMode === 'session'}
                        <Session
                            bind:roomId
                            bind:socket
                            bind:objects
                            bind:isHost
                            bind:currentPoll
                        />
                    {:else if currentChapter === 'Intro'}
                        <Intro />
                    {:else if currentChapter === 'Keyboard Controls'}
                        <KeyboardControls />
                    {:else if currentChapter === 'Chapter'}
                        <Chapter bind:objects />
                    {:else if currentChapter === 'Linear'}
                        <Linear bind:objects />
                    {/if}
                </div>
                <button
                    class="btn btn-sm btn-light mt-1 raise-lower-button d-flex justify-content-center"
                    title={shadeUp ? 'Reveal Menu' : 'Hide Menu'}
                    on:click={() => {
                        shadeUp = !shadeUp;
                    }}
                >
                    <i class={`bi bi-chevron-${shadeUp ? 'down' : 'up'}`} />
                </button>
            </div>

            <div class="objectBoxOuter" hidden={!flipInfo}>
                <div class="collapse-info" hidden={shadeUp}>
                    <div class="object-box-title d-flex mb-2">
                        <h2 class="flex-grow-1 px-2">3D Objects</h2>
                        <button
                            class="btn btn-light ms-auto px-2"
                            on:click={() => {
                                flipInfo = !flipInfo;
                            }}
                        >
                            Chapters
                            <i class="fa fa-book" />
                        </button>
                    </div>
                    <div
                        class="btn-toolbar justify-content-between"
                        role="toolbar"
                    >
                        <div class="btn-group mb-2">
                            <ButtonDropdown>
                                <DropdownToggle color="primary">
                                    Add Object
                                    <i class="fa fa-plus" />
                                </DropdownToggle>
                                <DropdownMenu>
                                    <DropdownItem
                                        on:click={() => {
                                            objects = [
                                                ...objects,
                                                {
                                                    uuid: crypto.randomUUID(),
                                                    kind: 'point',
                                                    params: {
                                                        a: `${Math.random()}`.slice(
                                                            0,
                                                            5
                                                        ),
                                                        b: `${Math.random()}`.slice(
                                                            0,
                                                            5
                                                        ),
                                                        c: `${Math.random()}`.slice(
                                                            0,
                                                            5
                                                        ),
                                                        t0: '0',
                                                        t1: '1',
                                                    },
                                                    color: `#${makeHSLColor(
                                                        Math.random()
                                                    ).getHexString()}`,
                                                },
                                            ];
                                        }}
                                    >
                                        Point <M size="sm">P = ( a, b, c )</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() => {
                                            objects = [
                                                ...objects,
                                                {
                                                    uuid: crypto.randomUUID(),
                                                    kind: 'vector',
                                                    params: {
                                                        a: `${
                                                            2 * Math.random() -
                                                            1
                                                        }`.slice(0, 5),
                                                        b: `${
                                                            2 * Math.random() -
                                                            1
                                                        }`.slice(0, 5),
                                                        c: `${
                                                            2 * Math.random() -
                                                            1
                                                        }`.slice(0, 5),
                                                        x: '0',
                                                        y: '0',
                                                        z: '0',
                                                        t0: '0',
                                                        t1: '1',
                                                    },
                                                    color: `#${makeHSLColor(
                                                        Math.random()
                                                    ).getHexString()}`,
                                                },
                                            ];
                                        }}
                                    >
                                        Vector <M size="sm"
                                            >\mathbf v = \langle a, b, c \rangle</M
                                        >
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() => {
                                            objects = [
                                                ...objects,
                                                {
                                                    uuid: crypto.randomUUID(),
                                                    kind: 'curve',
                                                    params: {
                                                        a: '0',
                                                        b: '2*pi',
                                                        x: 'cos(t)',
                                                        y: 'sin(t)',
                                                        z: `${
                                                            1 / 4 +
                                                            Math.round(
                                                                100 *
                                                                    Math.random()
                                                            ) /
                                                                100
                                                        } * cos(${Math.ceil(
                                                            10 * Math.random()
                                                        ).toString()}*t)`,
                                                    },
                                                    color: `#${makeHSLColor(
                                                        Math.random()
                                                    ).getHexString()}`,
                                                },
                                            ];
                                        }}
                                    >
                                        Space Curve <M size="sm">\mathbf r(t)</M
                                        >
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() =>
                                            (objects = makeObject(
                                                null,
                                                'graph',
                                                {
                                                    a: '-2',
                                                    b: '2',
                                                    c: '-2',
                                                    d: '2',
                                                    z: `cos(${Math.ceil(
                                                        3 * Math.random()
                                                    ).toString()}*x + ${Math.ceil(
                                                        2 * Math.random()
                                                    ).toString()}*y)/(1 + x^2 + y^2)`,
                                                    t0: '0',
                                                    t1: '1',
                                                },
                                                objects
                                            ))}
                                    >
                                        Graph <M size="sm">z = f(x,y)</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() =>
                                            (objects = makeObject(
                                                null,
                                                'level',
                                                {
                                                    g: 'x^2 + 2 y^2 - z^2',
                                                    k: '1',
                                                    a: '-2',
                                                    b: '2',
                                                    c: '-2',
                                                    d: '2',
                                                    e: '-2',
                                                    f: '2',
                                                },
                                                objects
                                            ))}
                                    >
                                        Level Surface <M size="sm"
                                            >g(x,y,z) = k</M
                                        >
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() =>
                                            (objects = makeObject(
                                                null,
                                                'parsurf',
                                                {
                                                    a: '0',
                                                    b: '2*pi',
                                                    c: '0',
                                                    d: '2*pi',
                                                    x: 'cos(u)*(1 + sin(v)/3)',
                                                    y: 'sin(u)*(1 + sin(v)/3)',
                                                    z: '-cos(v)/3',
                                                },
                                                objects
                                            ))}
                                    >
                                        Parametric Surface <M size="sm"
                                            >\mathbf r(u,v)</M
                                        >
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={() => {
                                            objects = [
                                                ...objects,
                                                {
                                                    uuid: crypto.randomUUID(),
                                                    kind: 'field',
                                                    params: {
                                                        p: 'y',
                                                        q: 'z',
                                                        r: 'x',
                                                        nVec: 6,
                                                    },
                                                },
                                            ];
                                        }}
                                    >
                                        Vector Field<M size="sm"
                                            >\mathbf F(x,y,z)</M
                                        >
                                    </DropdownItem>
                                </DropdownMenu>
                            </ButtonDropdown>
                            <button
                                class="btn btn-danger"
                                on:click={blowUpObjects}
                            >
                                Clear Objects
                                <i class="fa fa-trash" />
                            </button>
                        </div>
                        {#if currentMode === 'session' && isHost}
                            <button
                                class="btn btn-primary mb-2"
                                on:click={onPublishScene}
                            >
                                Publish Scene
                                <i class="bi bi-broadcast-pin" />
                            </button>
                        {/if}
                    </div>

                    <div class="objectBoxInner">
                        <!-- Main Loop, if you will -->
                        {#each objects as { uuid, kind, params, color, animation } (uuid)}
                            <div
                                transition:slide={{
                                    delay: 0,
                                    duration: 300,
                                    easing: quintOut,
                                }}
                            >
                                <svelte:component
                                    this={kindToComponent[kind]}
                                    {scene}
                                    {onRenderObject}
                                    {onDestroyObject}
                                    camera={currentCamera}
                                    controls={currentControls}
                                    render={requestFrameIfNotRequested}
                                    {params}
                                    onClose={() => {
                                        objects = objects.filter(
                                            (b) => b.uuid !== uuid
                                        );
                                    }}
                                    bind:color
                                    bind:shadeUp
                                    bind:animation
                                    {uuid}
                                    {gridStep}
                                    {gridMax}
                                    on:animate={animateIfNotAnimating}
                                    selected={selectedObject === uuid}
                                    on:click={selectObject(uuid)}
                                    on:keydown={altDown}
                                />
                            </div>
                        {/each}
                    </div>

                    <!-- debug buttons -->
                    <div hidden={!debug}>
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 34,
                                        kind: 'curve',
                                        params: {
                                            a: '0',
                                            b: '2*pi',
                                            x: 'cos(t)',
                                            y: 'sin(t)',
                                            z: '0',
                                        },
                                        color: '#aa33ff',
                                        animation: true,
                                    },
                                    {
                                        uuid: '34point22',
                                        kind: 'point',
                                        params: {
                                            a: 'cos(2 t)',
                                            b: 'sin(2 t)',
                                            c: 'cos(2 t) + sin(2 t)',
                                            t0: '0',
                                            t1: '2 pi',
                                        },
                                        color: '#FF0000',
                                        animation: false,
                                    },
                                    {
                                        uuid: 345,
                                        kind: 'vector',
                                        params: {
                                            a: 'cos(t)',
                                            b: 'sin(t)',
                                            c: '1',
                                            x: 'cos(t)',
                                            y: 'sin(t)',
                                            z: '0',
                                            t0: '0',
                                            t1: '2*pi',
                                        },
                                        color: '#ff33ff',
                                        animation: false,
                                    },
                                ];
                            }}>Reset 1</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 34,
                                        kind: 'curve',
                                        params: {
                                            a: '0',
                                            b: '2*pi',
                                            x: 'cos(t)',
                                            y: 'sin(t)',
                                            z: '0',
                                        },
                                        color: '#aa33ff',
                                        animation: false,
                                    },
                                    {
                                        uuid: '34point22',
                                        kind: 'point',
                                        params: {
                                            a: 'cos(2 t)',
                                            b: 'sin(2 t)',
                                            c: 'cos(2 t) + sin(2 t)',
                                            t0: '0',
                                            t1: '2*pi',
                                        },
                                        color: '#FF0000',
                                        animation: true,
                                    },
                                    {
                                        uuid: 345,
                                        kind: 'vector',
                                        params: {
                                            a: 'cos(t)',
                                            b: 'sin(t)',
                                            c: '1',
                                            x: 'cos(t)',
                                            y: 'sin(t)',
                                            z: '0',
                                            t0: '0',
                                            t1: '2*pi',
                                        },
                                        color: '#ff33ff',
                                        animation: true,
                                    },
                                ];
                            }}>Reset 2</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 'agraph3847',
                                        kind: 'graph',
                                        params: {
                                            a: '-1',
                                            b: '1',
                                            c: '-1',
                                            d: '1',
                                            z: 'x^2 - 3*cos(t) * x * y + y^2',
                                            t0: '0',
                                            t1: '2*pi',
                                        },
                                        color: '#ff33ff',
                                        animation: true,
                                    },
                                ];
                            }}>anim func</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 'agraph3847',
                                        kind: 'graph',
                                        params: {
                                            a: '-1',
                                            b: '1',
                                            c: '-1',
                                            d: '1',
                                            z: 'x^2 - 3*cos(t) * x * y + y^2',
                                            t0: '0',
                                            t1: '2*pi',
                                        },
                                        color: '#ff33ff',
                                        animation: false,
                                    },
                                ];
                            }}>unanim func</button
                        >
                    </div>
                </div>
                <button
                    class="btn btn-sm btn-light mt-1 raise-lower-button d-flex justify-content-center"
                    title={shadeUp ? 'Reveal Menu' : 'Hide Menu'}
                    on:click={() => {
                        shadeUp = !shadeUp;
                    }}
                >
                    <i class={`bi bi-chevron-${shadeUp ? 'down' : 'up'}`} />
                </button>
            </div>
        </div>
    </div>

    <div class="settings-tray">
        <Settings
            bind:isHost
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
            bind:pollResponses
            encode={makeQueryStringObject}
            render={requestFrameIfNotRequested}
            bind:update={scaleUpdate}
            bind:animation={scaleAnimation}
            bind:orthoCamera
            bind:currentMode
            on:animate={animateIfNotAnimating}
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
</main>

<style>
    canvas {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        z-index: -10;
    }

    .info {
        position: absolute;
        left: 3%;
        top: 0%;
        width: clamp(23ch, 50%, 75ch);
        background-color: transparent;
        perspective: 1000px; /* Remove this if you don't want the 3D effect */
    }

    .info-inner {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.8s, opacity 0.8s;
        transform-style: preserve-3d;
    }

    .chapterBox,
    .objectBoxOuter {
        position: absolute;
        width: 100%;
        height: fit-content;
        background-color: rgba(0, 0, 0, 0.6);
        border-radius: 0.5em;
        border-top-left-radius: 0rem;
        border-top-right-radius: 0rem;
        border: 1px solid black;
        padding: 5px;
        transition: opacity 0.8s;
        box-sizing: border-box;

        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
    }

    .chapterBox {
        text-align: unset;
    }

    .objectBoxInner {
        display: flex;
        flex-direction: column-reverse;
        max-height: 75vh;
        overflow-y: auto;
        gap: 0.25em;
    }

    .dropdown {
        position: relative;
        display: inline-block;
    }

    .object-box-title {
        display: flex;
        font-size: 1.5em;
        justify-content: space-between;
    }

    .settings-tray {
        position: fixed;
        left: 3px;
        bottom: 0;
        display: flex;
        justify-content: flex-start;
        width: clamp(23ch, 30%, 45ch);
        z-index: 10;
    }

    .raise-lower-button {
        width: clamp(50px, 20%, 200px);
        margin: 0 auto;

        /* Bold */
        -webkit-text-stroke: 1px;
    }

    .active-users-count {
        position: absolute;
        top: 10px;
        right: 10px;
        color: white;
        background-color: rgba(0, 0, 0, 0.6);
        border: 1px solid black;
        border-radius: 0.5em;
        padding: 5px;
    }

    .leave-room {
        background-color: transparent;
        border: 0;
        bottom: 5px;
        color: #333;
        padding: 0;
        position: absolute;
        right: 10px;
        font-size: 2rem;
    }
</style>
