<!-- @migration-task Error while migrating Svelte code: Can't migrate code with afterUpdate. Please migrate by hand. -->
<script>
    import { afterUpdate } from 'svelte';

    export let align = false;
    export let display = false;
    export let size = 'sm';

    let span, span2;
    /* global MathJax */

    const formatMJ = function (formula) {
        let textSize = size === 'lg' ? '\\Large' : '';

        if (align) {
            return `${textSize} \\begin{align} ${formula} \\end{align}`;
        }
        if (display) {
            return `\\[ ${textSize} ${formula} \\]`;
        }
        return `\\( ${textSize} ${formula} \\)`;
    };

    const render = async () => {
        span2.innerHTML = formatMJ(span.innerText, display, size);
        await MathJax.typesetPromise([span2]);
    };

    afterUpdate(render);
</script>

<span bind:this={span} class="input">
    <slot />
</span>

<span bind:this={span2} class="output" />

<style>
    .input {
        display: none;
    }
</style>
