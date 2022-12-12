<script>
    import { afterUpdate, onMount } from "svelte";

    export let display = false;
    export let size = '';

    let span, span2;
    /* global MathJax */

    const formatMJ = function(formula, display, size) {
        let text = '\\Large';
        if (size === 'sm') {
            text = '';
        }
        if (display) {
            return `$$ \\Large ${formula} $$`;
        } else {
            return `\\( ${text} ${formula} \\)`;
        }
    }

    const render = () => {
        span2.innerHTML = formatMJ(
            span.innerText,
            display,
            size
            );
        MathJax.typesetPromise();
    }

    onMount(render);
    afterUpdate(render);
</script>

<span bind:this={span} class="input">
    <slot />
</span>

<span bind:this={span2} class="output"></span>

<style>
    .input {
        display: none;
    }
</style>
