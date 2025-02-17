<script>
    import { onMount } from 'svelte';
    import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
    import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
    import {
        drawAxes,
        drawGrid,
        labelAxes,
        freeChildren,
        scaleExp,
        filterBang,
    } from '../utils';
    import {
        vMin,
        vMax,
        colorMap,
        densityColormap,
        viewScale,
    } from '../stores';
    import { demoObjects } from '../states.svelte';
    import WindowHeader from './WindowHeader.svelte';
    import { colorMapNames } from '../js-colormaps';
    import { offclick } from './offclick';
    import Kbd from './Kbd.svelte';

    export let isMobileView;
    export let scene, camera, render, controls;
    export let gridMax, gridStep;
    export let axesHolder, gridMeshes, lineMaterial, axesMaterial, axesText;
    export let animation = false;
    export let animate = () => {};
    export let switchCamera;
    export let encode;
    // export let socket;
    export let roomId;

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
                ((gridMax - oldGridMax) * dt + scaleState) / scaleState,
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

    // These duplicate their non-Temp counterpart but are only for display which updates on moving input bar, though value only updates on change event.
    let scaleTemp = 0;
    $: scalaTemp = scaleExp(scaleTemp);

    let scala;

    const rescale = function () {
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
                TextGeometry,
            );

            if (gridMax !== oldGridMax) {
                animation = true;
                animate();
            }
        }
    };

    let showSettings = false;
    let showUpload = false;
    let showKbd = false;

    const uploadScene = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            let upload = [];
            try {
                upload = JSON.parse(evt.target.result);
            } catch (SyntaxError) {
                alert('Improper JSON formatting');
                return;
            }
            if (upload.length < 33) {
                // Check for missing uuid in upload
                upload = upload.map((item) => {
                    return { ...item, uuid: item.uuid || crypto.randomUUID() };
                });
                filterBang((item) => {
                    return !upload.map((ob) => ob.uuid).includes(item.uuid);
                }, demoObjects);
                demoObjects.push(...upload);
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
        let json = JSON.stringify(demoObjects);
        const blob = new Blob([json], { type: 'application/json' });
        let a = document.createElement('a');
        a.download = makeFilename();
        a.href = window.URL.createObjectURL(blob);
        a.click();
        a.remove();
    };

    onMount(() => {
        const unsubscribe = viewScale.subscribe((value) => {
            scala = scaleExp(value);
            console.log('scale updated', scala);
            rescale();
        });
        console.log('setting mounted');
        scaleTemp = $viewScale;
        return unsubscribe;
    });
    window.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }
        switch (e.key) {
            case '?':
                showKbd = !showKbd;
                showUpload = false;
                showSettings = false;
                break;
        }
    });
</script>

{#if showSettings}
    <div
        class="settings-box"
        class:grid={showSettings}
        id="settings-box"
        use:offclick
        onoffclick={() => {
            'caught offclick';
            showSettings = false;
        }}
    >
        <WindowHeader
            title="Settings"
            onClick={() => {
                showSettings = false;
                document.getElementById('settings').focus();
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
                        bind:value={scaleTemp}
                        onchange={(e) => {
                            $viewScale = e.target.value;
                        }}
                    />
                    <span class="output text-end">{scalaTemp}</span>
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
                    bind:checked={gridMeshes.visible}
                    onchange={render}
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
                    onchange={(e) => {
                        console.log(e.target);
                        switchCamera(e.target.checked);
                        render();
                    }}
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
                    oninput={(e) => {
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
                    <option value={cm}>{cm}</option>
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
                    oninput={(e) => {
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
                    onclick={() => {
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
        onoffclick={() => {
            showUpload = false;
        }}
        id="upload-box"
    >
        <WindowHeader
            title="Upload Scene"
            onClick={() => {
                showUpload = false;
                document.getElementById('upload').focus();
            }}
        />

        <form>
            <label for="sceneUpload">Upload a scene</label>
            <br />
            <input
                id="sceneUpload"
                type="file"
                accept="application/json"
                onchange={(e) => {
                    uploadScene(e);
                }}
            />
        </form>
    </div>
{/if}
{#if showKbd}
    <div
        class="settings-box"
        class:grid={showUpload}
        use:offclick
        onoffclick={(e) => {
            showKbd = false;
            console.log('offclickd', e);
        }}
        id="shortcut-box"
    >
        <WindowHeader
            title="Shortcuts"
            onClick={() => {
                showKbd = false;
                document.getElementById('keyboard').focus();
            }}
        />

        <Kbd></Kbd>
    </div>
{/if}

<div class="settings-buttons" class:mobile={isMobileView}>
    <button
        class="button"
        id="settings"
        title="Settings"
        onclick={() => {
            showUpload = false;
            showKbd = false;
            showSettings = !showSettings;
        }}
        aria-label="Settings"
    >
        <i class="fa fa-cog"></i>
    </button>
    <button
        class="button"
        id="encodeURL"
        title="Encode URL"
        onclick={encode}
        aria-label="Encode scene in URL"
    >
        <i class="fa fa-barcode"></i>
    </button>
    <button
        class="button"
        title="Upload Scene"
        id="upload"
        onclick={() => {
            showSettings = false;
            showUpload = !showUpload;
            showKbd = false;
        }}
        aria-label="Load scene from file"
    >
        <i class="fa fa-upload"></i>
    </button>
    <button
        class="button"
        id="download"
        title="Download Scene"
        onclick={downloadScene}
        aria-label="Save scene as JSON file"
    >
        <i class="fa fa-download"></i>
    </button>
    <button
        class="button"
        id="cameraReset"
        title="Reset camera"
        onclick={() => {
            controls.target.set(0, 0, 0);
            render();
        }}
        aria-label="Recenter camera"
    >
        <i class="fa fa-video"></i>
    </button>
    <button
        class="button"
        id="screenshot"
        title="Take screenshot"
        aria-label="Take screenshot"
    >
        <i class="fa fa-camera"></i>
    </button>
    <button
        class="button"
        title="Keyboard Shortcuts"
        id="keyboard"
        onclick={(e) => {
            showSettings = false;
            showUpload = false;
            showKbd = !showKbd;
            console.log('clickety', e);
        }}
        aria-label="Show keyboard shortcuts"
    >
        <i class="fa fa-keyboard"></i>
    </button>
    {#if roomId}
        <a href="/" class="button" title="Exit room" aria-label="Exit room">
            <i class="fa fa-sign-out-alt"></i>
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

    .settings-buttons.mobile {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .settings-box {
        max-width: 30rem;
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
