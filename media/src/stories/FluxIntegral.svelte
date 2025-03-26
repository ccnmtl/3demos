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
    import { onMount, onDestroy, untrack } from 'svelte';
    // import { createEventDispatcher } from 'svelte';

    // const dispatch = createEventDispatcher();

    import { tickTock } from '../stores';
    import { demoObjects } from '../states.svelte';

    let { scene, render, animate } = $props();

    const config = {};
    const math = create(all, config);

    let animation = $state(false);
    $effect(() => {
        if (animation) {
            untrack(() => {
                // console.log('anim effex', currentField);
                currentField.animation = true;
                animate();
            });
        }
    });

    let last = null;
    let sampleParam = $state(0);

    $effect(() => {
        $tickTock;
        // console.log('tix tox');
        untrack(() => {
            if (animation) {
                // const currentTime = $tickTock;
                last = last || $tickTock;
                tau += $tickTock - last;
                tau %= 1;
                updateTau(tau);
                last = $tickTock;
            }
        });
    });

    let backupObjects = $state(
        demoObjects.map((obj) => {
            return { ...obj, selected: false };
        }),
    );

    const exampleSurfaces = $state([
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
            animation: false,
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
            animation: false,
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
            animation: false,
        },
    ]);

    const exampleFields = $state([
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
            animation: false,
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
            animation: false,
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
            animation: false,
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
            animation: false,
        },
    ]);

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface = $state(
        backupObjects.find((o) => o.kind === 'surface') ?? exampleSurfaces[0],
    );
    let currentField = $state(
        backupObjects.find((o) => o.kind === 'field') ?? exampleFields[0],
    );

    $effect(() => {
        console.log('demobj maintenance');
        if (currentField && currentSurface)
            untrack(() => {
                demoObjects[0] = currentSurface;
                demoObjects[1] = currentField;
                demoObjects.length = 2;
                // filterBang(
                //     (o) => o === currentField || o === currentSurface,
                //     demoObjects,
                // );
                // if (demoObjects.findIndex((o) => o === currentField) < 0)
                //     demoObjects.push(currentField);
                // if (demoObjects.findIndex((o) => o === currentSurface) < 0)
                //     demoObjects.push(currentSurface);
            });
    });
    // $effect(() => {
    //     if (currentField)
    //         untrack(() => {
    //             filterBang(
    //                 (o) => o.uuid === currentField.uuid || o.uuid === currentSurface.uuid,
    //                 demoObjects,
    //             );
    //             if (demoObjects.findIndex((o) => o === currentField) < 0)
    //                 demoObjects.push(currentField);
    //             if (demoObjects.findIndex((o) => o === currentSurface) < 0)
    //                 demoObjects.push(currentSurface);
    //         });
    // });

    onMount(() => {
        currentField.flowTrails = false;
        render();
    });

    let u0 = $derived.by(() => {
        const A = math.parse(currentSurface.params.a);
        return A.evaluate();
    });
    let u1 = $derived.by(() => {
        const B = math.parse(currentSurface.params.b);
        return B.evaluate();
    });
    let v0 = $derived.by(() => {
        const C = math.parse(currentSurface.params.c);
        return (u) => C.evaluate({ u: u });
    });
    let v1 = $derived.by(() => {
        const D = math.parse(currentSurface.params.d);
        return (u) => D.evaluate({ u: u });
    });

    let geo = $state();
    let geoDown = $state();

    $effect(() => {
        untrack(() => geo?.dispose());
        geo = new FluxBoxGeometry(
            F,
            ruv,
            u0,
            u1,
            v0,
            v1,
            nBoxes,
            false,
            untrack(() => tau),
            'pos',
            sampleParam,
        );
    });

    $effect(() => {
        untrack(() => geoDown?.dispose());
        geoDown = new FluxBoxGeometry(
            F,
            ruv,
            u0,
            u1,
            v0,
            v1,
            nBoxes,
            false,
            untrack(() => tau),
            'neg',
            sampleParam,
        );
    });

    let edgesUp = $state();
    $effect(() => {
        untrack(() => edgesUp?.dispose());
        edgesUp = new FluxBoxEdgesGeometry(geo, false, tau);
    });

    let edgesDown = $state();
    $effect(() => {
        untrack(() => edgesDown?.dispose());
        edgesDown = new FluxBoxEdgesGeometry(geoDown, false, tau);
    });

    $effect(() => {
        boxes.children[0].geometry = geo;
        boxes.children[2].geometry = geoDown;
    });

    let approxFlux = $derived(geo?.volume ?? '');
    let totalFlux = $derived.by(() => {
        const { x, y, z } = currentSurface.params;

        console.log(x, y, z);

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
                            F(...ruv(u, v)).toArray(),
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
    });

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

    let tau = $state(0);
    let nBoxes = $state(1);
    let boxesVisible = $state(true);
    $effect(() => {
        boxes.visible = boxesVisible;
    });

    let F = $derived.by(() => {
        // const obj = exampleFields.find((o) => o.uuid === uuid);
        let out;
        if (currentField) {
            const { p, q, r } = currentField.params;
            const P = math.parse(p).compile();
            const Q = math.parse(q).compile();
            const R = math.parse(r).compile();

            out = (x, y, z) =>
                new THREE.Vector3(
                    P.evaluate({ x, y, z }),
                    Q.evaluate({ x, y, z }),
                    R.evaluate({ x, y, z }),
                );
            // currentField.flowTrails = false;
            // filterBang((o) => o.kind !== 'field', demoObjects);
            // demoObjects.push(currentField);
        } else {
            out = null;
        }
        return out;
    });

    let ruv = $derived.by(() => {
        let out;
        // const obj = exampleSurfaces.find((o) => o.uuid === uuid);
        if (currentSurface) {
            const { x, y, z, a, b, c, d } = currentSurface.params;
            const [X, Y, Z, A, B, C, D] = [x, y, z, a, b, c, d].map((w) =>
                math.parse(w).compile(),
            );

            out = (u, v) => [
                X.evaluate({ u, v }),
                Y.evaluate({ u, v }),
                Z.evaluate({ u, v }),
            ];
            // u0 = A.evaluate();
            // u1 = B.evaluate();
            // v0 = (u) => C.evaluate({ u });
            // v1 = (u) => D.evaluate({ u });

            // filterBang((o) => o.kind !== 'surface', demoObjects);
            // demoObjects.push(currentSurface);

            // if (F) totalFlux = computeFlux(F, ruv);
        } else {
            out = null;
        }
        return out;
    });

    // const updateGeo = (N, F, r, A, B, C, D, samp) => {
    //     geo?.dispose();
    //     edgesUp?.dispose();
    //     geoDown?.dispose();
    //     edgesDown?.dispose();
    //     if (r && F) {
    //         geo = new FluxBoxGeometry(
    //             F,
    //             r,
    //             A,
    //             B,
    //             C,
    //             D,
    //             N,
    //             false,
    //             tau,
    //             'pos',
    //             samp,
    //         );
    //         approxFlux = `${geo.volume.toFixed(3)}`;
    //         boxes.children[0].geometry = geo;
    //         edgesUp = new FluxBoxEdgesGeometry(geo, false, tau);
    //         boxes.children[1].geometry = edgesUp;
    //         geoDown = new FluxBoxGeometry(
    //             F,
    //             r,
    //             A,
    //             B,
    //             C,
    //             D,
    //             N,
    //             false,
    //             tau,
    //             'neg',
    //         );
    //         boxes.children[2].geometry = geoDown;
    //         edgesDown = new FluxBoxEdgesGeometry(geoDown, false, tau);
    //         boxes.children[3].geometry = edgesDown;
    //         boxes.visible = true;
    //     } else {
    //         boxes.visible = false;
    //     }

    //     render();
    // };

    // $effect(() => updateGeo(nBoxes, F, ruv, u0, u1, v0, v1, sampleParam));

    const updateTau = (t) => {
        if (geo) {
            geo.changeT(t);
            // edgesUp?.dispose();
            // edgesUp = new FluxBoxEdgesGeometry(geo, false, t);
            boxes.children[1].geometry = edgesUp;
            geoDown.changeT(t);
            // edgesDown?.dispose();
            // edgesDown = new FluxBoxEdgesGeometry(geoDown, false, t);
            boxes.children[3].geometry = edgesDown;
            render();
        }
    };

    $effect(() => updateTau(tau));

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
        Let <M s={`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`} /> be a parametric
        surface oriented with normal <M s={`\\mathbf N`} /> and <M
            s={`\\mathbf F`}
        /> a vector field continuous on <M s={`\\Omega`} />.
    </p>

    <div class="row">
        <div class="col-auto">
            <M s={'\\mathbf F:'} />
            <select
                class="demos-obj-select m-2 bg-primary border-primary
                text-light"
                bind:value={currentField}
            >
                {#each backupObjects.filter((o) => o.kind === 'field' && o.uuid.slice(0, 10) !== 'flux-story') as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
                <option disabled>──────────</option>
                {#each exampleFields as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <div class="col-auto">
            <M s={'\\Omega:'} />
            <select
                class="demos-obj-select m-2 bg-primary text-light"
                bind:value={currentSurface}
            >
                {#each backupObjects.filter((o) => o.kind === 'surface' && o.uuid.slice(0, 10) !== 'flux-story') as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
                <option disabled>──────────</option>
                {#each exampleSurfaces as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <!-- <div class="col-auto">
            <button
                class=" bg-primary text-light"
                onclick={() => {
                    setF(currentField);
                    setRuv(currentSurface);
                }}
                aria-label="Reload menu"
            >
                <i class="bi bi-arrow-clockwise"></i>
            </button>
        </div> -->
    </div>

    <p>
        Then the <b>flux</b>
        <M s={'\\Phi'} /> of the vector field through the surface is given by

        <M
            align
            s={'\\Phi &= \\iint_\\Omega \\mathbf F\\cdot\\,d\\mathbf S = \\iint_\\Omega \\mathbf F\\cdot\\mathbf N\\,dS \\\\ &= \\iint_D \\mathbf F(\\mathbf r(u,v)) \\cdot \\mathbf r_u \\times \\mathbf r_v\\,dS.'}
        />
    </p>

    <p>
        That integrand is a <em>triple product</em> which can be visualized as
        the volume of a parallelopiped with two tangent vectors to the surface
        and the vector field itself being the third edge. To see this, we chop
        the domain <M s="D" /> into <M s={`n \times n`} /> rectangles and draw the
        parallelopipeds to approximate the flux.
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
            <span class=""><M s={'n = '} /></span>
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
                    bind:checked={boxesVisible}
                    onchange={render}
                />
                <span class="slider round"></span>
            </label>
        </div>
        <div class="col-auto">
            center
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    checked={false}
                    onchange={(e) => {
                        if (e.target.checked) {
                            sampleParam = 0.5;
                        } else {
                            sampleParam = 0;
                        }
                    }}
                />
                <span class="slider round"></span>
            </label>
        </div>
    </div>

    <M
        display
        s={`\\Phi = \\sum_{i = 1}^{${nBoxes}}\\sum_{j = 1}^{${nBoxes}} \\mathbf F\\cdot \\mathbf r_u\\times \\mathbf r_v \\,\\Delta u\\, \\Delta v = ${approxFlux}`}
    />

    <p>
        A (somewhat) better approximation is <M
            display
            s={`\\Phi = \\iint\\limits_\\Omega \\mathbf F \\cdot d\\mathbf S \\approx ${
                Math.round(1e8 * totalFlux) / 1e8
            }`}
        />
    </p>

    <p>
        Imagine <M s={'\\mathbf F'} /> as the velocity field of some fluid. The we
        can interpret <M s={'\\Phi'} /> as the net volume flowing per unit time through
        the surface in the direction of its orientation. By scaling the vector field
        in time, we can "see" this volume flowing through the surface.
        <strong>Warning</strong>
        the quantity <M s={'\\Phi'} /> is computed as a static computation. This
        is meant only to help see where positive/negative contributions come from.
    </p>

    <div class="row my-3">
        <div class="col-auto">
            <span><M s="t" /></span>
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
                play={() => {
                    boxesVisible = true;
                }}
                pause={() => {
                    currentField.animation = false;
                    last = null;
                }}
                rew={() => {
                    currentField.animation = false;
                    tau = 0;
                    last = null;
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
