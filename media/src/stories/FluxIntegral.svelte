<script>
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import * as THREE from 'three';

    import { all, create } from 'mathjs';
    import M from '../M.svelte';
    import {
        filterBang,
        FluxBoxEdgesGeometry,
        FluxBoxGeometry,
        gaussLegendre,
    } from '../utils';
    import { onMount, onDestroy } from 'svelte';
    // import { createEventDispatcher } from 'svelte';

    // const dispatch = createEventDispatcher();

    import { tickTock } from '../stores';
    import { demoObjects } from '../states.svelte';

    export let scene;
    export let render;
    // export let objects;

    const config = {};
    const math = create(all, config);

    let animation = false;
    let last = null;
    let sampleParam = 0;

    const drawNext = (currentTime) => {
        // const currentTime = $tickTock;
        last = last || currentTime;
        tau += currentTime - last;
        tau %= 1;
        updateTau(tau);
        last = currentTime;
    };

    $: if (animation) drawNext($tickTock);

    const drawFirst = (anim) => {
        currentField.animation = anim;
    };

    $: drawFirst(animation);

    const backupObjects = demoObjects.map((obj) => {
        obj.selected = false;
        return obj;
    });

    const exampleSurfaces = [
        {
            uuid: 'flux-story-example-001-',
            kind: 'surface',
            title: 'Curved Wall',
            params: {
                a: '0',
                b: 'pi',
                c: '0',
                d: '1',
                x: 'cos(u) / 2',
                y: 'sin(u) ',
                z: 'v',
                t0: '0',
                t1: '1',
            },
            color: '#CB44CB',
        },
        {
            uuid: 'flux-story-example-000-',
            kind: 'surface',
            title: 'Flat Square',
            params: {
                a: '0',
                b: '1',
                c: '0',
                d: '1',
                x: '(1-u) / sqrt(2)',
                y: 'u / sqrt(2)',
                z: 'v',
                t0: '0',
                t1: '1',
            },
            color: '#CB44CB',
        },
        {
            uuid: 'flux-story-example-002-',
            kind: 'surface',
            title: 'Dome',
            params: {
                a: '0',
                b: 'pi / 2',
                c: '0',
                d: 'pi',
                x: 'sin(u) cos(v)',
                y: 'sin(u) sin(v)',
                z: 'cos(u)',
                t0: '0',
                t1: '1',
            },
            color: '#CB44CB',
        },
    ];

    const exampleFields = [
        {
            uuid: 'flux-story-field-000-',
            kind: 'field',
            title: 'Constant',
            params: {
                p: '1/2',
                q: '0',
                r: '1/3',
                nVec: 4,
            },
            color: '#128812',
        },
        {
            uuid: 'flux-story-field-001-',
            kind: 'field',
            title: 'Source',
            params: {
                p: 'x',
                q: 'y',
                r: 'z',
                nVec: 4,
            },
            color: '#128812',
        },
        {
            uuid: 'flux-story-field-002-',
            kind: 'field',
            title: 'River',
            params: {
                p: 'y^2',
                q: 'x^2',
                r: '0',
                nVec: 4,
            },
            color: '#1212CC',
        },
        {
            uuid: 'flux-story-field-003-',
            kind: 'field',
            title: 'Half up/Half down',
            params: {
                p: '0',
                q: '0',
                r: 'x',
                nVec: 4,
            },
            color: '#1212CC',
        },
    ];

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface =
        demoObjects.find((o) => o.kind === 'surface') || exampleSurfaces[0];
    let currentField =
        demoObjects.find((o) => o.kind === 'field') || exampleFields[0];
    currentField.flowTrails = false;

    let unsub;
    onMount(() => {
        // unsub = demoObjects.subscribe((e) => {
        //     if (!e.some((o) => o === currentSurface)) {
        //         currentSurface = null;
        //     }
        //     if (!e.some((o) => o === currentField)) {
        //         currentField = null;
        //     }
        // });
        // currentField =
        //     objects.find((o) => o.kind === 'field')?.uuid ||
        //     'flux-story-field-001-';
        // currentSurface =
        //     objects.find((o) => o.kind === 'surface') || exampleSurfaces[0];

        render();
    });

    let ruv = null;
    let F = null;

    let geo;
    let geoDown;
    let edgesUp;
    let edgesDown;

    let approxFlux = '';
    let totalFlux = 0;

    const computeFlux = (F, r) => {
        const { x, y, z, a, b, c, d } = currentSurface.params;
        const [A, B, C, D] = [a, b, c, d].map((w) => math.parse(w).compile());

        console.log(x, y, z, a, b, c, d);

        const u0 = A.evaluate();
        const u1 = B.evaluate();
        const v0 = (u) => C.evaluate({ u });
        const v1 = (u) => D.evaluate({ u });

        const [xu, yu, zu] = [x, y, z].map((expr) =>
            math.derivative(expr, 'u').compile(),
        );
        const [xv, yv, zv] = [x, y, z].map((expr) =>
            math.derivative(expr, 'v').compile(),
        );

        return gaussLegendre(
            (u) =>
                gaussLegendre(
                    (v) =>
                        math.dot(
                            F(...r(u, v)).toArray(),
                            math.cross(
                                [
                                    xu.evaluate({ u, v }),
                                    yu.evaluate({ u, v }),
                                    zu.evaluate({ u, v }),
                                ],
                                [
                                    xv.evaluate({ u, v }),
                                    yv.evaluate({ u, v }),
                                    zv.evaluate({ u, v }),
                                ],
                            ),
                        ),
                    v0(u),
                    v1(u),
                    20,
                ),
            u0,
            u1,
            20,
        );
    };

    // console.log(geo);

    const plusMaterial = new THREE.MeshPhongMaterial({
        color: '#474747',
        shininess: 80,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.6,
    });

    const minusMaterial = new THREE.MeshPhongMaterial({
        color: '#CC1212',
        shininess: 80,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.6,
    });

    const boxes = new THREE.Object3D();
    boxes.add(new THREE.Mesh(undefined, plusMaterial)); // pos boxes
    boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // pos edges
    boxes.add(new THREE.Mesh(undefined, minusMaterial)); // neg boxes
    boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // neg edges

    scene.add(boxes);

    let tau = 1;
    let nBoxes = 1;

    const setF = (obj) => {
        // const obj = exampleFields.find((o) => o.uuid === uuid);
        if (obj) {
            const { p, q, r } = obj.params;
            const P = math.parse(p).compile();
            const Q = math.parse(q).compile();
            const R = math.parse(r).compile();

            F = (x, y, z) =>
                new THREE.Vector3(
                    P.evaluate({ x, y, z }),
                    Q.evaluate({ x, y, z }),
                    R.evaluate({ x, y, z }),
                );
            currentField.flowTrails = false;
            filterBang((o) => o.kind !== 'field', demoObjects);
            demoObjects.push(currentField);

            if (ruv) {
                totalFlux = computeFlux(F, ruv);
            }
        } else {
            F = null;
        }
    };

    $: setF(currentField);

    let u0, u1, v0, v1;
    const setRuv = (obj) => {
        // const obj = exampleSurfaces.find((o) => o.uuid === uuid);
        if (obj) {
            const { x, y, z, a, b, c, d } = obj.params;
            const [X, Y, Z, A, B, C, D] = [x, y, z, a, b, c, d].map((w) =>
                math.parse(w).compile(),
            );

            ruv = (u, v) => [
                X.evaluate({ u, v }),
                Y.evaluate({ u, v }),
                Z.evaluate({ u, v }),
            ];
            u0 = A.evaluate();
            u1 = B.evaluate();
            v0 = (u) => C.evaluate({ u });
            v1 = (u) => D.evaluate({ u });

            filterBang((o) => o.kind !== 'surface', demoObjects);
            demoObjects.push(obj);

            if (F) totalFlux = computeFlux(F, ruv);
        } else {
            ruv = null;
        }
    };

    $: setRuv(currentSurface);

    const updateGeo = (N, F, r, A, B, C, D, samp) => {
        geo?.dispose();
        edgesUp?.dispose();
        geoDown?.dispose();
        edgesDown?.dispose();
        if (r && F) {
            geo = new FluxBoxGeometry(
                F,
                r,
                A,
                B,
                C,
                D,
                N,
                false,
                tau,
                'pos',
                samp,
            );
            approxFlux = `${Math.round(1000 * geo.volume) / 1000}`;
            boxes.children[0].geometry = geo;
            edgesUp = new FluxBoxEdgesGeometry(geo, false, tau);
            boxes.children[1].geometry = edgesUp;
            geoDown = new FluxBoxGeometry(
                F,
                r,
                A,
                B,
                C,
                D,
                N,
                false,
                tau,
                'neg',
            );
            boxes.children[2].geometry = geoDown;
            edgesDown = new FluxBoxEdgesGeometry(geoDown, false, tau);
            boxes.children[3].geometry = edgesDown;
            boxes.visible = true;
        } else {
            boxes.visible = false;
        }

        render();
    };

    $: updateGeo(nBoxes, F, ruv, u0, u1, v0, v1, sampleParam);

    const updateTau = (t) => {
        if (geo) {
            geo.changeT(t);
            edgesUp?.dispose();
            edgesUp = new FluxBoxEdgesGeometry(geo, false, t);
            boxes.children[1].geometry = edgesUp;
            geoDown.changeT(t);
            edgesDown?.dispose();
            edgesDown = new FluxBoxEdgesGeometry(geoDown, false, t);
            boxes.children[3].geometry = edgesDown;
            render();
        }
    };

    $: updateTau(tau);

    onDestroy(() => {
        for (let index = 0; index < boxes.children.length; index++) {
            const element = boxes.children[index];
            element.geometry?.dispose();
            element.material?.dispose();
        }
        scene.remove(boxes);
        // unsub();
        demoObjects.length = 0;
        demoObjects.push(...backupObjects);

        render();
    });
</script>

<div>
    <h1>Flux Integrals</h1>

    <p>
        Let <M>{`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`}</M> be a parametric
        surface oriented with normal <M>{`\\mathbf N`}</M> and <M>
            {`\\mathbf F`}
        </M> a vector field continuous on <M>{`\\Omega`}</M>.
    </p>

    <div class="row">
        <div class="col-auto">
            <M>{'\\mathbf F:'}</M>
            <select
                bind:value={currentField}
                class="demos-obj-select m-2 bg-primary border-primary
                text-light"
            >
                {#each demoObjects.filter((o) => o.kind === 'field' && o.uuid.slice(0, 10) !== 'flux-story') as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
                <option disabled>──────────</option>
                {#each exampleFields as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <div class="col-auto">
            <M>{'\\Omega:'}</M>
            <select
                class="demos-obj-select m-2 bg-primary text-light"
                bind:value={currentSurface}
            >
                {#each demoObjects.filter((o) => o.kind === 'surface' && o.uuid.slice(0, 10) !== 'flux-story') as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
                <option disabled>──────────</option>
                {#each exampleSurfaces as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <div class="col-auto">
            <button
                class=" bg-primary text-light"
                on:click={() => {
                    setF(currentField);
                    setRuv(currentSurface);
                }}
            >
                <i class="bi bi-arrow-clockwise" />
            </button>
        </div>
    </div>

    <p>
        Then the <b>flux</b>
        <M>{'\\Phi'}</M> of the vector field through the surface is given by

        <M align>
            {'\\Phi &= \\iint_\\Omega \\mathbf F\\cdot\\,d\\mathbf S = \\iint_\\Omega \\mathbf F\\cdot\\mathbf N\\,dS \\\\ &= \\iint_D \\mathbf F(\\mathbf r(u,v)) \\cdot \\mathbf r_u \\times \\mathbf r_v\\,dS.'}
        </M>
    </p>

    <p>
        That integrand is a <em>triple product</em> which can be visualized as
        the volume of a parallelopiped with two tangent vectors to the surface
        and the vector field itself being the third edge. To see this, we chop
        the domain <M>D</M> into <M>n \times n</M> rectongles and draw the parallelopipeds
        to approximate the flux.
    </p>

    <!-- <p>
        Recall that a triple product <M
            >{'\\mathbf a\\cdot \\mathbf b \\times \\mathbf c'}</M
        > measures the (signed) volume of a parallelopiped with edges defined by
        vectors <M>{'\\mathbf a'}</M>, <M>{'\\mathbf b'}</M>, and <M>
            {'\\mathbf c'}
        </M>. We thus divide our surface into <M>{'n^2'}</M> pieces. On each, we
        take a parallelogram-shaped portion of the tangent plane with edges <M>
            {'\\mathbf r_u \\Delta u'}
        </M> and <M>{'\\mathbf r_v \\Delta v'}</M> and sample the vector field <M
            >{'\\mathbf F'}</M
        > as the third edge. Adjust <M>n</M> and the sample point below.
    </p> -->

    <div class="row my-3">
        <div class="col-auto">
            <span class=""><M>{'n = '}</M></span>
            <span class=""
                ><input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    bind:value={nBoxes}
                /></span
            >
        </div>

        <div class="col-auto">
            show
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    bind:checked={boxes.visible}
                    on:change={render}
                />
                <span class="slider round" />
            </label>
        </div>
        <div class="col-auto">
            center
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    checked={false}
                    on:change={(e) => {
                        if (e.target.checked) {
                            sampleParam = 0.5;
                        } else {
                            sampleParam = 0;
                        }
                    }}
                />
                <span class="slider round" />
            </label>
        </div>
    </div>

    <M display
        >{`\\Phi = \\sum_{i = 1}^{${nBoxes}}\\sum_{j = 1}^{${nBoxes}} \\mathbf F\\cdot \\mathbf r_u\\times \\mathbf r_v \\,\\Delta u\\, \\Delta v = ${approxFlux}`}
    </M>

    <p>
        A (somewhat) better approximation is <M display
            >{`\\Phi = \\iint\\limits_\\Omega \\mathbf F \\cdot d\\mathbf S \\approx ${
                Math.round(1e8 * totalFlux) / 1e8
            }`}</M
        >
    </p>

    <p>
        Imagine <M>
            {'\\mathbf F'}</M
        > as the velocity field of some fluid. The we can interpret <M>
            {'\\Phi'}
        </M> as the net volume flowing per unit time through the surface in the direction
        of its orientation. By scaling the vector field in time, we can "see" this
        volume flowing through the surface. <strong>Warning</strong> the
        quantity <M>{'\\Phi'}</M> is computed as a static computation. This is meant
        only to help see where positive/negative contributions come from.
    </p>

    <div class="row my-3">
        <div class="col-auto">
            <span><M>{'t'}</M></span>
            <span>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={tau}
                />
            </span>
        </div>

        <div class="col-auto">
            <PlayButtons
                bind:animation
                {animate}
                play={() => {
                    console.log("playin'");
                    boxes.visible = true;
                    currentField.animation = true;
                }}
                pause={() => {
                    last = null;
                }}
                rew={() => {
                    tau = 0;
                }}
            />
        </div>
    </div>
</div>

<style>
    .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    }
    /* .blue-button {
        background-color: red;
    } */
</style>
