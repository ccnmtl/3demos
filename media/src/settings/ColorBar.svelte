<script>
    import { blueUpRedDown } from '../utils';

    let { vMin = 0, vMax = 1, cmap = 'gist_earth' } = $props();

    let container;
    let canvas;
    let labels;

    let vRange = $derived(vMax - vMin);

    $effect(() => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight / 2;

        const context = canvas.getContext('2d');

        // add linear gradient
        const grd = context.createLinearGradient(0, 0, canvas.width, 0);

        for (let x = 0; x <= 1; x += 0.001) {
            const hexString = blueUpRedDown(
                x * 2 - 1,
                0.8,
                cmap,
            ).getHexString();
            grd.addColorStop(x, '#' + hexString);
        }
        context.fillStyle = grd;
        context.fillRect(0, 0, canvas.width, canvas.height);
    });
</script>

<div class="container colorbar" bind:this={container}>
    <canvas id="colorbar" bind:this={canvas}></canvas>
    <div class="colorBarTextContainer" bind:this={labels}>
        {#each [0, 1, 2, 3, 4] as x}
            <span class="colorBarText" style="left: {(100 * x) / 4}%">
                {(Math.round((vMin + (x / 4) * vRange) * 100) / 100).toString()}
            </span>
        {/each}
    </div>
</div>

<style>
    .colorbar {
        height: 50%;
        width: 90%;
        z-index: 50;
    }

    canvas {
        width: 100%;
    }

    .colorBarTextContainer {
        display: flex;
        justify-content: space-between;
    }

    .colorBarText {
        top: 1px;
        font-family: monospace;
    }
</style>
