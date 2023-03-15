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
        (x, y) => (x * x) / 4 + (y * y) / 4,
        () => 1
    );

    const material = new THREE.MeshPhongMaterial({
        color: '#993588',
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });
    const box = new THREE.Mesh(geometry, material);

    scene.add(box);

    console.log(box);
</script>

<div>
    Coordinates
    <select bind:value={params.coords}>
        <option value="rect">Rectangular</option>
        <option value="cyl">Cylindrical</option>
        <option value="spher">Spherical</option>
    </select>
</div>
