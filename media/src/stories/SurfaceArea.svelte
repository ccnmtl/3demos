<script>
    import * as THREE from 'three';

    import { all, create } from 'mathjs';
    import M from '../M.svelte';
    import {
        ShardsEdgesGeometry,
        ShardsGeometry,
        filterBang,
        gaussLegendre,
    } from '../utils';
    import { mathToJSFunction } from '../objects/mathutils';
    import { onMount, onDestroy, untrack } from 'svelte';
    import { demoObjects } from '../states.svelte';
    import { derived } from 'svelte/store';
    // import { createEventDispatcher } from 'svelte';

    // const dispatch = createEventDispatcher();

    let { scene, render } = $props();

    const config = {};
    const math = create(all, config);

    let sampleParam = $state(0);

    let backupObjects = $state(
        demoObjects.map((obj) => {
            obj.selected = false;
            return obj;
        }),
    );

    $inspect(backupObjects);

    let standardExamples = $state([
        {
            uuid: 'area-story-example-001-',
            kind: 'surface',
            title: 'Example 1',
            params: {
                a: '0',
                b: '2',
                c: '0',
                d: '2',
                x: 'u v - 1',
                y: 'u - v',
                z: 'sin(u v) - (u - v)^2 / 20',
                t0: '0',
                t1: '1',
            },
            color: '#44CB44',
            animation: false,
        },
        {
            uuid: 'area-story-example-002-',
            kind: 'surface',
            title: 'Dome',
            params: {
                a: '0',
                b: 'pi / 2',
                c: '0',
                d: 'pi',
                x: 'sin(u) sin(v)',
                y: 'sin(u) cos(v)',
                z: 'cos(u)',
                t0: '0',
                t1: '1',
            },
            color: '#44CB44',
            animation: false,
        },
        {
            uuid: 'area-story-example-003-',
            kind: 'surface',
            title: 'Football',
            params: {
                a: '-pi / 2',
                b: 'pi / 2',
                c: '0',
                d: '2*pi',
                x: 'u',
                y: 'cos(u) cos(v)',
                z: 'cos(u) sin(v)',
                t0: '0',
                t1: '1',
            },
            color: '#44CB44',
            animation: false,
        },
    ]);

    let exampleSurfaces = $state([
        ...standardExamples,
        ...backupObjects.filter(
            (obj) =>
                obj.kind === 'surface' &&
                obj.uuid.slice(0, 18) !== 'area-story-example',
        ),
    ]);

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface = $state(
        backupObjects.find((o) => o.kind === 'surface') ?? standardExamples[0],
    );

    $inspect(currentSurface);

    onMount(() => {
        // currentField =
        //     objects.find((o) => o.kind === 'field')?.uuid ||
        //     'flux-story-field-001-';
        // currentSurface =
        //     objects.find((o) => o.kind === 'surface') || exampleSurfaces[0];
        render();
    });

    onDestroy(() => {
        for (let index = 0; index < boxes.children.length; index++) {
            const element = boxes.children[index];
            element.geometry?.dispose();
            element.material?.dispose();
        }
        scene.remove(boxes);
        demoObjects.length = 0;
        demoObjects.push(...backupObjects);
        render();
    });

    let geo = $state();
    let edgesUp = $state();

    const plusMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });

    const boxes = new THREE.Object3D();
    boxes.add(new THREE.Mesh(undefined, plusMaterial)); // pos boxes
    boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // pos edges
    // boxes.add(new THREE.Mesh(undefined, minusMaterial)); // neg boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // neg edges

    scene.add(boxes);

    let boxesVisible = $state(true);
    $effect(() => {
        boxes.visible = boxesVisible;
    });

    let nBoxes = $state(3);

    let u0 = $derived(math.parse(currentSurface.params.a).evaluate());
    let u1 = $derived(math.parse(currentSurface.params.b).evaluate());
    let v0 = $derived(mathToJSFunction(currentSurface.params.c, ['u']));
    let v1 = $derived(mathToJSFunction(currentSurface.params.d, ['u']));

    let r = $derived.by(() => {
        const { x, y, z } = currentSurface.params;
        const [X, Y, Z] = [x, y, z].map((c) => mathToJSFunction(c, ['u', 'v']));
        return (u, v) => [X(u, v), Y(u, v), Z(u, v)];
    });

    let ru = $derived.by(() => {
        const { x, y, z } = currentSurface.params;
        const [X, Y, Z] = [x, y, z].map((c) =>
            mathToJSFunction(math.derivative(c, 'u').toString(), ['u', 'v']),
        );

        return (u, v) => [X(u, v), Y(u, v), Z(u, v)];
    });

    let rv = $derived.by(() => {
        const { x, y, z } = currentSurface.params;
        const [X, Y, Z] = [x, y, z].map((c) =>
            mathToJSFunction(math.derivative(c, 'v').toString(), ['u', 'v']),
        );

        return (u, v) => [X(u, v), Y(u, v), Z(u, v)];
    });

    let totalArea = $derived(
        gaussLegendre(
            (u) =>
                gaussLegendre(
                    (v) => math.norm(math.cross(ru(u, v), rv(u, v))),
                    v0(u),
                    v1(u),
                    20,
                ),
            u0,
            u1,
            20,
        ),
    );
    $inspect(totalArea);

    // const setRuv = (obj) => {
    //     // const dt = 1e-4;
    //     // const obj = exampleSurfaces.find((o) => o.uuid === uuid);
    //     if (obj) {
    //         const { x, y, z, a, b, c, d } = obj.params;
    //         const [X, Y, Z, A, B, C, D] = [x, y, z, a, b, c, d].map((w) =>
    //             math.parse(w).compile(),
    //         );

    //         r = (u, v) => [
    //             X.evaluate({ u, v }),
    //             Y.evaluate({ u, v }),
    //             Z.evaluate({ u, v }),
    //         ];
    //         u0 = A.evaluate();
    //         u1 = B.evaluate();
    //         v0 = (u) => C.evaluate({ u });
    //         v1 = (u) => D.evaluate({ u });

    //         const [xu, yu, zu] = [x, y, z].map((expr) =>
    //             math.derivative(expr, 'u').compile(),
    //         );
    //         const [xv, yv, zv] = [x, y, z].map((expr) =>
    //             math.derivative(expr, 'v').compile(),
    //         );

    //         // const ru = new THREE.Vector3();
    //         // const rv = new THREE.Vector3();

    //         totalArea = gaussLegendre(
    //             (u) =>
    //                 gaussLegendre(
    //                     (v) =>
    //                         math.norm(
    //                             math.cross(
    //                                 [
    //                                     xu.evaluate({ u, v }),
    //                                     yu.evaluate({ u, v }),
    //                                     zu.evaluate({ u, v }),
    //                                 ],
    //                                 [
    //                                     xv.evaluate({ u, v }),
    //                                     yv.evaluate({ u, v }),
    //                                     zv.evaluate({ u, v }),
    //                                 ],
    //                             ),
    //                         ),
    //                     v0(u),
    //                     v1(u),
    //                     10,
    //                 ),
    //             u0,
    //             u1,
    //             10,
    //         );

    //         // // Match color to that of surface
    //         // plusMaterial.color.set(obj.color);
    //         // const hsl = {};
    //         // plusMaterial.color.getHSL(hsl);
    //         // minusMaterial.color.setHSL(hsl.h + 0.6, hsl.s, hsl.l);
    //     } else {
    //         r = (u, v) => [u, v, (u * u) / 4 - (v * v) / 4];
    //         u0 = -1;
    //         u1 = 1;
    //         v0 = () => -1;
    //         v1 = () => 1;
    //     }
    //     filterBang((o) => o.kind !== 'surface', demoObjects);
    //     demoObjects.push(obj);
    // };

    let approxArea = $derived(geo?.area ?? '');

    $effect(() => {
        untrack(() => geo?.dispose());
        console.log('geo.updated');
        geo = new ShardsGeometry(r, u0, u1, v0, v1, nBoxes, sampleParam);
    });

    $effect(() => {
        untrack(() => edgesUp?.dispose());
        edgesUp = new ShardsEdgesGeometry(geo);
    });

    $effect(() => {
        boxes.children[0].geometry = geo;
        boxes.children[1].geometry = edgesUp;
        render();
    });

    $effect(() => {
        console.log('demobj maintenance');
        if (currentSurface)
            untrack(() => {
                demoObjects[0] = currentSurface;
                demoObjects.length = 1;
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
</script>

<div>
    <p>
        Let <M s={`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`} /> be a smooth
        parametrization of a surface with <M s={`D\\subset \\mathbb{R}^2`} /> a domain
        in
        <M s="uv" />-space.
    </p>

    <p>
        Then, we can approximate the <strong>surface area</strong> of <M
            s="\Omega"
        /> by using parallelogram-shaped pieces of the tangent planes. The edges
        are defined by

        <M
            align
            s={`\\mathbf r_u\\,\\Delta u &=
            \\left\\langle \\frac{\\partial x}{\\partial u}, \\frac{\\partial y}{\\partial u}, \\frac{\\partial z}{\\partial u} \\right\\rangle\\Delta u \\\\ \\mathbf
            r_v\\,\\Delta v &= \\left\\langle \\frac{\\partial x}{\\partial v}, \\frac{\\partial y}{\\partial v}, \\frac{\\partial z}{\\partial v} 
            \\right\\rangle\\Delta v \\\\ 
            `}
        />
    </p>

    <div class="row">
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
                {#each standardExamples as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <!-- <div class="col-auto">
            <button
                class=" bg-primary text-light"
                onclick={() => {
                    exampleSurfaces = [
                        ...standardExamples,
                        ...demoObjects.filter(
                            (obj) =>
                                obj.kind === 'surface' &&
                                obj.uuid.slice(0, 18) !== 'area-story-example',
                        ),
                    ];
                    currentSurface =
                        demoObjects.find((o) => o.kind === 'surface') ||
                        exampleSurfaces[0];
                    setRuv(currentSurface);
                }}
                aria-label="Refresh list"
            >
                <i class="bi bi-arrow-clockwise"></i>
            </button>
        </div> -->
    </div>

    <p>
        Adjust <M s="n" /> and the sample point below.
    </p>

    <div class="row my-3">
        <div class="col-auto">
            <span class=""><M s={`n `} /></span>
            <span class=""
                ><input
                    type="range"
                    min="1"
                    max="35"
                    step="1"
                    bind:value={nBoxes}
                /></span
            >
            <span class="" style="width: 2rem;"><M s={nBoxes} /></span>
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
</div>

<p>
    Adding each area gives <M
        s={`\\sum \\Delta S = \\sum |\\mathbf r_u \\times \\mathbf r_v|\\,\\Delta u \\,\\Delta v = ${
            Math.round(10000 * approxArea) / 10000
        }.`}
    />
</p>

<p>
    As the number of subdivisions heads to <M s="\\infty" />, we get <M
        align
        s={`\\text{SA} &= \\iint\\limits_\\Omega dS = \\iint\\limits_D |\\mathbf r_u \\times \\mathbf r_v|\\,du\\,dv \\\\ &\\approx ${totalArea}`}
    />
</p>

<style>
    .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    }
    /* .blue-button {
        background-color: red;
    } */
</style>
