<script>
    import M from './M.svelte';
    import { v4 as uuidv4 } from "uuid";

    export let boxes = [];

    let hidden = false;
    const texString1 = `\\( \\Large a,b,c \\in \\mathbb{R} \\)`;

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

<button
    class="btn btn-light"
    aria-label={(hidden ? 'Show' : 'Hide') + ' Linearization'}
    on:click={toggleHidden}
>
    Linearization
</button>
<article hidden={hidden}>

    <p>
        A <strong>linear function</strong> <M>L(x,y)</M> of two variables
        has the form
            <M display>L(x,y) = a + bx + cy</M>
        where {texString1} are constants.
        Their graphs are planes with normal vector
        <M>n = \langle -b, -c, 1 \rangle</M>.
    </p>

    <p>
        More generally, a linear function of <M>n</M> variables has the form
            <M display>{`L(x_1, x_2,\\ldots, x_n) = a_0 + \\sum_{i = 1}^n a_i x_i`}</M>
        which we can cleverly rewrite using the associations
        <!-- Less organized, equals signs do not line up. The screen reader 
            reads each line individually. I think it provides better pacing.
        -->
            <M display>x = \langle x_1, \ldots, x_n \rangle</M>
            <M display>a_0 = b</M>
            <M display>m = \langle a_1, \ldots, a_n \rangle</M>

        <!-- Alternative structure - More organized, but the screen reader 
            reads the whole statement at once which may lead to confusion.

            <M display>{`\\eqalign{
                x &= \\langle x_1, \\ldots, x_n \\rangle \\cr
                a_0 &= b \\cr
                m &= \\langle a_1, \\ldots, a_n \\rangle
            }`}</M>
        -->
        as <M>L(x) = m \cdot x + b</M>.

    </p>

</article>
