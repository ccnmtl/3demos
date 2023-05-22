<script>
    /**
     * Main 3Demos control panel, to the left of the scene.
     */
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    import {
        ButtonDropdown,
        DropdownItem,
        DropdownMenu,
        DropdownToggle,
        TabContent,
        TabPane
    } from "sveltestrap";

    import HowTo from "./docs/HowTo.svelte";
    import About from "./docs/About.svelte";
    import Polls from "./polls/Polls.svelte";

    import { makeHSLColor, querySelectorIncludesText } from "./utils";
    import { makeObject, publishScene } from "./sceneUtils";

    import Session from "./session/Session.svelte";

    import Surface from './objects/Surface.svelte';
    import Level from './objects/Level.svelte';
    import Curve from './objects/Curve.svelte';
    import Field from './objects/Field.svelte';
    import Function from './objects/Function.svelte';
    import Vector from './objects/Vector.svelte';
    import Point from './objects/Point.svelte';
    import Solid from './objects/Solid.svelte';

    import M from "./M.svelte";

    export let debug, currentMode;
    export let currentControls;
    export let currentChapter;
    export let gridMeshes;
    export let gridStep, gridMax;
    export let objects, isHost;
    export let onRenderObject, onDestroyObject;
    export let socket, pollResponses;
    export let animateIfNotAnimating;
    export let roomId, currentPoll;

    export let currentCamera;
    export let scene;
    export let requestFrameIfNotRequested;

    export let blowUpObjects = function () {};
    export let selectObject = function () {};
    export let selectedObjects;
    export let selectedPoint;
    export let chatBuffer;
    export let isPollsOpen;
    export let objectResponses;

    const PANEL_DELAY = 200;
    let showPanel = true;
    let panelOffset = 0;
    let panelWidth = 370;
    let panelTransition = '';
    let panelTransitionProperty = '';
    let isPanelResizing = false;

    const kindToComponent = {
        point: Point,
        vector: Vector,
        field: Field,
        graph: Function,
        curve: Curve,
        level: Level,
        surface: Surface,
        solid: Solid,
    };

    const onPublishScene = function () {
        publishScene(objects, selectedObjects, socket);
    };

    const onClickPoint = function () {
        objects = [
            ...objects,
            {
                uuid: crypto.randomUUID(),
                kind: "point",
                params: {
                    a: `${Math.random()}`.slice(0, 5),
                    b: `${Math.random()}`.slice(0, 5),
                    c: `${Math.random()}`.slice(0, 5),
                    t0: "0",
                    t1: "1",
                },
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickVector = function () {
        objects = [
            ...objects,
            {
                uuid: crypto.randomUUID(),
                kind: "vector",
                params: {
                    a: `${2 * Math.random() - 1}`.slice(0, 5),
                    b: `${2 * Math.random() - 1}`.slice(0, 5),
                    c: `${2 * Math.random() - 1}`.slice(0, 5),
                    x: "0",
                    y: "0",
                    z: "0",
                    t0: "0",
                    t1: "1",
                },
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickSpaceCurve = function () {
        objects = [
            ...objects,
            {
                uuid: crypto.randomUUID(),
                kind: "curve",
                params: {
                    a: "0",
                    b: "2*pi",
                    x: "cos(t)",
                    y: "sin(t)",
                    z: `${
                        1 / 4 + Math.round(100 * Math.random()) / 100
                    } * cos(${Math.ceil(10 * Math.random()).toString()}*t)`,
                },
                color: `#${makeHSLColor(Math.random()).getHexString()}`,
            },
        ];
    };

    const onClickGraph = function () {
        objects = makeObject(
            null,
            "graph",
            {
                a: "-2",
                b: "2",
                c: "-2",
                d: "2",
                z: `cos(${Math.ceil(
                    3 * Math.random()
                ).toString()}*x + ${Math.ceil(
                    2 * Math.random()
                ).toString()}*y)/(1 + x^2 + y^2)`,
                t0: "0",
                t1: "1",
            },
            objects
        );
    };

    const onClickLevelSurface = function () {
        objects = makeObject(
            null,
            "level",
            {
                g: "x^2 + 2 y^2 - z^2",
                k: "1",
                a: "-2",
                b: "2",
                c: "-2",
                d: "2",
                e: "-2",
                f: "2",
            },
            objects
        );
    };

    const onClickParSurf = function () {
        objects = makeObject(
            null,
            "surface",
            {
                a: "0",
                b: "2*pi",
                c: "0",
                d: "2*pi",
                x: "cos(u)*(1 + sin(v)/3)",
                y: "sin(u)*(1 + sin(v)/3)",
                z: "-cos(v)/3",
            },
            objects
        );
    };

    const onClickVectorField = function () {
        objects = [
            ...objects,
            {
                uuid: crypto.randomUUID(),
                kind: "field",
                params: {
                    p: "y",
                    q: "z",
                    r: "x",
                    nVec: 6,
                },
            },
        ];
    };

    const onTogglePanel = function() {
        panelTransition = `all ${PANEL_DELAY}ms ease`;
        panelTransitionProperty = 'transform';

        showPanel = !showPanel;

        // De-activate transition easing by default, so user can still
        // manually resize the panel without weird transition
        // interference.
        setTimeout(() => {
            panelTransition = '';
            panelTransitionProperty = '';
        }, PANEL_DELAY);
    };

    const onResizePanelStart = function() {
        isPanelResizing = true;
    };

    const onResizePanel = function(e) {
        if (isPanelResizing) {
            const newWidth = e.clientX - 10;
            if (newWidth >= 300 && newWidth <= window.innerWidth * 0.6) {
                panelWidth = newWidth;
            }
        }
    };

    const onResizePanelEnd = function() {
        isPanelResizing = false;
    };

    /**
     * Show the "Info" accordion item.
     */
    export const showMainPanelItem = function() {
        // Expand panel if it's hidden.
        showPanel = true;

        // Open the first accordion item.
        window.jQuery('#collapseOne').collapse('show');

        currentMode = 'session';
        // Because sveltestrap can't activate this tab programmatically:
        // https://github.com/bestguy/sveltestrap/issues/532
        const tabEl = querySelectorIncludesText(
            '.chapterBox .nav-tabs a', 'Session');
        tabEl.click();
    };

    onMount(() => {
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.keys()) {
            const objectHolder = {};
            urlParams.forEach((val, key) => {
                // This is bad and stupid, and hopefully it will be done better.
                // make a viewStatus object, maybe?
                if (key === "currentChapter") {
                    currentChapter = val;
                }
                if (key === "grid") {
                    gridMeshes.visible = val === "true";
                }
                if (key === "debug") {
                    debug = val === "true";
                    console.log("debuggery: ", debug);
                }
                if (key.slice(0, 3) === "obj") {
                    const keyParts = key.split("_");
                    const obj = objectHolder[keyParts[0]] || { params: {} };
                    if (keyParts[1] === "params") {
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

        window.addEventListener('pointermove', onResizePanel);
        window.addEventListener('pointerup', onResizePanelEnd);
    });

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            onTogglePanel();
        }
    };
    window.addEventListener('keydown', onKeyDown, false);

    $: panelOffset = showPanel ? 0 : -100;
</script>

<div class="demos-panel"
     style:width={panelWidth + 'px'}
     style:transition={panelTransition}
     style:transition-property={panelTransitionProperty}
     style:transform={`translateX(${panelOffset}%)`}>
<div id="panelAccordion" class="accordion">
    <h1 class="flex-grow-1 px-2">
        <a href="/" title="Home" class="text-body">3Demos (βeta)</a>
    </h1>

    <div class="accordion-item demos-panel-box">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapseOne"
                    aria-expanded="false" aria-controls="collapseOne">
                Info
            </button>
        </h2>
        <div id="collapseOne" class="accordion-collapse collapse show"
             data-bs-parent="#panelAccordion">
            <div class="chapterBox">
                <div class="collapse-info">
                    <TabContent on:tab={(e) => (currentMode = e.detail)}>
                        <TabPane tabId="how-to" tab="How To"
                                 active={currentMode === 'how-to'}>
                            <HowTo />
                        </TabPane>
                        <TabPane tabId="session" tab="Session"
                                 active={currentMode === 'session'}>
                            <Session
                                bind:roomId
                                bind:socket
                                bind:objects
                                bind:currentPoll
                                bind:chatBuffer
                                {pollResponses}
                                {selectedPoint}
                                {selectedObjects}
                                {isHost} />
                        </TabPane>
                        <TabPane tabId="story" tab="Story" disabled
                                 active={currentMode === 'story'}>
                            Story Mode
                        </TabPane>
                        <TabPane tabId="about" tab="About"
                                 active={currentMode === 'about'}>
                            <About />
                        </TabPane>
                    </TabContent>
                </div>
            </div>
        </div>
    </div>
    <!-- end .demos-panel-box -->

    {#if currentMode === "session" && isHost}
        <div class="accordion-item demos-panel-box">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button"
                        data-bs-toggle="collapse" data-bs-target="#collapseTwo"
                        aria-expanded="false" aria-controls="collapseTwo">
                    Polls
                </button>
            </h2>
            <div id="collapseTwo" class="accordion-collapse collapse"
                 data-bs-parent="#panelAccordion"
            >
                <Polls
                    bind:pollResponses
                    bind:isPollsOpen
                    bind:objects
                    bind:currentPoll
                    {socket}
                    {objectResponses}
                    render={requestFrameIfNotRequested}
                />
            </div>
        </div>
    {/if}

<div class="accordion-item demos-panel-box">
    <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse" data-bs-target="#collapseThree"
                aria-expanded="false" aria-controls="collapseThree">
            Objects
        </button>
    </h2>
    <div id="collapseThree" class="accordion-collapse collapse"
         data-bs-parent="#panelAccordion">
        <div class="objectBoxOuter">
            <div class="collapse-info">
                <div class="object-box-title d-flex mb-2">
                    <h2 class="flex-grow-1 px-2">3D Objects</h2>
                </div>
                <div
                    class="btn-toolbar justify-content-between"
                    role="toolbar">
                    <div class="btn-group mb-2">
                        <ButtonDropdown>
                            <DropdownToggle size="sm" color="primary">
                                Add Object
                                <i class="fa fa-plus" />
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem on:click={onClickPoint}>
                                    Point <M size="sm">P = ( a, b, c )</M>
                                </DropdownItem>
                                <DropdownItem on:click={onClickVector}>
                                    Vector <M size="sm"
                                        >\mathbf v = \langle a, b, c \rangle</M
                                    >
                                </DropdownItem>
                                <DropdownItem on:click={onClickSpaceCurve}>
                                    Space Curve <M size="sm">\mathbf r(t)</M
                                    >
                                </DropdownItem>
                                <DropdownItem on:click={onClickGraph}>
                                    Graph <M size="sm">z = f(x,y)</M>
                                </DropdownItem>
                                <DropdownItem
                                    on:click={onClickLevelSurface}
                                >
                                    Level Surface <M size="sm"
                                        >g(x,y,z) = k</M
                                    >
                                </DropdownItem>
                                <DropdownItem on:click={onClickParSurf}>
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
                                                kind: 'solid',
                                                params: {
                                                    coords: 'rect',
                                                    a: '-1',
                                                    b: '1',
                                                    c: '-1',
                                                    d: 'x',
                                                    e: '0',
                                                    f: '1 - (x^2 + y^2) / 2',
                                                },
                                                color: `#${makeHSLColor(
                                                    Math.random()
                                                ).getHexString()}`,
                                            },
                                        ];
                                    }}
                                >
                                    Solid Region <M size="sm"
                                        >{'E \\subset \\mathbb{R}^3'}</M
                                    >
                                </DropdownItem>
                                <DropdownItem
                                    on:click={onClickVectorField}>
                                    Vector Field<M size="sm">\mathbf F(x,y,z)</M>
                                </DropdownItem>
                            </DropdownMenu>
                        </ButtonDropdown>
                        <button
                            class="btn btn-sm btn-danger"
                            on:click={blowUpObjects}
                        >
                            Clear Objects
                            <i class="fa fa-trash" />
                        </button>
                    </div>
                    {#if currentMode === "session" && isHost}
                        <button
                            class="btn btn-sm btn-primary mb-2"
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
                                    selectedObjects = selectedObjects.filter(
                                        (objectId) => objectId !== uuid
                                    );
                                }}
                                bind:color
                                bind:animation
                                {uuid}
                                {gridStep}
                                {gridMax}
                                on:animate={animateIfNotAnimating}
                                bind:selectedObjects
                                selected={selectedObjects.includes(uuid)}
                                onSelect={() => selectObject(uuid)}
                                bind:selectedPoint
                            />
                        </div>
                    {/each}
                </div>

                <!-- debug buttons -->

                {#if debug}
                    <div>
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 34,
                                        kind: "curve",
                                        params: {
                                            a: "0",
                                            b: "2*pi",
                                            x: "cos(t)",
                                            y: "sin(t)",
                                            z: "0",
                                        },
                                        color: "#aa33ff",
                                        animation: true,
                                    },
                                    {
                                        uuid: "34point22",
                                        kind: "point",
                                        params: {
                                            a: "cos(2 t)",
                                            b: "sin(2 t)",
                                            c: "cos(2 t) + sin(2 t)",
                                            t0: "0",
                                            t1: "2 pi",
                                        },
                                        color: "#FF0000",
                                        animation: false,
                                    },
                                    {
                                        uuid: 345,
                                        kind: "vector",
                                        params: {
                                            a: "cos(t)",
                                            b: "sin(t)",
                                            c: "1",
                                            x: "cos(t)",
                                            y: "sin(t)",
                                            z: "0",
                                            t0: "0",
                                            t1: "2*pi",
                                        },
                                        color: "#ff33ff",
                                        animation: false,
                                    },
                                ];
                            }}>curve anim</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: 34,
                                        kind: "curve",
                                        params: {
                                            a: "0",
                                            b: "2*pi",
                                            x: "cos(t)",
                                            y: "sin(t)",
                                            z: "0",
                                        },
                                        color: "#aa33ff",
                                        animation: false,
                                    },
                                    {
                                        uuid: "34point22",
                                        kind: "point",
                                        params: {
                                            a: "cos(2 t)",
                                            b: "sin(2 t)",
                                            c: "cos(2 t) + sin(2 t)",
                                            t0: "0",
                                            t1: "2*pi",
                                        },
                                        color: "#FF0000",
                                        animation: true,
                                    },
                                    {
                                        uuid: 345,
                                        kind: "vector",
                                        params: {
                                            a: "cos(t)",
                                            b: "sin(t)",
                                            c: "1",
                                            x: "cos(t)",
                                            y: "sin(t)",
                                            z: "0",
                                            t0: "0",
                                            t1: "2*pi",
                                        },
                                        color: "#ff33ff",
                                        animation: true,
                                    },
                                ];
                            }}>point/vec anim</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: "agraph3847",
                                        kind: "graph",
                                        params: {
                                            a: "-1",
                                            b: "1",
                                            c: "-1",
                                            d: "1",
                                            z: "x^2 - 3*cos(t) * x * y + y^2",
                                            t0: "0",
                                            t1: "2*pi",
                                        },
                                        color: "#ff33ff",
                                        animation: true,
                                    },
                                ];
                            }}>anim func</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: "agraph3847",
                                        kind: "graph",
                                        params: {
                                            a: "-1",
                                            b: "1",
                                            c: "-1",
                                            d: "1",
                                            z: "x^2 - 3*cos(t) * x * y + y^2",
                                            t0: "0",
                                            t1: "2*pi",
                                        },
                                        color: "#ff33ff",
                                        animation: false,
                                    },
                                ];
                            }}>unanim func</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: "swirly1234",
                                        kind: "field",
                                        params: {
                                            p: "x/2",
                                            q: "-z",
                                            r: "y",
                                            nVec: "5",
                                        },
                                        color: "#ff33ff",
                                        animation: true,
                                    },
                                ];
                            }}>anim field</button
                        >
                        <button
                            on:click={() => {
                                objects = [
                                    {
                                        uuid: "swirly1234",
                                        kind: "field",
                                        params: {
                                            p: "x/2",
                                            q: "-z",
                                            r: "y",
                                            nVec: "5",
                                        },
                                        color: "#ff33ff",
                                        animation: false,
                                    },
                                ];
                            }}>unanim field</button
                        >
                    </div>
                {/if}
            </div>
        </div><!-- end .objectBoxOuter -->
    </div>
</div>

</div><!-- end .accordion -->

</div><!-- end .demos-panel -->

<div class="panel-button panel-hider bg-info bg-opacity-25 border border-info border-start-0 rounded-end-circle"
     title={showPanel ? 'Hide panel' : 'Show panel'}
     style:left={showPanel ? ((panelWidth - 1) + 'px') : 0}
     style:transition={panelTransition}
     style:transition-property={'left'}
     style:transform={`left(${showPanel ? panelWidth : 0}px)`}
     on:click={onTogglePanel}
     on:keypress={onTogglePanel}>
    <div class="align-middle text-center">
        {#if showPanel}
            <i class="bi bi-arrow-bar-left"></i>
        {:else}
            <i class="bi bi-arrow-bar-right"></i>
        {/if}
    </div>
</div>

<div class="panel-button panel-resizer bg-info bg-opacity-25 border border-info border-start-0 rounded-end-circle"
     title="Resize panel"
     style:left={showPanel ? ((panelWidth - 1) + 'px') : 0}
     style:transition={panelTransition}
     style:transition-property="left"
     style:transform={`left(${showPanel ? panelWidth : 0}px)`}
     on:pointerdown={onResizePanelStart}>
    <div class="align-middle text-center">
        <i class="bi bi-arrow-left-right"></i>
    </div>
</div>

<style>
    :global(#panelAccordion .collapse-info .nav-link:not(.active)) {
        color: white;
    }

    .demos-panel {
        z-index: 1;

        min-width: 300px;
        max-width: 60%;

        background-color: transparent;

        overflow-y: auto;
        overflow-x: hidden;
    }

    .panel-button {
        cursor: pointer;
        position: absolute;

        min-width: 28px;
        height: 38px;

        z-index: 2;
    }

    .panel-button:hover {
        background-color: rgba(255, 255, 150, 0.6) !important;
    }

    .panel-button>div {
        position: relative;
        top: 6px;
    }

    .panel-button.panel-hider {
        top: 40px;
    }

    .panel-button.panel-resizer {
        top: 82px;
        cursor: col-resize;
    }

    .chapterBox,
    .objectBoxOuter {
        background-color: rgba(0, 0, 0, 0.5);
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
</style>
