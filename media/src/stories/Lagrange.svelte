<script>
    import * as THREE from 'three';

    import { all, create, xor } from 'mathjs';
    import M from '../M.svelte';
    import {
        ShardsEdgesGeometry,
        ShardsGeometry,
        filterBang,
        gaussLegendre,
        sampleImplicitSurface,
        evolveFlowOnLevel,
    } from '../utils';
    import { mathToJSFunction } from '../objects/mathutils';
    import { onMount, onDestroy, untrack } from 'svelte';
    import { demoObjects } from '../states.svelte';

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

    let standardExamples = $state([
        {
            uuid: 'lag-story-example-001-',
            kind: 'level',
            title: 'Sphere',
            params: {
                a: '-2',
                b: '2',
                c: '-2',
                d: '2',
                e: '-2',
                f: '2',
                g: 'x^2 + y^2 - 1',
            },
            color: '#44CB44',
        },
    ]);

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface = $state(
        backupObjects.find((o) => o.kind === 'level') ?? standardExamples[0],
    );

    // $inspect(currentSurface);

    onMount(() => {
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
        color: 0x000000,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });

    const boxes = new THREE.Object3D();
    // boxes.add(new THREE.Mesh(undefined, plusMaterial)); // pos boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // pos edges
    // boxes.add(new THREE.Mesh(undefined, minusMaterial)); // neg boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // neg edges

    scene.add(boxes);

    let boxesVisible = $state(true);
    $effect(() => {
        boxes.visible = boxesVisible;
    });

    let nBoxes = $state(5);
    let boxing = false;

    let x0 = $derived(math.parse(currentSurface.params.a).evaluate());
    let x1 = $derived(math.parse(currentSurface.params.b).evaluate());
    let y0 = $derived(math.parse(currentSurface.params.c).evaluate());
    let y1 = $derived(math.parse(currentSurface.params.d).evaluate());
    let z0 = $derived(math.parse(currentSurface.params.e).evaluate());
    let z1 = $derived(math.parse(currentSurface.params.f).evaluate());
    let g = $derived(
        mathToJSFunction(currentSurface.params.g, ['x', 'y', 'z']),
    );

    let pts = $derived(
        sampleImplicitSurface(
            g,
            [
                [x0, x1],
                [y0, y1],
                [z0, z1],
            ],
            nBoxes,
            nBoxes,
            nBoxes,
        ),
    );

    $inspect(pts);

    const sphereGeo = new THREE.SphereGeometry(0.01, 14, 14);

    $effect(() => {
        untrack(() => {
            for (let index = boxes.children.length - 1; index >= 0; index--) {
                const element = boxes.children[index];
                // element.geometry?.dispose();
                // element.material?.dispose();
                boxes.remove(element);
            }
        });
        for (const p of pts) {
            const box = new THREE.Mesh(sphereGeo, plusMaterial);
            box.position.set(...p);
            boxes.add(box);
        }
        console.log('effecttt', boxes);
        render();
    });

    $effect(() => {
        // console.log('demobj maintenance');
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

    const F = (x, y, z) => [x, y, 1 / 13];

    let req;

    function go() {
        boxes.children.forEach((b) => {
            const [px, py, pz] = evolveFlowOnLevel(
                F,
                g,
                [b.position.x, b.position.y, b.position.z],
                0.01,
            );

            b.position.set(px, py, pz);
        });
        render();
        req = requestAnimationFrame(go);
    }
</script>

<div>
    <p>Hello</p>

    <input
        type="range"
        name=""
        id=""
        min="1"
        bind:value={nBoxes}
        step="1"
        max="20"
    />
    <button
        onclick={() => {
            if (req) {
                cancelAnimationFrame(req);
                req = undefined;
            } else {
                go();
            }
        }}>Evolve</button
    >
</div>

<style>
    /* .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    } */
    /* .blue-button {
        background-color: red;
    } */
</style>
