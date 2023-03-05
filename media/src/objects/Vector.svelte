<script>
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';
    // import { tickTock } from '../stores';

    import M from '../M.svelte';
    import ObjHeader from '../ObjHeader.svelte';
    import { ArrowBufferGeometry, checksum } from '../utils.js';
    import InputChecker from '../form-components/InputChecker.svelte';

    const config = {};
    const math = create(all, config);

    // export let paramString;

    export let params = {
        a: '-1',
        b: '1',
        c: '2',
        x: '0',
        y: '0',
        z: '0',
    };

    export let color = '#FF0000';

    // display controls in objects panel
    // considered for Chapters that add many objects that need not be user-configurable.
    export let show = true;

    if (!('show' in params)) {
        params.show = true;
    }

    export let scene;
    export let shadeUp;
    export let render = () => {};
    export let onClose = () => {};
    export let gridStep;
    export let selected;

    let hidden = false;

    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });
    const vfScale = gridStep * 5;
    const arrowArgs = {
        radiusTop: vfScale / 24,
        radiusBottom: vfScale / 75,
        heightTop: vfScale / 8,
    };

    const arrow = new THREE.Mesh(
        new ArrowBufferGeometry({
            ...arrowArgs,
            height: 1,
        }),
        arrowMaterial
    );

    scene.add(arrow);

    const updateCurve = function (t = 0) {
        const { a, b, c, x, y, z } = params;
        const [A, B, C, X, Y, Z] = math
            .parse([a, b, c, x, y, z])
            .map((s) => s.evaluate({ t }));

        const v = new THREE.Vector3(A, B, C);

        arrow.position.set(X, Y, Z);

        arrow.geometry.adjustHeight(v.length());

        arrow.lookAt(v.add(arrow.position));

        render();
    };

    // call updateCurve() when params change
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateCurve();

    // recolor on demand
    $: arrowMaterial.color.set(color);

    onMount(updateCurve);
    onDestroy(() => {
        arrow.geometry && arrow.geometry?.dispose();
        arrow.material?.dispose();
        scene.remove(arrow);
        window.removeEventListener('keydown', shiftDown, false);
        render();
    });

    const shiftDown = (e) => {
        if (shadeUp) {
            switch (e.key) {
                case 'Backspace':
                    arrow.visible = !arrow.visible;
                    render();
                    break;
            }
        }
    };

    window.addEventListener('keydown', shiftDown, false);

    // make display name more consistent
    const varNames = {
        a: 'v_1',
        b: 'v_2',
        c: 'v_3',
        x: 'p_1',
        y: 'p_2',
        z: 'p_3',
    };

    const chickenParms = (val) => {
        try {
            math.parse(val);
        } catch (e) {
            console.log('Parse error in expression', val, e);
            return false;
        }
        return true;
    };
</script>

<div
    class={'boxItem' + (selected ? ' selected' : '')}
    hidden={!show}
    on:click
    on:keydown
>
    <div class="box-title">
        <span style="color: {color};"
            ><strong>Vector</strong>
            <M size="sm">\langle v_1, v_2, v_3 \rangle</M></span
        >
        <ObjHeader bind:hidden bind:onClose />
    </div>
    <div {hidden}>
        <div class="container">
            {#each ['a', 'b', 'c', 'x', 'y', 'z'] as name}
                {#if name === 'x'}
                    Plot at position <M size="sm">(p_1, p_2, p_3)</M>:
                {/if}
                <span class="box-1"><M size="sm">{varNames[name]} =</M></span>
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    on:cleared={(e) => {
                        params[name] = e.detail;
                    }}
                />
            {/each}

            <span class="box-1">Color</span>
            <span class="box box-2">
                <input
                    type="color"
                    name="colorPicker"
                    id="colorPicker"
                    bind:value={color}
                    style="width:85%; padding: 1px 1px;"
                />
            </span>
        </div>
    </div>
</div>
