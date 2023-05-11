<script context="module">
    import { create, all } from 'mathjs';
    const config = {};
    const math = create(all, config);

    /**
     * Checks if math expression has a dependence on ch
     * Should probably live elsewhere, but may want to export it
     */
    export const dependsOn = (parms, ch = 't') =>
        Object.entries(parms)
            .filter((e) => typeof e[1] === 'string')
            .some((e) => {
                const [key] = e;
                const nodes = math.parse(parms[key]).filter((node) => {
                    return node.isSymbolNode;
                });
                return nodes.some((node) => node.name === ch);
            });
    // console.log('Depends test', dependsOn({ x: 'sin(t) + 5' }));
</script>

<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    // import { slide } from 'svelte/transition';
    import * as THREE from 'three';
    import { tickTock } from '../stores';

    import PlayButtons from '../form-components/PlayButtons.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import { ArrowBufferGeometry, checksum } from '../utils.js';
    import InputChecker from '../form-components/InputChecker.svelte';

    // export let paramString;

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};
    export let onSelect = function() {};

    export let params = {
        a: '-1',
        b: '1',
        c: '2',
        x: '0',
        y: '0',
        z: '0',
        n0: 0,
        n1: 1,
    };

    export let color = '#FF0000';
    let tau = 0;
    let last;
    let texString1 = '';

    // display controls in objects panel
    // considered for Chapters that add many objects that need not be user-configurable.
    export let show = true;

    export let scene;
    export let render = () => {};
    export let onClose = () => {};
    export let gridStep;
    export let animation = false;
    export let selected;
    export let selectedObject;

    let minimize = false;

    const dispatch = createEventDispatcher();

    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: true,
        opacity: 1.0,
    });
    const vfScale = gridStep * 5;
    const arrowArgs = {
        radiusTop: vfScale / 24,
        radiusBottom: vfScale / 75,
        heightTop: vfScale / 8,
    };
    const arrows = new THREE.Object3D();

    const arrow = new THREE.Mesh(
        new ArrowBufferGeometry({
            ...arrowArgs,
            height: 1,
        }),
        arrowMaterial
    );
    arrows.add(arrow);

    scene.add(arrows);

    const updateVector = function () {
        const { a, b, c, x, y, z } = params;

        let t;
        const { t0, t1 } = params;
        if (t0 && t1) {
            const T0 = math.evaluate(t0);
            const T1 = math.evaluate(t1);

            t = T0 + tau * (T1 - T0);
        } else {
            t = 0;
        }
        let N0, N1;
        const { n0, n1 } = params;
        N0 = n0 || 0;
        N1 = n1 || 0;

        while (arrows.children.length < N1 - N0 + 1) {
            arrows.add(
                new THREE.Mesh(
                    new ArrowBufferGeometry({
                        ...arrowArgs,
                        height: 1,
                    }),
                    arrowMaterial
                )
            );
        }
        while (arrows.children.length > N1 - N0 + 1) {
            // console.log(arrows.children, arrows.children.length);
            const arrow = arrows.children[arrows.children.length - 1];
            arrow.geometry.dispose();
            arrows.remove(arrow);
        }

        for (let index = N0; index <= N1; index++) {
            const arrow = arrows.children[index - N0];
            const [A, B, C, X, Y, Z] = math
                .parse([a, b, c, x, y, z])
                .map((s) => s.evaluate({ t, n: index }));

            const v = new THREE.Vector3(A, B, C);
            arrow.position.set(X, Y, Z);

            arrow.geometry.adjustHeight(Math.max(1e-6, v.length()));

            arrow.lookAt(v.add(arrow.position));
        }

        arrows.name = uuid;
        onRenderObject(arrows);
        render();
    };

    // call updateVector() when params change
    $: isDynamic = dependsOn(params, 't');
    $: isDiscrete = dependsOn(params, 'n');
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateVector();

    // recolor on demand
    $: {
        if (selectedObject === null || selected) {
            arrowMaterial.opacity = 1.0;
        } else {
            arrowMaterial.opacity = 0.3;
        }
        arrowMaterial.color.set(color);
        render();
    }

    onMount(() => {
        // console.log('mountin\'');
        if (animation) dispatch('animate');
    });
    onDestroy(() => {
        onDestroyObject(arrows);
        while (arrows.children.length > 0) {
            const arrow = arrows.children[0];
            arrow.geometry.dispose();
            arrow.material?.dispose();
            arrows.remove(arrow);
        }

        scene.remove(arrows);
        window.removeEventListener('keydown', onKeyDown, false);
        render();
    });

    const toggleHide = function() {
        arrow.visible = !arrow.visible;
        render();
    };

    const onKeyDown = (e) => {
        if (e.target.matches('input')) {
            return;
        }

        switch (e.key) {
            case 'Backspace':
                if(selected){
                    toggleHide();
                }
                break;
        }
    };

    window.addEventListener('keydown', onKeyDown, false);

    // make display name more consistent
    const varNames = {
        a: 'v_1',
        b: 'v_2',
        c: 'v_3',
        x: 'p_1',
        y: 'p_2',
        z: 'p_3',
    };

    /**
     *  "Check parameters"
     * @param val (string)
     * */
    const chickenParms = (val) => {
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
            if (dependsOn({ val }, 'n')) {
                params.n0 = params.n0 || 0;
                params.n1 = params.n1 || 0;

                localParms.n = params.n1;
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

        texString1 = (Math.round(100 * T) / 100).toString();

        updateVector(T);
    };

    // Start animating if animation changes (e.g. animating scene published)
    $: if (animation) {
        dispatch('animate');
    }
    $: if (animation) {
        dispatch('animate');
        const currentTime = $tickTock;
        last = last || currentTime;
        update(currentTime - last);
        last = currentTime;
    } else {
        // last = null;
    }
</script>

<div
    class={'boxItem' + (selected ? ' selected' : '')}
    hidden={!show}
    on:keydown
>
    <ObjHeader bind:minimize {onClose} {toggleHide} objHidden={!arrow.visible} {color} {onSelect}>
        Vector <M size="sm">\langle v_1, v_2, v_3 \rangle</M>
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
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
                <!-- <div class="dynamic-container" transition:slide> -->
                {#each ['t0', 't1'] as name}
                    {#if name === 't1'}
                        <span class="box box-3"
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
                    <span class="t-box">t = {texString1}</span>
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
                    className="box box-2"
                    bind:animation
                    on:animate
                    on:pause={() => (last = null)}
                    on:stop={() => {
                        tau = 0;
                        last = null;
                        update();
                    }}
                    on:rew={() => {
                        tau = 0;
                        update();
                    }}
                />
                <!-- </div> -->
            {/if}

            {#if isDiscrete}
                <!-- <div class="dynamic-container" transition:slide> -->
                <input
                    class="form-control form-control-sm box-1"
                    type="number"
                    max={params.n1}
                    bind:value={params.n0}
                    name="n0"
                />
                <span class="box box-3"
                    ><M size="sm">{'\\leq n \\leq '}</M></span
                >
                <input
                    class="form-control form-control-sm box-4"
                    type="number"
                    bind:value={params.n1}
                    name="n1"
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

<style>
    .dynamic-container {
        grid-column: 0 / 5;
    }
    input.form-control {
        color: black;
    }
</style>
