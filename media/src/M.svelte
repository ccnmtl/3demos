<script>
    let { s, align = false, display = false, size } = $props();

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
            display = true;
            return `${textSize} \\begin{align} ${formula} \\end{align}`;
        }

        return `${textSize} ${formula}`;
    };

    $effect(async () => {
        if (span2) {
            let elem = await MathJax.tex2svgPromise(formatMJ(s), {
                display,
            });
            span2.replaceChildren(elem);
        }
    });
</script>

<span bind:this={span2} class="output"> </span>
