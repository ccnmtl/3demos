<script>
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import * as THREE from 'three';

    import { all, create } from 'mathjs';
    import M from '../M.svelte';
    import { FluxBoxEdgesGeometry, FluxBoxGeometry } from '../utils';
    import { onMount, onDestroy } from 'svelte';
    // import { createEventDispatcher } from 'svelte';

    // const dispatch = createEventDispatcher();

    import { tickTock } from '../stores';

    export let scene;
    export let render;
    // export let objects;

    const config = {};
    const math = create(all, config);

    let animation = false;
    let last = null;
    let sampleParam = 0;

    const shards = true;

    export let objects;

    const backupObjects = [
        ...objects.map((obj) => {
            obj.selected = false;
            return obj;
        }),
    ];

    const exampleSurfaces = [
        {
            uuid: 'area-story-example-001-',
            kind: 'surface',
            title: 'Cylinder',
            params: {
                a: '0',
                b: '2 pi',
                c: '0',
                d: '1',
                x: 'cos(u)',
                y: '2 * sin(u)',
                z: 'v',
                t0: '0',
                t1: '1',
            },
            color: '#CB44CB',
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
                x: 'sin(u) cos(v)',
                y: 'sin(u) sin(v)',
                z: 'cos(u)',
                t0: '0',
                t1: '1',
            },
            color: '#CB44CB',
        },
        ...backupObjects.filter(
            (obj) =>
                obj.kind === 'surface' &&
                obj.uuid.slice(0, 18) !== 'flux-story-example'
        ),
    ];

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface =
        objects.find((o) => o.kind === 'surface') || exampleSurfaces[0];

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
        objects = [...backupObjects];
        render();
    });

    let r = (u, v) => [u, v, 1 / 2 - (u * u) / 4 - (v * v) / 2];
    let F = (x, y) => new THREE.Vector3(0, 1 / 2, y);

    let geo;
    let geoDown;
    let edgesUp;
    let edgesDown;

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
    let nBoxes = 3;

    let u0, u1, v0, v1;
    const setRuv = (obj) => {
        // const obj = exampleSurfaces.find((o) => o.uuid === uuid);
        if (obj) {
            const { x, y, z, a, b, c, d } = obj.params;
            const [X, Y, Z, A, B, C, D] = [x, y, z, a, b, c, d].map((w) =>
                math.parse(w).compile()
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
        objects = [...objects.filter((o) => o.kind !== 'surface'), obj];
    };

    $: setRuv(currentSurface);

    const updateGeo = (N, F, r, A, B, C, D, samp) => {
        geo?.dispose();
        geo = new FluxBoxGeometry(
            F,
            r,
            A,
            B,
            C,
            D,
            N,
            shards,
            tau,
            'pos',
            samp
        );
        boxes.children[0].geometry = geo;
        edgesUp?.dispose();
        edgesUp = new FluxBoxEdgesGeometry(geo, shards, tau);
        boxes.children[1].geometry = edgesUp;
        geoDown?.dispose();
        geoDown = new FluxBoxGeometry(F, r, A, B, C, D, N, false, tau, 'neg');
        boxes.children[2].geometry = geoDown;
        edgesDown?.dispose();
        edgesDown = new FluxBoxEdgesGeometry(geoDown, false, tau);
        boxes.children[3].geometry = edgesDown;
        // boxes.children[1].geometry = geo;
        // boxes.children[1].geometry = geo;
        render();
    };

    $: updateGeo(nBoxes, F, r, u0, u1, v0, v1, sampleParam);

    const updateTau = (t) => {
        geo.changeT(t);
        edgesUp?.dispose();
        edgesUp = new FluxBoxEdgesGeometry(geo, false, t);
        boxes.children[1].geometry = edgesUp;
        geoDown.changeT(t);
        edgesDown?.dispose();
        edgesDown = new FluxBoxEdgesGeometry(geoDown, false, t);
        boxes.children[3].geometry = edgesDown;
        render();
    };

    $: updateTau(tau);
</script>

<div>
    <h1>Flux Integrals</h1>

    <p>
        Let <M>{`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`}</M> be a parametric
        surface oriented with normal <M>{`\\mathbf N`}</M> and <M>
            {`\\mathbf F`}
        </M> a vector field continuous on <M>{`\\Omega`}</M>.
    </p>

    <p>
        Then the <b>flux</b>
        <M>{'\\Phi'}</M> of the vector field through the surface is given by

        <M align>
            {'\\Phi &= \\iint_\\Omega \\mathbf F\\cdot\\,d\\mathbf S \\\\ &= \\iint_\\Omega \\mathbf F\\cdot\\mathbf N\\,dS \\\\ &= \\iint_D \\mathbf F(\\mathbf r(u,v)) \\cdot \\mathbf r_u \\times \\mathbf r_v\\,dS.'}
        </M>
    </p>

    <p>
        We seek to visualize that integrand. Choose an example vector field and
        parametric surface.
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
                    setRuv(currentSurface);
                }}
            >
                <i class="bi bi-arrow-clockwise" />
            </button>
        </div>
    </div>

    <p>
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
    </p>

    <div class="row my-3">
        <div class="col-auto">
            <span class=""><M>{'n = '}</M></span>
            <span class=""
                ><input
                    type="range"
                    min="1"
                    max="20"
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
    </div>

    <p>
        At this point, we are not looking at time-dependent vector fields. That
        is, they don't move. Nonetheless, a good way to understand these
        structures (and to justify the term "flux") is to imagine <M>
            {'\\mathbf F'}</M
        > as the velocity field of some fluid. The we can interpret <M>
            {'\\Phi'}
        </M> as the net volume flowing per unit time through the surface in the direction
        of its orientation. By scaling the vector field in time, we can "see" this
        volume flowing through the surface. <strong>Warning</strong> the
        quantity <M>{'\\Phi'}</M> is computed as a static computation. This is meant
        only to help see where positive/negtaive contributions come from.
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

<style>
    .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    }
    /* .blue-button {
        background-color: red;
    } */
</style>
