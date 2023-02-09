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
        freeChildren
    } from './utils';
    import Polls from './polls/Polls.svelte';
    import {
        makeObject
    } from './sceneUtils';

    const dispatch = createEventDispatcher();

    export let isHost;
    export let scene, camera, render, controls, controls2;
    export let gridMax, gridStep;
    export let axesHolder, axesText, gridMeshes, lineMaterial, axesMaterial;
    export let animation = false;
    export let orthoCamera = false;
    export let encode;
    export let objects;
    export let socket;
    export let currentMode;
    export let pollResponses;

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

    const makeFilename = () => {
        const formattedDate = new Date().toISOString().split('T')[0];
        return '3Demos-scene-' + formattedDate + '.json';
    }

    const downloadScene = () => {
        let json = JSON.stringify(objects);
        const blob = new Blob([json], {type: "application/json",});
        let a = document.createElement('a');
        a.download = makeFilename();
        a.href = window.URL.createObjectURL(blob);
        a.click();
        a.remove();
    }
</script>

<div
    class="settings-box"
    class:grid={showSettings}
    hidden={!showSettings}
    id="settings-box"
    >
    <div class="row justify-content-between">
        <h3 class="col-auto">Settings</h3>
        <button
            type="button"
            class="btn btn-sm btn-light mx-3"
            on:click={() => {
                showSettings = false;
            }}
        >
            <i class="bi bi-x-lg"></i>
        </button>
        <div class="col-12">
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
                <span class="output text-right">{scala}</span>
            </span>
        </div>
    </div>
    <div class="form-check form-switch row">
        <label class="form-check-label col-6" for="gridVisible">
            Grid
            <input
                class="form-check-input"
                type="checkbox"
                name="gridVisible"
                id="gridVisible"
                role="switch"
                aria-checked="true"
                bind:checked={gridMeshes.visible}
                on:change={render}
            />
        </label>
        <label class="form-check-label col-auto" for="orthoCamera">
            Orthographic View
            <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                aria-checked="false"
                name="orthoCamera"
                id="orthoCamera"
                bind:checked={orthoCamera}
                on:change={render}
            />
        </label>
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
        class="btn btn-sm btn-light"
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
    on:click={downloadScene}
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

{#if currentMode === 'session' && isHost}
    <button on:click={openPolls}
            class="button" title="Polls">
        <i class="fa fa-list" />
    </button>
{/if}

<Polls
    bind:socket
    bind:pollResponses
    isPollsOpen={isPollsOpen}
    togglePolls={togglePolls} />

<style>
    .button {
        background-color: transparent;
        border-width: 0rem;
    }

    .settings-box {
        position: absolute;
        left: 10px;
        color: white;
        bottom: 50px;
        border: 1px solid black;
        background-color: rgb(0, 0, 0, 0.8);
        padding: 1rem;
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
