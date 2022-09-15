<script>
    import {
        drawAxes,
        drawGrid,
        labelAxes,
        freeChildren
    } from "./utils";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let scene, camera, render, controls, controls2;
    export let gridMax, gridStep;
    export let axesHolder, axesText, gridMeshes, lineMaterial, axesMaterial;
    export let animation = false;
    export let update;
    export let orthoCamera = false;
    export let encode;

    let newGridMeshes;
    const newLineMaterial = lineMaterial.clone();
    newLineMaterial.polygonOffset = true;
    newLineMaterial.polygonOffsetFactor = 0.1;
    // scene.add(newGridMeshes);

    console.log(lineMaterial === newLineMaterial, "comp meshes");

    update = (dt) => {
        const s = (scaleState - oldGridMax) / (gridMax - oldGridMax);
        if ((gridMax - scaleState) * (scaleState - oldGridMax) >= 0) {
            // freeChildren(gridMeshes);
            // gridMeshes.copy(drawGrid( {lineMaterial, gridMax: scaleState, gridStep: scaleState / 10}));

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
        100 *
            Math.pow(10, Math.floor(scale)) *
            Math.floor(Math.pow(10, scale) / Math.pow(10, Math.floor(scale)))
    ) / 100;

    function rescale() {
        if (scala !== gridMax) {
            oldGridMax = scaleState;
            gridMax = scala;
            gridStep = gridMax / 10;

            // freeChildren(gridMeshes);

            // gridMeshes.copy(drawGrid( {lineMaterial, gridMax, gridStep}));

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
            // newLineMaterial.opacity = 0;

            // Fonts

            [axesText] = labelAxes({
                scene,
                gridMax,
                gridStep,
                render,
                axesText,
            });

            // camera.position.multiplyScalar(gridMax / oldGridMax);
            if (gridMax !== oldGridMax) {
                animation = true;
                // console.log("New GridMax", gridMax, scaleState, oldGridMax);
                dispatch("animate");
            }
        }
    }

    let showSettings = false;
</script>

<div
    class="settings-box"
    class:grid={showSettings}
    class:hidden={!showSettings}
    id="settings-box"
    >
    <span class="box-1">
        <strong>Settings</strong>
    </span>
    <span
        on:click={() => {
        showSettings = false;
        }}
        class="button box-3 text-right"><i class="fa fa-window-close" /></span
                                                                            >

    <span class="box-1 text-right">scale</span>
    <span class="box-23"
          ><input
               type="range"
               name="scale"
               id="scale"
               min="-2"
               max="3"
               step=".02"
               bind:value={scale}
               on:change={rescale}
               /><span class="output">{scala}</span></span
                                                        >

    <span class="box-1 text-right">grid</span>
    <label class="switch box-2">
        <input
            type="checkbox"
            name="gridVisible"
            id="gridVisible"
            bind:checked={gridMeshes.visible}
            on:change={render}
            />
        <span class="slider round" />
    </label>

    <span class="box-1 text-right">ortho/proj</span>
    <label class="switch box-2">
        <input
            type="checkbox"
            name="orthoCamera"
            id="orthoCamera"
            bind:checked={orthoCamera}
            on:change={render}
            />
        <span class="slider round" />
    </label>
</div>

<button
    class="button"
    id="settings"
    title="Settings"
    on:click={() => {
    showSettings = !showSettings;
    }}><i class="fa fa-cog" /></button
                                  >
<button class="button" id="encodeURL" title="Encode URL" on:click={encode}
        ><i class="fa fa-barcode" /></button
                                        >
<button
    class="button"
    id="cameraReset"
    title="Reset camera"
    on:click={() => {
    // console.log();
    controls.target.set(0, 0, 0);
    controls2.target.set(0, 0, 0);
    render();
    }}><i class="fa fa-video-camera" /></button
                                           >
<button class="button" id="screenshot" title="Take screenshot"
        ><i class="fa fa-camera" /></button
                                       >
<button class="button" id="presentation" title="Presentation mode"
        ><i class="fa fa-television" /></button
                                           >

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

    /* The switch - the box around the slider */
    .switch {
        position: relative;
        display: inline-block;
        width: 2em;
        height: 1.2em;
        text-align: right;
    }

    /* Hide default HTML checkbox */
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    /* The slider */
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 1em;
        width: 1em;
        left: 0.1em;
        bottom: 0.1em;
        background-color: white;
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    input:checked + .slider {
        background-color: #2196f3;
    }

    input:focus + .slider {
        box-shadow: 0 0 1px #2196f3;
    }

    input:checked + .slider:before {
        -webkit-transform: translateX(1em);
        -ms-transform: translateX(1em);
        transform: translateX(1em);
    }

    /* Rounded sliders */
    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
