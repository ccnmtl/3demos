<script>
    import { onDestroy } from 'svelte';
    import { create, all } from 'mathjs';
    import { norm2 } from '../utils';
    import { demoObjects } from '../stores';

    import M from '../M.svelte';

    const config = {};
    const math = create(all, config);

    const backupObjects = [
        ...$demoObjects.map((obj) => {
            obj.selected = false;
            return obj;
        }),
    ];

    const vecId = crypto.randomUUID();

    onDestroy(() => {
        $demoObjects = [...backupObjects];
    });

    const texStrings = {
        r: '\\langle x(t), y(t), z(t) \\rangle',
        a: 'a',
        b: 'b',
    };

    // eslint-disable no-useless-escape

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
    let lengthApproximation = 0;

    const exampleCurves = [
        {
            uuid: crypto.randomUUID(),
            kind: 'curve',
            title: 'Helix',
            params: {
                a: '0',
                b: '4pi',
                x: 'cos(t)',
                y: 'sin(t)',
                z: 't / (4pi)',
            },
            color: '#CB44CB',
        },
        {
            uuid: crypto.randomUUID(),
            kind: 'curve',
            title: 'Crown',
            params: {
                a: '0',
                b: '2*pi',
                x: 'sin(t)',
                y: 'cos(t)',
                z: 'cos(3t)/3 + 1/2',
            },
            color: '#CB44CB',
        },
        {
            uuid: crypto.randomUUID(),
            kind: 'curve',
            title: 'Twist',
            params: {
                a: '-1.5',
                b: '1.5',
                x: 't',
                y: 't^2',
                z: 't^3',
            },
            color: '#CB44CB',
        },
        ...backupObjects.filter((obj) => obj.kind === 'curve'),
    ];

    let exTitle = null;
    let nVects = 3;
    // let firstVectorObject = null;

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
        const obj = exampleCurves.find((obj) => obj.title === title);
        if (!obj) return;
        const params = obj.params;
        const [X, Y, Z, A, B] = ['x', 'y', 'z', 'a', 'b'].map((c) =>
            math.parse(params[c])
        );
        texStrings.r =
            '\\begin{bmatrix} ' +
            X.toTex() +
            ' \\\\ ' +
            Y.toTex() +
            ' \\\\ ' +
            Z.toTex() +
            ' \\\\ \\end{bmatrix}';
        texStrings.a = A.toTex();
        texStrings.b = B.toTex();

        $demoObjects = [
            obj,
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
                    n1: nVects - 1,
                },
                color: '#BB0000',
            },
        ];
        // addVectors(nVects);
        let tot = 0;

        // WARNING: Mathematician coding style...
        const aa = A.evaluate();
        const bb = B.evaluate();
        const dt = (bb - aa) / nVects;
        for (let i = 0; i < nVects; i++) {
            const t = aa + i * dt;
            tot += norm2(
                X.evaluate({ t: t + dt }) - X.evaluate({ t }),
                Y.evaluate({ t: t + dt }) - Y.evaluate({ t }),
                Z.evaluate({ t: t + dt }) - Z.evaluate({ t })
            );
        }
        lengthApproximation = tot;
    };
</script>

<article {hidden}>
    <p>
        Suppose we have a curve <M>C</M> in space parameterized by a smooth function
        <M>{`\\mathbf{r}(t)`}</M> for <M>{`a \\leq t \\leq b`}</M> and we wish to
        know how long it is. That is, we want to compute the
        <b>arc length</b> of <M>C</M>.
    </p>

    <p>
        <span class="col-auto ml-2 mt-2"> Choose curve: </span>

        <select
            class="col-auto"
            name="choose-curve"
            id="choose-curve"
            bind:value={exTitle}
            on:change={() => {
                addCurve(exTitle);
            }}
        >
            {#each exampleCurves as { title }}
                <option value={title}>{title}</option>
            {/each}
        </select>
    </p>

    <M display>{`\\mathbf{r}(t) = ${texStrings.r}`}</M>
    <M display>{`${texStrings.a} \\leq t \\leq ${texStrings.b}`}</M>

    <p>
        We can estimate the length by selecting a finite number <M>
            {`N = ${nVects}`}
        </M>
        <span class="row">
            <input
                type="range"
                min="1"
                value={nVects}
                max="40"
                step="1"
                on:input={(e) => {
                    nVects = math.evaluate(e.target.value);
                    addCurve(exTitle);
                }}
            />
        </span>
        of positions along the curve and measuring the distance between them. To
        wit, we select a partition of <M>{'[a,b]'}</M>.:
    </p>

    <M align>
        {'t_0 &= a \\\\ t_1 &= a + \\Delta t \\\\ \\vdots  \\\\ t_N &= a + N \\Delta t = b \\\\'}
    </M>

    <p>
        where <M>{'\\Delta t = \\frac{b - a}{N} \\).'}</M>.
    </p>

    <p>Thus we can approximate arc length as</p>

    <M display>
        {`\\sum_{i = 1}^{${nVects}} |\\mathbf r(t_i) - \\mathbf r(t_{i - 1})|`}
    </M>
    <M display>
        {`\\approx ${Math.round(1000 * lengthApproximation) / 1000}.`}
    </M>

    <p>
        As <M>{'N \\to \\infty, \\Delta t \\to 0'}</M>, and this approximation
        becomes a Riemann sum (after multiplying and dividing by <M
            >{'\\Delta t'}</M
        >) converging to the exact arc length.
    </p>
    <p>
        That is, <M>
            {` \\sum\\limits_{i = 1}^{N} \\frac{|\\mathbf r(t_i) - \\mathbf r(t_{i - 1})|}{\\Delta t} \\Delta t \\to  `}
        </M>
        <span class="defin">
            <M display size="lg">{" \\int_a^b |\\mathbf r ' (t) |\\,dt "}</M>
        </span>
        which is the definition of arc length <M>s</M>.
    </p>
</article>

<style>
    select {
        background-color: blue;
        color: white;
        padding: 3px;
        margin: 3px;
    }

    .defin {
        background-color: green;
    }
</style>
