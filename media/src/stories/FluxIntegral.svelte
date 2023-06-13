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

    export let objects;

    const backupObjects = [
        ...objects.map((obj) => {
            obj.selected = false;
            return obj;
        }),
    ];

    const exampleSurfaces = [
        {
            uuid: 'flux-story-example-001-',
            kind: 'surface',
            title: 'Cylinder',
            params: {
                a: '0',
                b: '2 pi',
                c: '0',
                d: '1',
                x: 'cos(u)',
                y: 'sin(u)',
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
        ...backupObjects.filter(
            (obj) =>
                obj.kind === 'surface' &&
                obj.uuid.slice(0, 18) !== 'flux-story-example'
        ),
    ];

    const exampleFields = [
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
        ...backupObjects.filter((obj) => obj.kind === 'field'),
    ];

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface =
        objects.find((o) => o.kind === 'surface') || exampleSurfaces[0];
    let currentField =
        objects.find((o) => o.kind === 'field') || exampleFields[0];
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
        // render();
        objects = [...backupObjects];
    });

    let r = (u, v) => [u, v, 1 / 2 - (u * u) / 4 - (v * v) / 2];
    let F = (x, y) => new THREE.Vector3(0, 1 / 2, y);

    let geo = new FluxBoxGeometry(
        F,
        r,
        0,
        1,
        () => -1,
        () => 1,
        3,
        1 / 2,
        false
    );

    // console.log(geo);

    const plusMaterial = new THREE.MeshPhongMaterial({
        color: '#a4a4a4',
        shininess: 80,
        side: THREE.FrontSide,
        transparent: false,
        opacity: 0.7,
    });

    const minusMaterial = new THREE.MeshLambertMaterial({
        color: '#CC1212',
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5,
    });

    const boxes = new THREE.Object3D();
    boxes.add(new THREE.Mesh(geo, plusMaterial));
    boxes.add(new THREE.Mesh(geo, minusMaterial));

    const borders = new THREE.LineSegments(
        new FluxBoxEdgesGeometry(geo, 50),
        whiteLineMaterial
    );
    boxes.add(borders);

    scene.add(boxes);

    let tau = 0;
    let nBoxes = 3;

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
                    R.evaluate({ x, y, z })
                );
            objects = [
                ...objects.filter((o) => o.kind !== 'field'),
                currentField,
            ];
        } else {
            F = () => new THREE.Vector3(0, 0, 0);
        }
    };

    $: setF(currentField);

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

    const updateGeo = (N, F, r, A, B, C, D) => {
        geo?.dispose();
        geo = new FluxBoxGeometry(F, r, A, B, C, D, N, false, tau + 1e-3);
        boxes.children[0].geometry = geo;
        boxes.children[1].geometry = geo;
        boxes.children[2].geometry = new FluxBoxEdgesGeometry(
            geo,
            false,
            tau + 1e-3
        );
        render();
    };

    $: updateGeo(nBoxes, F, r, u0, u1, v0, v1);

    const updateTau = (t) => {
        geo.changeT(t);
        boxes.children[1].visible = t > 0;
        boxes.children[2].geometry?.dispose();
        const edges = new FluxBoxEdgesGeometry(geo, false, t);
        boxes.children[2].geometry = edges;

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
        Then the <b>flux</b> of the vector field through the surface is given by

        <M display>{`\\iint_\\Omega \\mathbf F\\cdot\\,d\\mathbf S`}</M>
        <M display>{`=\\iint_\\Omega \\mathbf F\\cdot\\mathbf N\\,dS`}</M>
        <M display>
            {`=\\iint_D \\mathbf F(\\mathbf r(u,v)) \\cdot \\mathbf r_u \\times \\mathbf r_v\\,dS.`}
        </M>
    </p>

    <p>
        Choose a vector field: <select bind:value={currentField}>
            {#each exampleFields as obj}
                <option value={obj}>{obj.title}</option>
            {/each}
        </select>
    </p>

    <p>
        Choose a parametric surface: <select bind:value={currentSurface}>
            {#each exampleSurfaces as obj}
                <option value={obj}>{obj.title}</option>
            {/each}
        </select>
    </p>

    <p class="row">
        <span class="col"><M>{'\\Delta t'}</M></span>
        <span class="col-8"
            ><input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={tau}
            /></span
        >
        <span class="col-2"
            ><button
                on:click={() => {
                    setF(currentField);
                    setRuv(currentSurface);
                }}
            >
                <i class="bi bi-arrow-clockwise" />
            </button></span
        >
    </p>

    <PlayButtons
        bind:animation
        on:animate
        on:play={() => {
            console.log("playin'");
            boxes.visible = true;
            currentField.animation = true;
        }}
        on:pause={() => {
            last = null;
        }}
        on:rew={() => {
            tau = 0;
        }}
    />

    <div class="row">
        <span class="col"><M>{'N = '}</M></span>
        <span class="col-6"
            ><input
                type="range"
                min="1"
                max="20"
                step="1"
                bind:value={nBoxes}
            /></span
        >
        <span class="col-2"
            >Show <input
                type="checkbox"
                bind:checked={boxes.visible}
                on:change={render}
            /></span
        >
    </div>
</div>
