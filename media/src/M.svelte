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
            return `${textSize} \\begin{align} ${formula} \\end{align}`;
        }

        return `${textSize} ${formula}`;
    };
</script>

<span bind:this={span2} class="output">
    {@html MathJax.tex2svg(formatMJ(s), {
        display,
    }).innerHTML}
</span>
