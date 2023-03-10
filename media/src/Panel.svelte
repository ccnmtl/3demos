<script>
    /**
     * Main 3Demos control panel, to the left of the scene.
     */
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    import {
        Button,
        ButtonDropdown,
        DropdownItem,
        DropdownMenu,
        DropdownToggle,
    } from 'sveltestrap';

    import Intro from './Intro.svelte';
    import KeyboardControls from './KeyboardControls.svelte';
    import Chapter from './Chapter.svelte';
    import Linear from './Linear.svelte';
    import Settings from './settings/Settings.svelte';
    import Polls from './polls/Polls.svelte';

    import {
        convertToURLParams,
        makeHSLColor
    } from './utils';
    import { makeObject, publishScene } from './sceneUtils';

    import Session from './session/Session.svelte';

    import ParSurf from './objects/ParSurf.svelte';
    import Level from './objects/Level.svelte';
    import Curve from './objects/Curve.svelte';
    import Field from './objects/Field.svelte';
    import Function from './objects/Function.svelte';
    import Vector from './objects/Vector.svelte';
    import Point from './objects/Point.svelte';

    import M from './M.svelte';

    export let debug, currentMode, flipInfo;
    export let currentControls;
    export let currentChapter;
    export let gridMeshes;
    export let gridStep, gridMax;
    export let objects, isHost;
    export let onRenderObject, onDestroyObject;
    export let socket, pollResponses;
    export let scaleUpdate, scaleAnimation;
    export let animateIfNotAnimating;
    export let roomId, currentPoll;

    export let camera;
    export let currentCamera, orthoCamera;
    export let scene;
    export let requestFrameIfNotRequested;

    export let blowUpObjects = function () {};
    export let selectObject = function () {};
    export let selectedObject;
    export let altDown;
    export let chatBuffer;

    export let axesText, axesHolder, axesMaterial, lineMaterial;

    const kindToComponent = {
        point: Point,
        vector: Vector,
        field: Field,
        graph: Function,
        curve: Curve,
        level: Level,
        parsurf: ParSurf,
    };

    const makeQueryStringObject = function () {
        const flattenedObjects = {
            currentChapter,
        };
        if (flipInfo) {
            flattenedObjects['flipInfo'] = true;
        }
        if (gridMeshes.visible) {
            flattenedObjects['grid'] = true;
        }
        window.location.search = convertToURLParams(
            flattenedObjects,
            objects
        ).toString();
    };

    const onPublishScene = function () {
        publishScene(objects, socket);
    };

    const onToggleSession = function () {
        currentMode = currentMode !== 'session' ? 'session' : 'intro';
    };

    const onClickPoint = function() {
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
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickVector = function() {
        objects = [
            ...objects,
            {
                uuid: crypto.randomUUID(),
                kind: 'vector',
                params: {
                    a: `${2 * Math.random() - 1}`.slice(0, 5),
                    b: `${2 * Math.random() - 1}`.slice(0, 5),
                    c: `${2 * Math.random() - 1}`.slice(0, 5),
                    x: '0',
                    y: '0',
                    z: '0',
                    t0: '0',
                    t1: '1',
                },
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickSpaceCurve = function() {
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
                    z: `${1 / 4 +
                                        Math.round(
                                        100 *
                                        Math.random()
                                        ) /
                                        100
                                        } * cos(${Math.ceil(
                                        10 * Math.random()
                                        ).toString()}*t)`,
                },
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickGraph = function() {
        objects = makeObject(
            null,
            'graph',
            {
                a: '-2',
                b: '2',
                c: '-2',
                d: '2',
                z: `cos(${Math.ceil(3 * Math.random()
                                        ).toString()}*x + ${Math.ceil(
                                        2 * Math.random()
                                        ).toString()}*y)/(1 + x^2 + y^2)`,
                t0: '0',
                t1: '1',
            },
            objects
        );
    };

    const onClickLevelSurface = function() {
        objects = makeObject(
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
        );
    };

    const onClickParSurf = function() {
        objects = makeObject(
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
        );
    };

    const onClickVectorField = function() {
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
    };

    onMount(() => {
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.keys()) {
            const objectHolder = {};
            urlParams.forEach((val, key) => {
                // This is bad and stupid, and hopefully it will be done better.
                // make a viewStatus object, maybe?
                if (key === 'currentChapter') {
                    currentChapter = val;
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
    });
</script>

<div class="demos-panel d-flex flex-column">

    <div class="demos-panel-box content-object-box flex-fill">
        <div class="info-inner">
            <div class="chapterBox" hidden={flipInfo}>
                <div class="collapse-info">
                    <div class="d-flex mb-2">
                        <h1 class="flex-grow-1 px-2">
                            <a class="titlefont" href="/" title="Home">
                                3Demos (βeta)
                            </a>
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
                                        (currentChapter = 'Keyboard Controls')}
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
                            bind:chatBuffer
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
            </div>

            <div class="objectBoxOuter" hidden={!flipInfo}>
                <div class="collapse-info">
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
                    <div class="btn-toolbar justify-content-between"
                         role="toolbar">
                        <div class="btn-group mb-2">
                            <ButtonDropdown>
                                <DropdownToggle color="primary">
                                    Add Object
                                    <i class="fa fa-plus" />
                                </DropdownToggle>
                                <DropdownMenu>
                                    <DropdownItem
                                        on:click={onClickPoint}>
                                        Point <M size="sm">P = ( a, b, c )</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickVector}>
                                        Vector <M size="sm">\mathbf v = \langle a, b, c \rangle</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickSpaceCurve}>
                                        Space Curve <M size="sm">\mathbf r(t)</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickGraph}>
                                        Graph <M size="sm">z = f(x,y)</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickLevelSurface}>
                                        Level Surface <M size="sm">g(x,y,z) = k</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickParSurf}>
                                        Parametric Surface <M size="sm">\mathbf r(u,v)</M>
                                    </DropdownItem>
                                    <DropdownItem
                                        on:click={onClickVectorField}>
                                        Vector Field<M size="sm">\mathbf F(x,y,z)</M>
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
                                        objects = objects.filter((b) => b.uuid !== uuid);
                                    }}
                                    bind:color
                                    bind:animation
                                    {uuid}
                                    {gridStep}
                                    {gridMax}
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
                            },
                            {
                            uuid: '42ee3',
                            kind: 'parsurf',
                            params: {
                            a: '-1',
                            b: '1',
                            c: '-1',
                            d: '1',
                            x: 'sin(u)*cos(v)',
                            y: 'sin(u)*sin(v)',
                            z: 'cos(u)',
                            },
                            },
                            {
                            uuid: '423',
                            kind: 'parsurf',
                            params: {
                            a: '0',
                            b: '2*pi',
                            c: '0',
                            d: '2*pi',
                            x: 'u',
                            y: 'v - 3 + u^2/5',
                            z: '-cos(v 5)/3',
                            },
                            },
                            ];
                            }}>Reset 1</button
                                          >
                        <button
                            on:click={() => {
                            objects = [
                            {
                            uuid: '423',
                            kind: 'parsurf',
                            params: {
                            a: '-2',
                            b: '2',
                            c: '-2',
                            d: '2',
                            x: 'u + v',
                            y: 'u - v',
                            z: '-cos(v 5)/3',
                            nX: 80,
                            },
                            },
                            {
                            uuid: '42ee3',
                            kind: 'parsurf',
                            params: {
                            a: '-1',
                            b: '1',
                            c: '-1',
                            d: '1',
                            x: 'sin(u)*cos(v)',
                            y: 'sin(u)*sin(v)',
                            z: 'cos(u)',
                            nX: 80,
                            },
                            },
                            {
                            uuid: 34,
                            kind: 'curve',
                            params: {
                            a: '0',
                            b: '2*pi',
                            x: 'cos(2 * t)',
                            y: 'sin(2 * t)',
                            z: 't / (2 * pi)',
                            },
                            color: '#ff332a',
                            },
                            ];
                            }}>Reset 2</button>
                    </div>
                </div>
            </div>
        </div>
    </div><!-- end .demos-panel-box -->

    {#if currentMode === 'session' && isHost}
        <div class="demos-panel-box">
            <Polls bind:socket bind:pollResponses />
        </div>
    {/if}

    <div class="demos-panel-box">
        <div class="settings-tray">
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
                />
        </div>
    </div>

</div><!-- end .demos-panel -->
<style>
    .demos-panel {
        z-index: 1;
        min-width: 300px;
        width: 400px;
        background-color: transparent;

        overflow: auto;
        resize: horizontal;

        /* Remove this if you don't want the 3D effect */
        perspective: 1000px;
    }

    .content-object-box {
        overflow-y: scroll;
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
        flex-direction: column;
        gap: 0.25em;
    }

    .object-box-title {
        display: flex;
        font-size: 1.5em;
        justify-content: space-between;
    }

    .settings-tray {
        display: flex;
        justify-content: flex-start;
    }
</style>
