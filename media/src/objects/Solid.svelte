<script>
    import { onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    // import { dependsOn } from './Vector.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    // import PlayButtons from '../form-components/PlayButtons.svelte';
    import { vMin, vMax } from '../stores';

    const config = {};
    const math = create(all, config);

    import {
        colorBufferVertices,
        vMaxMin,
        blueUpRedDown,
        checksum,
        RectangularSolidGeometry,
        CylindricalSolidGeometry,
        SphericalSolidGeometry,
    } from '../utils.js';

    import InputChecker from '../form-components/InputChecker.svelte';
    import ColorBar from '../settings/ColorBar.svelte';
    // import ObjectParamInput from '../form-components/ObjectParamInput.svelte';

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};
    export let onSelect = function () {};
    export let selectedColor;

    // onMount(onRenderObject);
    onDestroy(() => {
        scene.remove(solidGroup);
        box.geometry.dispose();
        box.material.dispose();
        borders.geometry.dispose();
        borders.material.dispose();

        onDestroyObject(box);
        render();
    });

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
    // export let controls;
    // export let camera;
    // export let gridStep;
    export let render = () => {};
    export let onClose = () => {};
    export let selected;

    let hidden = false;
    export let color = '#5432ff';
    // export let animation = false;

    let nX = 60;

    // let tau = 0;
    // let last = null;
    // let texString1 = '';

    let chooseDensity = false;
    let densityString = '1';
    let compiledDensity;
    let densityFunc;

    // export let myId;

    const colorMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 70,
        side: THREE.DoubleSide,
        vertexColors: true,
    });

    const colorMeBadd = (mesh, f) => {
        const [vMaxLocal, vMinLocal] = vMaxMin(mesh, f);
        $vMin = Math.min($vMin, vMinLocal);
        $vMax = Math.max($vMax, vMaxLocal);
        if ($vMax == $vMin) {
            if ($vMax == 0) {
                $vMax = 1;
                $vMin = -1;
            } else {
                $vMax = (4 / 3) * Math.abs($vMax);
                $vMin = (-4 / 3) * Math.abs($vMin);
            }
        }

        colorBufferVertices(mesh, (x, y, z) => {
            const value = f(x, y, z);
            return blueUpRedDown((2 * (value - $vMin)) / ($vMax - $vMin) - 1);
        });
    };

    $: ($vMin, $vMax), chooseDensity && colorMeBadd(box, densityFunc);

    $: if (chooseDensity) {
        densityString = densityString || '1';
        compiledDensity = math.parse(densityString).compile();
        densityFunc = (x, y, z) => compiledDensity.evaluate({ x, y, z });

        if (densityFunc) {
            colorMeBadd(box, densityFunc);
            box.material = colorMaterial;
        }
        render();
    } else {
        if (box) {
            box.material = material;
            render();
        }
    }

    // const geometry = new RectangularSolidGeometry(
    //     -Math.sqrt(2),
    //     1,
    //     (x) => x / 2,
    //     (x) => 2 - x * x,
    //     (x, y) => (x * x) / 3 - (y * y) / 3,
    //     (x, y) => 1 + Math.sin(x * 4) / 4
    // );

    // const edges = new THREE.EdgesGeometry(geometry, Math.Pi / 6);

    const material = new THREE.MeshPhongMaterial({
        color: '#993588',
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });

    $: {
        if (selected) {
            material.color.set(selectedColor);
        } else {
            material.color.set(color);
        }
        render();
    }

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        side: THREE.BackSide,
    });

    const box = new THREE.Mesh(new THREE.BufferGeometry(), material);
    const solidGroup = new THREE.Group();

    box.name = uuid;

    const borders = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        whiteLineMaterial
    );

    solidGroup.add(box);
    solidGroup.add(borders);
    scene.add(solidGroup);

    const renameCoords = (s, coords) => {
        let stone;
        if (coords === 'rect') {
            stone = {
                theta: 'x',
                r: 'y',
                phi: 'y',
                rho: 'z',
            };
        } else if (coords === 'cyl') {
            stone = {
                x: 'theta',
                y: 'r',
                phi: 'r',
                rho: 'z',
            };
        } else {
            stone = {
                x: 'theta',
                y: 'phi',
                r: 'phi',
                z: 'rho',
            };
        }
        return math
            .parse(s)
            .transform((node) => {
                if (node.isSymbolNode) {
                    node.name = stone[node.name] || node.name;
                }
                return node;
            })
            .toString();
    };

    $: if (params.coords) {
        params.c = renameCoords(params.c, params.coords);
        params.d = renameCoords(params.d, params.coords);
        params.e = renameCoords(params.e, params.coords);
        params.f = renameCoords(params.f, params.coords);
    }

    // "compiled" versions of bounds
    let A, B, C, D, E, F;
    const updateRegion = () => {
        A = math.evaluate(params.a);
        B = math.evaluate(params.b);
        let geom;

        const cComp = math.parse(params.c).compile();
        const dComp = math.parse(params.d).compile();
        const eComp = math.parse(params.e).compile();
        const fComp = math.parse(params.f).compile();
        switch (params.coords) {
            case 'rect':
                C = (x) => cComp.evaluate({ x });
                D = (x) => dComp.evaluate({ x });
                E = (x, y) => eComp.evaluate({ x, y });
                F = (x, y) => fComp.evaluate({ x, y });
                geom = new RectangularSolidGeometry(A, B, C, D, E, F, nX, nX);
                break;
            case 'cyl':
                C = (theta) => cComp.evaluate({ theta });
                D = (theta) => dComp.evaluate({ theta });
                E = (r, theta) => eComp.evaluate({ r, theta });
                F = (r, theta) => fComp.evaluate({ r, theta });
                geom = new CylindricalSolidGeometry(
                    A,
                    B,
                    C,
                    D,
                    E,
                    F,
                    nX * 2,
                    nX / 2
                );
                break;
            case 'spher':
                C = (theta) => cComp.evaluate({ theta });
                D = (theta) => dComp.evaluate({ theta });
                E = (theta, phi) => eComp.evaluate({ theta, phi });
                F = (theta, phi) => fComp.evaluate({ theta, phi });
                geom = new SphericalSolidGeometry(A, B, C, D, E, F, nX * 2, nX);
                break;
            default:
                console.log('Something went wrong with the coord system.');
                break;
        }

        geom.computeBoundingBox();
        geom.computeBoundingSphere();

        box.geometry?.dispose();
        box.geometry = geom;
        borders.geometry = new THREE.EdgesGeometry(geom, 40);

        if (chooseDensity && densityFunc) {
            colorMeBadd(box, densityFunc);
        }

        onRenderObject(box);
        render();
    };

    // borders.visible = false;
    // console.log('boxes', box, borders);

    const chickenParms = (val, { a, b, c, d, coords }) => {
        let valuation;
        try {
            const [A, B, C, D, V] = math.parse([a, b, c, d, val]);

            const u = (A.evaluate() + B.evaluate()) / 2;
            const u1 = {};
            if (coords === 'rect') {
                u1['x'] = u;
            } else {
                u1['theta'] = u;
            }

            const v = (C.evaluate(u1) + D.evaluate(u1)) / 2;
            if (coords === 'rect') {
                u1['y'] = v;
            } else if (coords === 'cyl') {
                u1['r'] = v;
            } else {
                u1['phi'] = v;
            }
            valuation = V.evaluate(u1);
        } catch (error) {
            console.log('ParseError in evaluation.', error);
            return false;
        }
        if (Number.isFinite(valuation)) {
            return true;
        } else {
            console.log('Evaluation error. Incomplete expression, maybe.');
            return false;
        }
    };

    // Only run the update if the params have changed.
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateRegion() && render();

    render();
</script>

<div class="boxItem" class:selected on:keydown>
    <ObjHeader bind:hidden {onClose} {color} {onSelect}>Solid Region</ObjHeader>
    <div {hidden}>
        <div class="threedemos-container container">
            <span class="box-1">Coordinates</span>
            <select class="box-2" bind:value={params.coords}>
                <option value="rect">Rectangular</option>
                <option value="cyl">Cylindrical</option>
                <option value="spher">Spherical</option>
            </select>

            {#each ['a', 'b'] as name}
                {#if name === 'b'}
                    <span class="box box-3"
                        ><M size="sm">
                            {#if params.coords === 'rect'}
                                {`\\leq x \\leq`}
                            {:else}
                                {`\\leq \\theta \\leq`}
                            {/if}
                        </M>
                    </span>
                {/if}
                <InputChecker
                    className="form-control form-control-sm {name === 'a'
                        ? 'box-1'
                        : 'box-4'}"
                    checker={(val) =>
                        Number.isFinite(math.parse(val).evaluate())}
                    value={params[name]}
                    {name}
                    on:cleared={(e) => {
                        params[name] = e.detail;
                    }}
                />
            {/each}

            {#each ['c', 'd'] as name}
                {#if name === 'd'}
                    <span class="box box-3"
                        ><M size="sm">
                            {#if params.coords === 'rect'}
                                {`\\leq y \\leq`}
                            {:else if params.coords === 'cyl'}
                                {`\\leq r \\leq`}
                            {:else}
                                {`\\leq \\phi \\leq`}
                            {/if}</M
                        >
                    </span>
                {/if}
                <InputChecker
                    className="form-control form-control-sm {name === 'c'
                        ? 'box-1'
                        : 'box-4'}"
                    checker={(val) => {
                        const A = math.evaluate(params.a);
                        const B = math.evaluate(params.b);
                        let parsedVal;
                        try {
                            parsedVal = math
                                .parse(val)
                                .evaluate(
                                    params.coords === 'rect'
                                        ? { x: (A + B) / 2 }
                                        : { theta: (A + B) / 2 }
                                );
                        } catch (e) {
                            console.error(e);
                            return false;
                        }
                        return Number.isFinite(parsedVal);
                    }}
                    value={params[name]}
                    {name}
                    on:cleared={(e) => {
                        params[name] = e.detail;
                    }}
                />
            {/each}

            {#each ['e', 'f'] as name}
                {#if name === 'f'}
                    <span class="box box-3"
                        ><M size="sm">
                            {#if params.coords === 'spher'}
                                {`\\leq \\rho \\leq`}
                            {:else}
                                {`\\leq z \\leq`}
                            {/if}</M
                        >
                    </span>
                {/if}
                <InputChecker
                    className="form-control form-control-sm {name === 'e'
                        ? 'box-1'
                        : 'box-4'}"
                    checker={chickenParms}
                    value={params[name]}
                    {name}
                    {params}
                    on:cleared={(e) => {
                        params[name] = e.detail;
                    }}
                />
            {/each}

            <span class="box-1">Resolution</span>
            <input
                type="range"
                bind:value={nX}
                min="10"
                max="80"
                step="5"
                class="box box-2"
            />
            <span class="box-1"> Density </span>
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    name="chooseDensity"
                    id="chooseDensity"
                    bind:checked={chooseDensity}
                />
                <span class="slider round" />
            </label>

            {#if chooseDensity}
                <span class="box-1"><M size="sm">\mu(x,y,z) =</M></span>
                <InputChecker
                    value={densityString}
                    checker={(val) => {
                        const pos = box.geometry.attributes.position.array;
                        const N = Math.round((Math.random() * pos.length) / 3);
                        const [x, y, z] = pos.slice(3 * N, 3 * N + 3);

                        let parsedVal;
                        try {
                            parsedVal = math.parse(val).evaluate({ x, y, z });
                        } catch (e) {
                            console.error(e);
                            return false;
                        }
                        return Number.isFinite(parsedVal);
                    }}
                    name={'mu'}
                    {params}
                    on:cleared={(e) => {
                        compiledDensity = math.parse(e.detail).compile();
                        densityFunc = (x, y, z) =>
                            compiledDensity.evaluate({ x, y, z });
                        colorMeBadd(box, densityFunc);
                        // surfaceMesh.children[0].geometry.attributes.color.needsUpdate = true;
                        // surfaceMesh.children[0].material = colorMaterial;
                        // surfaceMesh.children[0].material = plusMaterial;
                        render();
                        densityString = e.detail;
                    }}
                />
                <div class="box colorbar-container">
                    <ColorBar vMin={$vMin} vMax={$vMax} />
                </div>
            {:else}
                <span class="box box-2">
                    <input
                        type="color"
                        name="colorPicker"
                        id="colorPicker"
                        bind:value={color}
                        style="width:85%; padding: 1px 1px;"
                    />
                </span>
            {/if}
        </div>
    </div>
</div>

<style>
    .box-3 {
        color: white;
        vertical-align: middle;
        text-align: center;

        grid-column: 2 / 3;
    }
    input {
        color: black;
    }

    .colorbar-container {
        grid-column: 1 / -1;
        height: 2.5rem;
        margin-bottom: 5px;
    }
</style>
