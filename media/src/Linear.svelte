<script>
    import katex from 'katex';
    import M from './M.svelte';
    import { v4 as uuidv4 } from "uuid";

    export let boxes = [];

    let hidden = false;

    const toggleHidden = function() {
        hidden = !hidden;
    }

    const addGraph = function(n) {
        boxes.push(funcs[n]);
    }

    const funcs = {
        smooth: {id: uuidv4(), kind: "graph", params: {
            a: "-2",
            b: "2",
            c: "-2",
            d: "2",
            z: "1/2 * exp(-(x - y^2 + 1)^2)",
        }},
    }

    addGraph("smooth");
</script>

<button class="top-title" on:click={toggleHidden}>
    Linearization
</button>
<article hidden={hidden}>

    <p>
        A <strong>linear function</strong> <M>L(x,y)</M> of two variables
        has the form
        {@html katex.renderToString('L(x,y) = a + bx + cy', {displayMode: true})}
        where {@html katex.renderToString('a,b,c \\in \\mathbb{R}')} are constants.
        Their graphs are planes with normal vector
        {@html katex.renderToString('\\mathbf{n} = \\langle -b, -c, 1 \\rangle')}.
    </p>

    <p>
        More generally, a linear function of <M>n</M> variables has the form
            {@html katex.renderToString(
            'L(x_1, x_2,\\ldots, x_n) = a_0 + \\sum_{i = 1}^n a_i x_i', {
            displayMode: true})}
        which we can cleverly rewrite using the associations
        {@html katex.renderToString('\\mathbf{x} = \\langle x_1, \\ldots, x_n \\rangle, a_0 = b, \\mathbf{m} = \\langle a_1, \\ldots, a_n \\rangle')}
as
        {@html katex.renderToString('L(\\mathbf{x}) = \\mathbf{m}\\cdot\\mathbf{x} + b.', {
        displayMode: true})}

    </p>

</article>
