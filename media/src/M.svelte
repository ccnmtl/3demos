<script>
    import { onMount, tick } from 'svelte';

    let { align, display, size, children } = $props();

    let span, span2;
    /* global MathJax */

    const formatMJ = function (formula) {
        const textSizes = {
            lg: '\\Large',
            sm: '\\small',
            ti: '\\tiny',
        };

        const textSize = textSizes[size] || '';

        if (align) {
            return `${textSize} \\begin{align} ${formula} \\end{align}`;
        }
        if (display) {
            return `\\[ ${textSize} ${formula} \\]`;
        }
        return `\\( ${textSize} ${formula} \\)`;
    };

    const render = async () => {
        // console.log('M render', children());
        span2.innerHTML = formatMJ(span.innerText, display, size);
        await MathJax.typesetPromise([span2]);
    };

    onMount(render);
</script>

<span bind:this={span} class="input">
    {@render children()}
</span>

<span bind:this={span2} class="output"></span>

<style>
    .input {
        display: none;
    }
</style>
