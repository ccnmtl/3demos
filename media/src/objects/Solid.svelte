<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    import { dependsOn } from './Vector.svelte';
    import M from '../M.svelte';
    import ObjHeader from '../ObjHeader.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import { tickTock } from '../stores';

    const config = {};
    const math = create(all, config);

    const dispatch = createEventDispatcher();

    import {
        colorBufferVertices,
        marchingSegments,
        vMaxMin,
        blueUpRedDown,
        checksum,
        ParametricGeometry,
        RectangularSolidGeometry,
        CylindricalSolidGeometry,
    } from '../utils.js';

    import InputChecker from '../form-components/InputChecker.svelte';
    import ColorBar from '../settings/ColorBar.svelte';
    // import ObjectParamInput from '../form-components/ObjectParamInput.svelte';

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};

    export let params = {
        coords: 'rect',
        a: '0',
        b: '1',
        c: '0',
        d: '1',
        e: '0',
        f: '(x + y) / 2',
        t0: '0',
        t1: '1',
    };

    export let scene;

    export let color = '#3232ff';
    export let animation = false;
    export let render;

    let nX = 60;

    let tau = 0;
    let last = null;
    let texString1 = '';

    let chooseDensity = false;
    let densityString = '1';
    let compiledDensity;
    let densityFunc;
    let vMin = -1;
    let vMax = 1;
    // export let myId;

    const colorMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 70,
        side: THREE.DoubleSide,
        vertexColors: true,
    });

    const colorMeBadd = (mesh, f) => {
        [vMax, vMin] = vMaxMin(mesh, f);
        if (vMax == vMin) {
            if (vMax == 0) {
                vMax = 1;
                vMin = -1;
            } else {
                vMax = (4 / 3) * Math.abs(vMax);
                vMin = (-4 / 3) * Math.abs(vMin);
            }
        }

        colorBufferVertices(mesh, (x, y, z) => {
            const value = f(x, y, z);
            return blueUpRedDown((2 * (value - vMin)) / (vMax - vMin) - 1);
        });
    };

    // $: if (chooseDensity) {
    //     densityString = densityString || '1';
    //     compiledDensity = math.parse(densityString).compile();
    //     densityFunc = (x, y, z) => compiledDensity.evaluate({ x, y, z });

    //     if (densityFunc) {
    //         surfaceMesh.children[1].visible = false;
    //         colorMeBadd(surfaceMesh.children[0], densityFunc);
    //         surfaceMesh.children[0].material = colorMaterial;
    //     }
    //     render();
    // } else {
    //     if (surfaceMesh) {
    //         surfaceMesh.children[1].visible = true;
    //         surfaceMesh.children[0].material = plusMaterial;
    //         render();
    //     }
    // }

    const geometry = new RectangularSolidGeometry(
        -Math.sqrt(2),
        1,
        (x) => x / 2,
        (x) => 2 - x * x,
        (x, y) => (x * x) / 3 - (y * y) / 3,
        (x, y) => 1 + Math.sin(x * 4) / 4
    );

    const edges = new THREE.EdgesGeometry(geometry, Math.Pi / 6);

    const material = new THREE.MeshPhongMaterial({
        color: '#993588',
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 2,
        side: THREE.BackSide,
    });

    const box = new THREE.Mesh(geometry, material);

    const borders = new THREE.LineSegments(edges, whiteLineMaterial);

    scene.add(box);
    box.add(borders);

    const geo0 = new CylindricalSolidGeometry(
        (2 * Math.PI) / 3,
        2 * Math.PI,
        () => 1,
        (th) => 2 + Math.sin(7 * th) / 2,
        (r) => (r * r) / 8,
        (r, th) => 2 - r / 2,
        120,
        20
    );

    box.geometry = geo0;

    // borders.visible = false;
    console.log('boxes', box, borders);

    render();
</script>

<div>
    Coordinates
    <select bind:value={params.coords}>
        <option value="rect">Rectangular</option>
        <option value="cyl">Cylindrical</option>
        <option value="spher">Spherical</option>
    </select>

    <!-- <input type="checkbox" bind:value={borders.visible} /> -->
</div>
