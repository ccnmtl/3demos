<script context="module">
    import { create, all } from 'mathjs';
    const config = {};
    const math = create(all, config);

    /**
     * Checks if math expression has a dependence on ch
     * Should probably live elsewhere, but may want to export it
     */
    export const dependsOn = (parms, ch = 't') =>
        Object.keys(parms).some((key) => {
            const nodes = math.parse(parms[key]).filter((node) => {
                return node.isSymbolNode;
            });
            return nodes.some((node) => node.name === ch);
        });

    console.log('Depends test', dependsOn({ x: 'sin(t) + 5' }));
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { tickTock } from '../stores';

    import PlayButtons from '../form-components/PlayButtons.svelte';
    import M from '../M.svelte';
    import ObjHeader from '../ObjHeader.svelte';
    import { ArrowBufferGeometry, checksum } from '../utils.js';
    import InputChecker from '../form-components/InputChecker.svelte';

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
    export let tau = 0;
    let last;
    let texString1 = `t = 0`;

    // display controls in objects panel
    // considered for Chapters that add many objects that need not be user-configurable.
    export let show = true;

    export let scene;
    export let shadeUp;
    export let render = () => {};
    export let onClose = () => {};
    export let gridStep;
    export let animation = false;
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

    const updateVector = function (t = 0) {
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

    // call updateVector() when params change
    $: isDynamic = dependsOn(params);
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateVector();

    // recolor on demand
    $: {
        arrowMaterial.color.set(color);
        render();
    }

    onMount(updateVector);
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
        /**
         *  "Check parameters"
         * */
        let valuation;
        try {
            const localParms = {};
            const parsedVal = math.parse(val);
            if (dependsOn({ val }, 't')) {
                params.t0 = params.t0 || '0';
                params.t1 = params.t1 || '1';

                const t0 = math.parse(params.t0).evaluate();
                const t1 = math.parse(params.t1).evaluate();

                localParms.t = (t0 + t1) / 2;
            }
            valuation = Number.isFinite(parsedVal.evaluate(localParms));
        } catch (e) {
            console.log('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    const update = (dt = 0) => {
        const { t0, t1 } = params;
        const A = math.parse(t0).evaluate();
        const B = math.parse(t1).evaluate();

        tau += dt / (B - A);
        if (tau > 1 || tau < 0) tau %= 1;

        const T = A + (B - A) * tau;

        texString1 = `t = ${Math.round(100 * T) / 100}`;

        updateVector(T);
    };
    // Should be reactive
    $: if (animation) {
        const currentTime = $tickTock;
        last = last || currentTime;
        update(currentTime - last);
        last = currentTime;
    }
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
                    <span class="box-1">
                        Plot at position <M size="sm">(p_1, p_2, p_3)</M>:
                    </span>
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

            {#if isDynamic}
                {#each ['t0', 't1'] as name}
                    {#if name === 't1'}
                        <span class="box-3"
                            ><M size="sm">{'\\leq t \\leq '}</M></span
                        >
                    {/if}
                    <InputChecker
                        className="form-control form-control-sm {name === 't0'
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

                <span class="box-1">
                    <M size="sm">{texString1}</M>
                </span>
                <input
                    type="range"
                    bind:value={tau}
                    min="0"
                    max="1"
                    step="0.001"
                    on:input={() => update()}
                    class="box box-2"
                />

                <PlayButtons
                    bind:animation
                    on:animate
                    on:pause={() => (last = null)}
                    on:stop={() => {
                        tau = 0;
                        last = null;
                    }}
                    on:rew={() => (tau = 0)}
                />
            {/if}

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
