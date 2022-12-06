<script>
    import { createEventDispatcher } from "svelte";
    import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
    import {
        TextGeometry
    } from 'three/examples/jsm/geometries/TextGeometry.js';
    import {
        drawAxes,
        drawGrid,
        labelAxes,
        freeChildren,
        download
    } from './utils';
    import Polls from './Polls.svelte';
    import {
        makeObject
    } from './sceneUtils';

    const dispatch = createEventDispatcher();

    export let scene, camera, render, controls, controls2;
    export let gridMax, gridStep;
    export let axesHolder, axesText, gridMeshes, lineMaterial, axesMaterial;
    export let animation = false;
    export let orthoCamera = false;
    export let encode;
    export let objects;
    export let socket;
    export let currentMode;

    let newGridMeshes;
    const newLineMaterial = lineMaterial.clone();
    newLineMaterial.polygonOffset = true;
    newLineMaterial.polygonOffsetFactor = 0.1;

    export const update = (dt) => {
        const s = (scaleState - oldGridMax) / (gridMax - oldGridMax);
        if ((gridMax - scaleState) * (scaleState - oldGridMax) >= 0) {
            newLineMaterial.opacity = s;
            lineMaterial.opacity = 1 - s;
            camera.position.multiplyScalar(
                ((gridMax - oldGridMax) * dt + scaleState) / scaleState
            );

            scaleState = (gridMax - oldGridMax) * dt + scaleState;
        } else {
            animation = false;
            oldGridMax = gridMax;
            scaleState = gridMax;
            gridMeshes.geometry.dispose();
            gridMeshes.geometry = newGridMeshes.geometry;
            lineMaterial.opacity = 1;
            gridMeshes.material = lineMaterial;
            newLineMaterial.opacity = 0;
            scene.remove(newGridMeshes);
        }
    };

    let scaleState = gridMax;
    let oldGridMax = gridMax;
    let scale = 0;

    $: scala =
    Math.round(
        100 * Math.pow(10, Math.floor(scale)) * Math.floor(Math.pow(10, scale)
        / Math.pow(10, Math.floor(scale)))) / 100;

    const rescale = function() {
        if (scala !== gridMax) {
            oldGridMax = scaleState;
            gridMax = scala;
            gridStep = gridMax / 10;
            freeChildren(axesHolder);
            // Axes
            axesHolder.copy(drawAxes({ gridMax, gridStep, axesMaterial }));
            newGridMeshes = drawGrid({
                lineMaterial: newLineMaterial,
                gridMax,
                gridStep,
            });
            newGridMeshes.renderOrder = 1;
            scene.add(newGridMeshes);

            // Fonts
            const fontLoader = new FontLoader();
            [axesText] = labelAxes({
                scene,
                gridMax,
                gridStep,
                render,
                axesText,
            }, fontLoader, TextGeometry);

            if (gridMax !== oldGridMax) {
                animation = true;
                dispatch("animate");
            }
        }
    }

    let showSettings = false;
    let showUpload = false;
    let isPollsOpen = false;

    const openPolls = function() {
        isPollsOpen = true;
    }

    const togglePolls = () => (isPollsOpen = !isPollsOpen);

    const uploadScene = (e) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                let upload = [];
                try {
                    upload = JSON.parse(evt.target.result);
                } catch (SyntaxError) {
                    alert('Improper JSON formatting');
                }
                if (upload.length < 33) {
                    for (let i = 0; i < upload.length; i++) {
                        objects = makeObject(
                            null,
                            upload[i].kind,
                            upload[i].params,
                            objects,
                            socket
                        );
                    }
                } else {
                    alert('Object limit of 32 per upload.');
                }

            };
            reader.readAsText(e.target.files[0], 'utf-8');
        }
</script>

<div
    class="settings-box"
    class:grid={showSettings}
    hidden={!showSettings}
    id="settings-box"
    >
    <span class="box-1">
        <strong>Settings</strong>
    </span>
    <button
        type="button"
        class="btn btn-sm btn-light box-3"
        style="margin-left: auto;"
        on:click={() => {
            showSettings = false;
        }}
    >
        <i class="bi bi-x-lg"></i>
    </button>

    <label class="form-label" for="scale">Scale</label>
    <span class="form-range">
        <input
            type="range"
            name="scale"
            id="scale"
            min="-2"
            max="3"
            step=".02"
            bind:value={scale}
            on:change={rescale}
        >
        <span class="output box-23 text-right">{scala}</span>
    </span>

    <div class="form-check form-switch">
        <label class="form-check-label box-1" for="gridVisible">Grid</label>
        <input
            class="form-check-input box-1"
            type="checkbox"
            name="gridVisible"
            id="gridVisible"
            role="switch"
            aria-checked="true"
            bind:checked={gridMeshes.visible}
            on:change={render}
        />
    </div>

    <div class="form-check form-switch">
        <label class="form-check-label box-2" for="orthoCamera">Linear Perspective</label>
        <input
            class="form-check-input box-2"
            type="checkbox"
            role="switch"
            aria-checked="false"
            name="orthoCamera"
            id="orthoCamera"
            bind:checked={orthoCamera}
            on:change={render}
        />
    </div>
</div>

<div
    class="settings-box"
    class:grid={showUpload}
    hidden={!showUpload}
    id="upload-box"
>
    <button
        type="button"
        class="btn btn-sm btn-light box-3"
        style="margin-left: auto;"
        on:click={() => {
            showUpload = false;
        }}
    >
        <i class="bi bi-x-lg"></i>
    </button>
    <label for="upload">Upload a scene</label>
    <input id="upload" type="file" accept="application/json"
        on:change={(e) => {uploadScene(e);}}
    >
</div>

<button
    class="button"
    id="settings"
    title="Settings"
    on:click={() => {
        showUpload = false;
        showSettings = !showSettings;
    }}
>
    <i class="fa fa-cog" />
</button>
<button class="button" id="encodeURL" title="Encode URL" on:click={encode}>
    <i class="fa fa-barcode" />
</button>
<button
    class="button"
    title="Upload Scene"
    on:click={() => {
        showSettings = false;
        showUpload = !showUpload;
    }}
>
    <i class="fa fa-upload" />
</button>
<button
    class="button"
    title="Download Scene"
    on:click={download}
>
    <i class="fa fa-download" />
</button>
<button
    class="button"
    id="cameraReset"
    title="Reset camera"
    on:click={() => {
        controls.target.set(0, 0, 0);
        controls2.target.set(0, 0, 0);
        render();
    }}
>
    <i class="fa fa-video-camera" />
</button>
<button class="button" id="screenshot" title="Take screenshot">
    <i class="fa fa-camera" />
</button>
<button class="button" id="presentation" title="Presentation mode">
    <i class="fa fa-television" />
</button>

{#if currentMode === 'session'}
    <button on:click={openPolls}
            class="button" title="Polls">
        <i class="fa fa-list" />
    </button>
{/if}

<Polls
    bind:socket
    isPollsOpen={isPollsOpen}
    togglePolls={togglePolls} />

<style>
    .button {
        background-color: transparent;
        border-width: 0rem;
    }

    .grid {
        display: grid;
    }

    .settings-box {
        position: absolute;
        grid-template-columns: repeat(3, 1fr);
        left: 5px;
        color: white;
        bottom: 100px;
        border: 1px solid black;
        background-color: rgb(0, 0, 0, 0.8);
        width: minmax(23ch, 45ch);
        gap: 3px;
        padding: 5px;
    }

    .box-1 {
        grid-column: 1 / 2;
    }
    .box-23 {
        grid-column: 2 / 4;
    }

    .box-2 {
        grid-column: 2 / 3;
    }
    .box-3 {
        grid-column: 3 / 4;
    }

    .text-right {
        text-align: right;
    }

    .output {
        width: 2rem;
        text-align: right;
        font-family: "Courier New", Courier, monospace;
    }
</style>
