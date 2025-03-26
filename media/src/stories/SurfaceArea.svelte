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
    import { onMount, onDestroy } from 'svelte';
    import { demoObjects } from '../states.svelte';
    // import { createEventDispatcher } from 'svelte';

    // const dispatch = createEventDispatcher();

    export let scene;
    export let render;

    const config = {};
    const math = create(all, config);

    let sampleParam = 0;

    const backupObjects = demoObjects.map((obj) => {
        obj.selected = false;
        return obj;
    });

    const standardExamples = [
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
        },
    ];

    let exampleSurfaces = [
        ...standardExamples,
        ...backupObjects.filter(
            (obj) =>
                obj.kind === 'surface' &&
                obj.uuid.slice(0, 18) !== 'area-story-example',
        ),
    ];

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface =
        demoObjects.find((o) => o.kind === 'surface') || exampleSurfaces[0];

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

    let r = (u, v) => [u, v, 1 / 2 - (u * u) / 4 - (v * v) / 2];

    let geo;
    // let geoDown;
    let edgesUp;
    // let edgesDown;

    // console.log(geo);

    const plusMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });

    // const plusMaterial = new THREE.MeshPhongMaterial({
    //     color: '#C7C7C7',
    //     shininess: 90,
    //     side: THREE.DoubleSide,
    //     transparent: false,
    //     opacity: 1,
    // });

    // const minusMaterial = new THREE.MeshPhongMaterial({
    //     color: '#CC1212',
    //     shininess: 80,
    //     side: THREE.BackSide,
    //     transparent: true,
    //     opacity: 0.6,
    // });

    const boxes = new THREE.Object3D();
    boxes.add(new THREE.Mesh(undefined, plusMaterial)); // pos boxes
    boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // pos edges
    // boxes.add(new THREE.Mesh(undefined, minusMaterial)); // neg boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // neg edges

    scene.add(boxes);

    // let tau = 1;
    let nBoxes = 3;

    let u0, u1, v0, v1;
    const setRuv = (obj) => {
        // const dt = 1e-4;
        // const obj = exampleSurfaces.find((o) => o.uuid === uuid);
        if (obj) {
            const { x, y, z, a, b, c, d } = obj.params;
            const [X, Y, Z, A, B, C, D] = [x, y, z, a, b, c, d].map((w) =>
                math.parse(w).compile(),
            );

            r = (u, v) => [
                X.evaluate({ u, v }),
                Y.evaluate({ u, v }),
                Z.evaluate({ u, v }),
            ];
            u0 = A.evaluate();
            u1 = B.evaluate();
            v0 = (u) => C.evaluate({ u });
            v1 = (u) => D.evaluate({ u });

            const [xu, yu, zu] = [x, y, z].map((expr) =>
                math.derivative(expr, 'u').compile(),
            );
            const [xv, yv, zv] = [x, y, z].map((expr) =>
                math.derivative(expr, 'v').compile(),
            );

            // const ru = new THREE.Vector3();
            // const rv = new THREE.Vector3();

            totalArea = gaussLegendre(
                (u) =>
                    gaussLegendre(
                        (v) =>
                            math.norm(
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
                        10,
                    ),
                u0,
                u1,
                10,
            );

            // // Match color to that of surface
            // plusMaterial.color.set(obj.color);
            // const hsl = {};
            // plusMaterial.color.getHSL(hsl);
            // minusMaterial.color.setHSL(hsl.h + 0.6, hsl.s, hsl.l);
        } else {
            r = (u, v) => [u, v, (u * u) / 4 - (v * v) / 4];
            u0 = -1;
            u1 = 1;
            v0 = () => -1;
            v1 = () => 1;
        }
        filterBang((o) => o.kind !== 'surface', demoObjects);
        demoObjects.push(obj);
    };

    $: setRuv(currentSurface);

    let approxArea = 0;
    let totalArea = 0;

    const updateGeo = (N, r, A, B, C, D, samp) => {
        geo?.dispose();
        geo = new ShardsGeometry(r, A, B, C, D, N, samp);
        approxArea = geo.area;
        boxes.children[0].geometry = geo;
        edgesUp?.dispose();
        edgesUp = new ShardsEdgesGeometry(geo);
        boxes.children[1].geometry = edgesUp;
        // boxes.children[1].geometry = geo;
        // boxes.children[1].geometry = geo;
        render();
    };

    $: updateGeo(nBoxes, r, u0, u1, v0, v1, sampleParam);
</script>

<div>
    <p>
        Let <M>{`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`}</M> be a smooth
        parametrization of a surface with <M>{`D\\subset \\mathbb{R}^2`}</M> a domain
        in
        <M>uv</M>-space.
    </p>

    <p>
        Then, we can approximate the <strong>surface area</strong> of <M
            >\Omega</M
        > by using parallelogram-shaped pieces of the tangent planes. The edges are
        defined by

        <M align>
            {`\\mathbf r_u\\,\\Delta u &=
            \\left\\langle \\frac{\\partial x}{\\partial u}, \\frac{\\partial y}{\\partial u}, \\frac{\\partial z}{\\partial u} \\right\\rangle\\Delta u \\\\ \\mathbf
            r_v\\,\\Delta v &= \\left\\langle \\frac{\\partial x}{\\partial v}, \\frac{\\partial y}{\\partial v}, \\frac{\\partial z}{\\partial v} 
            \\right\\rangle\\Delta v \\\\ 
            `}
        </M>
    </p>

    <div class="row">
        <div class="col-auto">
            <M>{'\\Omega:'}</M>
            <select
                class="demos-obj-select m-2 bg-primary text-light"
                bind:value={currentSurface}
            >
                {#each exampleSurfaces as obj}
                    <option value={obj}>{obj.title}</option>
                {/each}
            </select>
        </div>
        <div class="col-auto">
            <button
                class=" bg-primary text-light"
                on:click={() => {
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
        </div>
    </div>

    <p>
        Adjust <M>n</M> and the sample point below.
    </p>

    <div class="row my-3">
        <div class="col-auto">
            <span class=""><M>{'n = '}</M></span>
            <span class=""
                ><input
                    type="range"
                    min="1"
                    max="35"
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
</div>

<p>
    Adding each area gives <M>
        {`\\sum \\Delta S = \\sum |\\mathbf r_u \\times \\mathbf r_v|\\,\\Delta u \\,\\Delta v \\approx ${
            Math.round(10000 * approxArea) / 10000
        }`}.
    </M>
</p>

<p>
    As the number of subdivisions heads to <M>\infty</M>, we get <M align>
        {`\\text{SA} &= \\iint\\limits_\\Omega dS = \\iint\\limits_D |\\mathbf r_u \\times \\mathbf r_v|\\,du\\,dv \\\\ &\\approx ${totalArea}`}.
    </M>
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
