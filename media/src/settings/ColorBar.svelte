<script>
    import { onMount } from "svelte";
    import { blueUpRedDown } from "../utils";

    export let vMin = 0;
    export let vMax = 1;

    let container;
    let canvas;
    let labels;

    let vRange;

    onMount(() => {
        canvas.width = container.clientWidth / 2;
        canvas.height = container.clientHeight;

        const context = canvas.getContext("2d");

        // add linear gradient
        const grd = context.createLinearGradient(0, canvas.height, 0, 0);

        vRange = vMax - vMin;
        for (let x = 0; x <= 1; x += 0.125) {
            const hexString = blueUpRedDown(x * 2 - 1).getHexString();
            grd.addColorStop(x, "#" + hexString);
        }
        context.fillStyle = grd;
        context.fillRect(0, 0, canvas.width, canvas.height);
    });
</script>

<div class="container colorbar" bind:this={container}>
    <canvas id="colorbar" bind:this={canvas} />
    <div class="colorBarTextContainer" bind:this={labels}>
        {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as x}
            <div class="colorBarText" style={`${12.5 * x}%`}>
                {(Math.round((vMin + x * vRange) * 100) / 100).toString()}
            </div>
        {/each}
    </div>
</div>

<style>
    .colorbar {
        height: 60%;
        width: 50px;
        position: absolute;
        right: 20px;
        top: 20%;
        z-index: 50;
        display: block;
    }

    canvas {
        height: 100%;
    }

    .colorBarText {
        left: 0px;
        vertical-align: text-top;
    }
</style>
