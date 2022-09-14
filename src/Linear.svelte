<script>

    import katex from 'katex';
    import M from './M.svelte';
    import Md from './Md.svelte';
    import { v4 as uuidv4 } from "uuid";
    import { create, all } from "mathjs";

    const config = {};
    const math = create(all, config);

    export let boxes;

    let hidden = false;

    function toggleHidden() {
        hidden = !hidden;
    }

    function addGraph(n) {
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

<h1 class="top-title" on:click={toggleHidden}>Linearization</h1>
<article class:hidden>

    <p>
        A <strong>linear function</strong> <M>L(x,y)</M> of two variables
        has the form <Md>
            L(x,y) = a + bx + cy
        </Md> where <M>a,b,c \in \mathbb{R}</M> are constants.
        Their graphs are planes with normal vector
        <M>\mathbf{n} = \langle -b, -c, 1 \rangle</M>.
    </p>

    <p>
        More generally, a linear function of <M>n</M> variables has the form <Md>
            L(x_1, x_2,\ldots, x_n) = a_0 + \sum_{i = 1}^n a_i x_i
        </Md> which we can cleverly rewrite using the associations <M>\mathbf{x} = \langle x_1, \ldots, x_n \rangle, a_0 = b, \mathbf{m} = \langle a_1, \ldots, a_n \rangle  </M> as <Md>
            L(\mathbf{x}) = \mathbf{m}\cdot\mathbf{x} + b.
        </Md>
    </p>

</article>

<style>
    article {
        color: white;
        background-color: rgba(.5,.5,.5,.3);
    }

    /* .hidden {
        display: none;
    } */

    .top-title {
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        user-select: none;
    }
</style>
