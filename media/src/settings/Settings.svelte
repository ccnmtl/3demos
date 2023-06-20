<script>
    import { createEventDispatcher } from 'svelte';
    import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
    import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
    import { drawAxes, drawGrid, labelAxes, freeChildren } from '../utils';
    import { makeObject } from '../sceneUtils';
    import { vMin, vMax, colorMap, densityColormap } from '../stores';
    import WindowHeader from './WindowHeader.svelte';
    import { colorMapNames } from '../js-colormaps';
    import { offclick } from './offclick';
    import { get } from 'svelte/store';

    const dispatch = createEventDispatcher();

    export let scene, camera, render, controls;
    export let gridMax, gridStep;
    export let axesHolder, axesText, gridMeshes, lineMaterial, axesMaterial;
    export let animation = false;
    export let orthoCamera = false;
    export let encode;
    export let objects;
    export let socket;
    export let roomId;

    import { gridOn, scaleStore } from './settings-stores';

    console.log('setting loading...');

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

    const unlog = (s) => {
        return (
            Math.round(
                100 *
                    Math.pow(10, Math.floor(s)) *
                    Math.floor(Math.pow(10, s) / Math.pow(10, Math.floor(s)))
            ) / 100
        );
    };

    $: scala = unlog(scale);

    $: {
        // scale = $scaleStore;
        rescale(unlog($scaleStore));
    }

    $: {
        gridMeshes.visible = $gridOn;
        console.log('reacting to gridon');
        render();
    }

    const rescale = function (scala) {
        console.log("rescalereactin'", scala, $scaleStore);
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
            [axesText] = labelAxes(
                {
                    scene,
                    gridMax,
                    gridStep,
                    render,
                    axesText,
                },
                fontLoader,
                TextGeometry
            );

            if (gridMax !== oldGridMax) {
                animation = true;
                dispatch('animate');
            }
        }
        scale = Math.log10(scala);
    };

    let showSettings = false;
    let showUpload = false;

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
    };

    const makeFilename = () => {
        const formattedDate = new Date().toISOString().split('T')[0];
        return '3Demos-scene-' + formattedDate + '.json';
    };

    const downloadScene = () => {
        let json = JSON.stringify(objects);
        const blob = new Blob([json], { type: 'application/json' });
        let a = document.createElement('a');
        a.download = makeFilename();
        a.href = window.URL.createObjectURL(blob);
        a.click();
        a.remove();
    };
</script>

{#if showSettings}
    <div
        class="settings-box"
        class:grid={showSettings}
        id="settings-box"
        use:offclick
        on:offclick={() => {
            'caught offclick';
            showSettings = false;
        }}
    >
        <WindowHeader
            title="Settings"
            onClick={() => {
                showSettings = false;
            }}
        />

        <div class="row justify-content-between">
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
                        on:change={() => {
                            $scaleStore = scale;
                        }}
                    />
                    <span class="output text-end">{scala}</span>
                </span>
            </div>
        </div>
        <div class="form-check form-switch row mb-2">
            <label class="form-check-label" for="gridVisible">
                Grid
                <input
                    class="form-check-input"
                    type="checkbox"
                    name="gridVisible"
                    id="gridVisible"
                    role="switch"
                    aria-checked="true"
                    bind:checked={$gridOn}
                    on:change={render}
                />
            </label>
            <label class="form-check-label" for="orthoCamera">
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

        <div class="row py-1 mx-1">
            <div class="col-6 me-auto">
                <label for="colormap"
                    ><a
                        href="https://matplotlib.org/stable/gallery/color/colormap_reference.html#colormap-reference"
                        target="_blank">Color Map</a
                    ></label
                >
            </div>
            <div class="col-6 overflow-hidden">
                <input
                    type="text"
                    name="colormap"
                    id="colormap-select"
                    list="cmaps"
                    value={$colorMap}
                    on:input={(e) => {
                        const val = e.target.value;
                        // console.log('densemap update', val);
                        if (colorMapNames.includes(val)) {
                            $colorMap = e.target.value;
                        }
                    }}
                />
            </div>
            <datalist id="cmaps">
                {#each colorMapNames as cm}
                    <option value={cm} />
                {/each}
            </datalist>
        </div>
        <div class="row my-1 mx-1">
            <div class="col-6 me-auto">
                <label for="densitymap">Density C-Map</label>
            </div>
            <div class="col-6 overflow-hidden">
                <input
                    type="text"
                    name="densitymap"
                    id="densitymap-select"
                    list="cmaps"
                    value={$densityColormap}
                    on:input={(e) => {
                        const val = e.target.value;
                        // console.log('densemap update', val);
                        if (colorMapNames.includes(val)) {
                            $densityColormap = e.target.value;
                        }
                    }}
                />
            </div>
        </div>

        <div class="row align-items-center">
            <div class="col-6">
                <label class="col-5 my-1" for="vmin">vMin</label>
                <input
                    class="col-6 my-1"
                    id="vmin"
                    type="number"
                    bind:value={$vMin}
                />
                <label class="col-5 my-1" for="vmax">vMax</label>
                <input
                    class="col-6 my-1"
                    id="vmax"
                    type="number"
                    bind:value={$vMax}
                />
            </div>
            <div class="col-4">
                <button
                    class="button settings-button"
                    aria-label="Reset the vmin/vmax for coloring."
                    on:click={() => {
                        $vMin = -1;
                        $vMax = 1;
                        render();
                    }}
                >
                    Reset
                </button>
            </div>
        </div>
    </div>
{/if}
{#if showUpload}
    <div
        class="settings-box"
        class:grid={showUpload}
        use:offclick
        on:offclick={() => {
            showUpload = false;
        }}
        id="upload-box"
    >
        <WindowHeader
            title="Upload Scene"
            onClick={() => {
                showUpload = false;
            }}
        />

        <form>
            <label for="sceneUpload">Upload a scene</label>
            <br />
            <input
                id="sceneUpload"
                type="file"
                accept="application/json"
                on:change={(e) => {
                    uploadScene(e);
                }}
            />
        </form>
    </div>
{/if}

<div class="settings-buttons">
    <button
        class="button"
        id="settings"
        title="Settings"
        on:click={() => {
            // showUpload = false;
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
        id="upload"
        on:click={() => {
            showSettings = false;
            showUpload = !showUpload;
        }}
    >
        <i class="fa fa-upload" />
    </button>
    <button
        class="button"
        id="download"
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
            render();
        }}
    >
        <i class="fa fa-video" />
    </button>
    <button class="button" id="screenshot" title="Take screenshot">
        <i class="fa fa-camera" />
    </button>
    {#if roomId}
        <a href="/" class="button" title="Exit room">
            <i class="fa fa-sign-out-alt" />
        </a>
    {/if}
</div>

<!-- end .settings-buttons -->

<style>
    .button {
        background-color: transparent;
        border-width: 0rem;
        color: #333;
        font-size: 1.5rem;
        padding: 0.25rem 0.5rem;
        width: 3rem;
    }

    .settings-button {
        color: white;
    }

    .settings-buttons {
        text-align: right;
    }

    .settings-box {
        max-width: 20rem;
        position: relative;
        color: white;
        border: 1px solid black;
        background-color: rgb(0, 0, 0, 0.8);
        padding: 1rem;
    }

    .output {
        width: 2rem;
        text-align: right;
        font-family: 'Courier New', Courier, monospace;
    }
</style>
