<script>
    import M from './M.svelte';
    import { v4 as uuidv4 } from "uuid";
    import { create, all } from "mathjs";

    const config = {};
    const math = create(all, config);

    export let boxes = [];
    let curveId = (t) => { return {x: t, y: t, z: t}};
    const texStrings = {
        r: "\\langle t, t, t \\rangle",
        a: "-1.5",
        b: "-1.5"
    };

    const texString1 = `r(t) = ${texStrings.r}`;
    const texString2 = `${texStrings.a} \\leq ${texStrings.b}`;

    // eslint-disable no-useless-escape

    /**
     * Less organized, equals signs do not line up. The screen reader reads 
     * each line individually. I think it provides better pacing.
    */
    const texString3 = `\\dot{x} = \\sigma(y-x)`;
    const texString4 = `\\dot{y} = \\rho x - y - xz`;
    const texString5 = `\\dot{z} = -\\beta z + xy`;
    const texString6 = `\\( \\Large \\Delta t = \\frac{b - a}{N} \\)`;

    /**
     * Alternative structure - More organized, but the screen reader reads the
     * whole statement at once which may lead to confusion.
     * const texString3 = `
        \\eqalign{
            \\dot{x} & = \\sigma(y-x) \\cr
            \\dot{y} & = \\rho x - y - xz \\cr
            \\dot{z} & = -\\beta z + xy
        }`;
     */

    // eslint-enable

    let formula = String.raw`\frac{n^k}{k!}`;

    let nSteps=1;

    let hidden = false;

    const toggleHidden = function() {
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

    const addCurve = function(selection = 1) {
        if (boxes.filter((b) => curveId === b.id).length > 0) {
            boxes = boxes.filter((b) => curveId != b.id);
            curveId = null;
        } else {
            const params = exampleCurveParams[selection];
            const [X,Y,Z,A,B] = ["x","y","z","a","b"].map((c) => 
                                    math.parse(params[c]));
            curveId = uuidv4();

            boxes = [...boxes, {id: curveId, kind: "curve", params, }];
            texStrings.r = "\\left \\langle " + X.toTex() + ", " + Y.toTex() +
                           ", " + Z.toTex() + "\\right \\rangle";
            texStrings.a = A.toTex();
            texStrings.b = B.toTex();
        }
    }

    </script>

<button 
    class="btn btn-light"
    aria-label={(hidden ? 'Show' : 'Hide') + ' Arc Length and Curvature'}
    on:click={toggleHidden}
>
    Arc Length &amp; Curvature
</button>
<article hidden={hidden}>

    <p>
        Suppose we have a curve <M>C</M> in space parameterized by a smooth 
        function <M>r(t)</M> for <M>a \leq t \leq b</M> and we wish 
        to know how long it is. That is, we want to compute the 
        <b>arc length</b> of <M>C</M>.
    </p>

    <p>Select an example: 
        <button 
            on:click={() => addCurve(0)}
            class="btn btn-light"
        >
            Crown
        </button>
        <button 
            on:click={() => addCurve(1)}
            class="btn btn-light"
        >
            Twist
        </button>
    </p>

    <M display>{texString1}</M>
    <M display>{texString2}</M>

    <p>
        We can estimate the length by selecting a finite number <M>N</M> of 
        positions along the curve and measuring the distance between them. To 
        wit, we select a partition of <M>[a, b]</M>:
    </p>

    <M display>{texString3}</M>
    <M display>{texString4}</M>
    <M display>{texString5}</M>

    <p>
        where {texString6}
    </p>

    <input type="range" bind:value={nSteps} min="1" max="30" step="1" />

    <input type="text" bind:value="{formula}" />
</article>
