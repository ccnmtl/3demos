<script>
    import M from '../M.svelte';
    import { create, all } from 'mathjs';
    import {
        ButtonDropdown,
        DropdownItem,
        DropdownMenu,
        DropdownToggle,
    } from 'sveltestrap';

    const config = {};
    const math = create(all, config);

    export let objects = [];

    const texStrings = {
        r: '\\langle x(t), y(t), z(t) \\rangle',
        a: 'a',
        b: 'b',
    };

    // eslint-disable no-useless-escape

    /**
     * Less organized, equals signs do not line up. The screen reader reads
     * each line individually. I think it provides better pacing.
     */

    const texString = `\\( \\Large \\Delta t = \\frac{b - a}{N} \\)`;

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

    let hidden = false;
    let nVectsElement;
    let lengthApproximation = 0;

    const toggleHidden = function () {
        hidden = !hidden;
    };

    const exampleCurveParams = {
        Crown: {
            a: '0',
            b: '2*pi',
            x: 'sin(t)',
            y: 'cos(t)',
            z: 'cos(3t)/3 + 1/2',
            color: '#CB44CB',
        },
        Twist: {
            a: '-1.5',
            b: '1.5',
            x: 't',
            y: 't^2',
            z: 't^3',
        },
        Helix: {
            a: '0',
            b: '4pi',
            x: 'cos(t)',
            y: 'sin(t)',
            z: 't / (4pi)',
        },
    };

    let exTitle = null;
    let exId = null;
    let vecId = null;
    let nVects = 10;
    let firstVectorObject = null;

    const toN = (
        nVects,
        plusOne = false,
        A = math.parse('0'),
        B = math.parse('1')
    ) => {
        return (node) => {
            if (node.isSymbolNode && node.name === 't') {
                // console.log('I got one!', node.toString());
                return math.parse(
                    `${A.toString()} + ${
                        plusOne ? '(n + 1)' : 'n'
                    } * ((${B.toString()}) - (${A.toString()})) / ${nVects}`
                );
            } else {
                return node;
            }
        };
    };

    const addCurve = function (title) {
        exTitle = title;
        const params = exampleCurveParams[title];
        const [X, Y, Z, A, B] = ['x', 'y', 'z', 'a', 'b'].map((c) =>
            math.parse(params[c])
        );
        texStrings.r =
            '\\left \\langle ' +
            X.toTex() +
            ', ' +
            Y.toTex() +
            ', ' +
            Z.toTex() +
            '\\right \\rangle';
        texStrings.a = A.toTex();
        texStrings.b = B.toTex();

        objects = objects.filter((b) => b.uuid !== exId && b.uuid !== vecId);
        exId = crypto.randomUUID();
        vecId = crypto.randomUUID();
        objects = [
            ...objects,
            { uuid: exId, kind: 'curve', params },
            {
                uuid: vecId,
                kind: 'vector',
                params: {
                    a: new math.OperatorNode('-', 'subtract', [
                        X.transform(toN(nVects, true, A, B)),
                        X.transform(toN(nVects, false, A, B)),
                    ]),
                    b: new math.OperatorNode('-', 'subtract', [
                        Y.transform(toN(nVects, true, A, B)),
                        Y.transform(toN(nVects, false, A, B)),
                    ]),
                    c: new math.OperatorNode('-', 'subtract', [
                        Z.transform(toN(nVects, true, A, B)),
                        Z.transform(toN(nVects, false, A, B)),
                    ]),
                    x: X.transform(toN(nVects, false, A, B)),
                    y: Y.transform(toN(nVects, false, A, B)),
                    z: Z.transform(toN(nVects, false, A, B)),
                    n0: 0,
                    n1: nVects,
                },
            },
        ];
        addVectors(nVects);
    };

    const addVectors = function (num) {
        const [v] = objects.filter((b) => b.uuid == vecId);
        console.log(v);
        v.n1 = num;
        objects = [...objects];
    };
    //     if (exTitle) {
    //         // clear out old vectors
    //         if (firstVectorObject) {
    //             objects.splice(objects.indexOf(firstVectorObject), nVects);
    //         }

    //         const params = exampleCurveParams[exTitle];
    //         const [X, Y, Z, A, B] = ['x', 'y', 'z', 'a', 'b'].map((c) =>
    //             math.parse(params[c])
    //         );
    //         const a = A.evaluate(),
    //             b = B.evaluate();
    //         const dt = (b - a) / num;

    //         const vecs = [];

    //         lengthApproximation = 0;
    //         let x0 = X.evaluate({ t: a });
    //         let y0 = Y.evaluate({ t: a });
    //         let z0 = Z.evaluate({ t: a });
    //         let x1, y1, z1;

    //         for (let i = 0; i < num; i++) {
    //             x1 = X.evaluate({ t: a + (i + 1) * dt });
    //             y1 = Y.evaluate({ t: a + (i + 1) * dt });
    //             z1 = Z.evaluate({ t: a + (i + 1) * dt });

    //             vecs.push({
    //                 uuid: crypto.randomUUID(),
    //                 kind: 'vector',
    //                 params: {
    //                     a: (x1 - x0).toString(),
    //                     b: (y1 - y0).toString(),
    //                     c: (z1 - z0).toString(),
    //                     x: x0.toString(),
    //                     y: y0.toString(),
    //                     z: z0.toString(),
    //                     show: false,
    //                 },
    //             });

    //             lengthApproximation += Math.sqrt(
    //                 (x1 - x0) * (x1 - x0) +
    //                     (y1 - y0) * (y1 - y0) +
    //                     (z1 - z0) * (z1 - z0)
    //             );

    //             x0 = x1;
    //             y0 = y1;
    //             z0 = z1;
    //         }
    //         firstVectorObject = num > 0 ? vecs[0] : null;
    //         nVects = num;

    //         objects = [...objects, ...vecs];
    //     }
    // };
</script>

<button
    class="btn btn-light"
    aria-label={(hidden ? 'Show' : 'Hide') + ' Arc Length and Curvature'}
    on:click={toggleHidden}
>
    Arc Length &amp; Curvature
</button>
<article {hidden}>
    <p>
        Suppose we have a curve <M>C</M> in space parameterized by a smooth function
        <M>{`\\mathbf{r}(t)`}</M> for <M>a \leq t \leq b</M> and we wish to know
        how long it is. That is, we want to compute the
        <b>arc length</b> of <M>C</M>.
    </p>

    <p class="row">
        <ButtonDropdown class="col-auto">
            <DropdownToggle caret class="btn btn-light dropdown-toggle">
                Examples
            </DropdownToggle>
            <DropdownMenu>
                {#each Object.keys(exampleCurveParams) as title}
                    <DropdownItem on:click={() => addCurve(title)}>
                        {title}
                    </DropdownItem>
                {/each}
                <!-- <DropdownItem on:click={() => addCurve(1, "Twist")}>
                    Twist
                </DropdownItem> -->
            </DropdownMenu>
        </ButtonDropdown>
        <span class="col-auto ml-2 mt-2">
            {exTitle ? 'Currently viewing: ' + exTitle : ''}
        </span>
    </p>

    <M display>{`\\mathbf{r}(t) = `} {texStrings.r}</M>
    <M display>{texStrings.a} {`\\leq t \\leq`} {texStrings.b}</M>

    <p>
        We can estimate the length by selecting a finite number <M
            >N =
            {nVects}</M
        >
        <input
            bind:this={nVectsElement}
            type="range"
            min="0"
            value="0"
            max="20"
            step="1"
            on:change={(e) => {
                console.log(e);
                nVects = math.evaluate(e.target.value);
                // addVectors(nVects);
                addCurve(exTitle);
            }}
        />
        of positions along the curve and measuring the distance between them. To
        wit, we select a partition of <M>[a, b]</M>:
    </p>
    <M display
        >{`t_0 = a \\quad t_1 = a + \\Delta t\\quad \\ldots \\quad t_N = a + N \\Delta t = b`}</M
    >

    <p>
        where {texString}.
    </p>

    <p>Thus we can approximate</p>
    <M display>
        {`\\text{Arc length} \\approx \\sum_{i = 1}^{${nVects}} |\\mathbf r(t_i) - \\mathbf r(t_{i - 1})| \\approx ${
            Math.round(1000 * lengthApproximation) / 1000
        }.`}
    </M>
</article>
