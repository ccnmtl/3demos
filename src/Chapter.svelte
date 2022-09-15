<script>
    import katex from 'katex';
    import M from './M.svelte';
    import { v4 as uuidv4 } from "uuid";
    import { create, all } from "mathjs";

    const config = {};
    const math = create(all, config);

    export let boxes;
    let curveId, r = (t) => { return {x: t, y: t, z: t}};
    const texStrings = {
        r: "\\langle t, t, t \\rangle",
        a: "-1.5",
        b: "-1.5"
    };

    const texString1 = `\\mathbf{r}(t) = ${texStrings.r}`;
    const texString2 = `${texStrings.a} \\leq ${texStrings.b}`;

    const texString3 = `
            \\begin{align*}
            t_0 &= a \\\\
            t_1 &= a + \\Delta t \\\\
            \ &\\vdots \\\\
            t_i &= a + i \\Delta t \\\\
            \ &\\vdots \\\\
            t_n &= a + n \\Delta t = b
            \\end{align*}`;

    let formula = String.raw`\frac{n^k}{k!}`;

    let nSteps=1, selectedCurve;

    // let s = String.raw`with some <M> \iint_{\partial{\Sigma }} \mathbb F \cdot d\vec S</M> in it.`
    // console.log(s.replace(/(<\s*M\s*>.*?){(.*<\s*\/\s*M\s*>)/g, '$1 &lbrace; $2'));
    // s.replace(/(<Md?>)(.*?)(<\/Md?>)/g,(match,p1,p2,p3) => {
    //     console.log(p1 + p2.split('').map(i => {
    //         switch (i) {
    //             case '{':
    //                 return '&lbrace;';
    //                 break;
    //             case '}':
    //                 return '&rbrace;';
    //                 break;

    //             default:
    //                 return i;
    //                 break;
    //         }
    //     }).join('') + p3)
    // });

    let hidden = false;

function toggleHidden() {
    hidden = !hidden;
}

const exampleCurveParams = [
    {
        a: "0",
        b: "2*pi",
        x: "sin(t)",
        y: "cos(t)",
        z: "cos(3t)/3 + 1/2",
        tau: 0,
        nX: 30,
    },
    {
        a: "-1.5",
        b: "1.5",
        x: "t",
        y: "t^2",
        z: "t^3",
        tau: 0,
        nX: 30,
    }
]

function addCurve(selection = 1) {
    if (boxes.filter((b) => curveId === b.id).length > 0) {
        boxes = boxes.filter((b) => curveId != b.id);
        curveId = null;
        selectedCurve = null
    } else {
        const params = exampleCurveParams[selection];
        const [X,Y,Z,A,B] = ["x","y","z","a","b"].map((c) => math.parse(params[c]));
        curveId = uuidv4();
        selectedCurve = selection;

        boxes = [...boxes, {id: curveId, kind: "curve", params, }];
        r = (t) => {return {
            x: X.evaluate({t: t}),
            y: Y.evaluate({t: t}),
            z: Z.evaluate({t: t}),
        }};
        texStrings.r = "\\left \\langle " + X.toTex() + ", " + Y.toTex()  + ", " + Z.toTex() + "\\right \\rangle";
        texStrings.a = A.toTex();
        texStrings.b = B.toTex();
    }
}

</script>

<h1 class="top-title" on:click={toggleHidden}>Arc Length &amp; Curvature</h1>
<article class:hidden>

    <p>Suppose we have a curve <M>C</M> in space parameterized by a smooth function <M>\mathbf r(t)</M> for <M>a \leq t \leq b</M> and we wish to know how long it is. That is, we want to compute the <b>arc length</b> of <M>C</M>.</p>

    <p>Select an example: <span on:click={() => addCurve(0)}>crown</span> | <span on:click={() => addCurve(1)}>twist</span> </p>

    <div>{@html katex.renderToString(texString1, {displayMode: true})}</div>
    <div>{@html katex.renderToString(texString2, {displayMode: true})}</div>

    <p>
        We can estimate the length by selecting a finite
        number <M>N</M> of positions along the curve and measuring the
        distance between them. To wit, we select a partition of <M>[a, b]</M>:
    </p>

    <div>{@html katex.renderToString(texString3, {displayMode: true})}</div>

    <p>
        where <M>\Delta t = \frac{b - a}{N}</M>
    </p>

    <input type="range" bind:value={nSteps} min="1" max="30" step="1" />

    <input type="text" bind:value="{formula}" />
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
