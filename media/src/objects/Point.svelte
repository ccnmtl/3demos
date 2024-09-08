<script context="module">
    import { create, all } from 'mathjs';
    const config = {};
    const math = create(all, config);

    import { dependsOn } from './Vector.svelte';

    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    // import { slide } from 'svelte/transition';
    import * as THREE from 'three';
    import { tickTock } from '../stores';

    import PlayButtons from '../form-components/PlayButtons.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import { checksum } from '../utils.js';
    import { flashDance } from '../sceneUtils';
    import InputChecker from '../form-components/InputChecker.svelte';
    import Nametag from './Nametag.svelte';

    // export let paramString;

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};
    export let onSelect = function () {};

    export let params = {
        a: '-1',
        b: '1',
        c: '2',
    };

    export let color = '#FFFF33';
    export let title;

    // useless code to suppress dev warnings
    export let camera;
    export let controls;
    export let gridMax;

    camera, controls, gridMax;

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
    export let selectedObjects;

    let minimize = false;

    const dispatch = createEventDispatcher();

    const pointMaterial = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: 1.0,
    });
    const pointGeo = new THREE.SphereGeometry(gridStep / 8, 16, 16);
    const points = new THREE.Group();
    const point = new THREE.Mesh(pointGeo, pointMaterial);
    point.position.set(1, 1, 1);

    points.add(point);
    scene.add(points);

    const updatePoint = function () {
        const { a, b, c } = params;
        let t;
        const { t0, t1 } = params;
        if (t0 && t1) {
            const A = math.evaluate(t0);
            const B = math.evaluate(t1);

            t = A + tau * (B - A);
        } else {
            t = 0;
        }

        let N0, N1;
        const { n0, n1 } = params;

        N0 = n0 || 0;
        N1 = n1 || 0;

        while (points.children.length < N1 - N0 + 1) {
            points.add(new THREE.Mesh(pointGeo, pointMaterial));
        }
        while (points.children.length > N1 - N0 + 1) {
            const point = points.children[points.children.length - 1];
            points.remove(point);
        }

        const [A, B, C] = math.parse([a, b, c]);

        for (let index = N0; index <= N1; index++) {
            const point = points.children[index - N0];

            point.position.set(
                ...[A, B, C].map((s) => s.evaluate({ t, n: index })),
            );
        }

        points.name = uuid;
        onRenderObject(points);
        render();
    };

    // call updateVector() when params change
    $: isDynamic = dependsOn(params);
    $: isDiscrete = dependsOn(params, 'n');

    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updatePoint();

    // recolor on demand
    $: {
        pointMaterial.color.set(color);
        render();
    }

    let boxItemElement;
    /**
     * Close over mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(point, render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };
    $: if (selected && selectedObjects.length > 0) flash();

    onMount(() => {
        if (animation) dispatch('animate');
        titleIndex++;
        title = title || `Point ${titleIndex}`;
    });

    onDestroy(() => {
        onDestroyObject(points);
        // if (point) {
        pointGeo?.dispose();
        pointMaterial?.dispose();

        scene.remove(points);
        window.removeEventListener('keydown', onKeyDown, false);
        render();
    });

    const toggleHide = function () {
        points.visible = !points.visible;
        render();
    };

    const onKeyDown = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }

        if (selected) {
            switch (e.key) {
                case 'Backspace':
                    toggleHide();
                    break;
                case 'p':
                    animation = !animation;
                    break;
                case 'r':
                    tau = 0;
                    if (!animation) update();
                    break;
            }
        }
    };

    window.addEventListener('keydown', onKeyDown, false);

    // make display name more consistent
    const varNames = {
        a: 'p_1',
        b: 'p_2',
        c: 'p_3',
    };

    /**
     *  "Check parameters"
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
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    // texString1 = `t = ${Math.round(100 * T) / 100}`;

    const update = (dt = 0) => {
        const { t0, t1 } = params;
        const A = math.parse(t0).evaluate();
        const B = math.parse(t1).evaluate();

        tau += dt / (B - A);
        if (tau > 1 || tau < 0) tau %= 1;

        const T = A + (B - A) * tau;
        texString1 = (Math.round(100 * T) / 100).toString();

        updatePoint(T);
    };
    // Start animating if animation changes (e.g. animating scene published)
    $: if (animation) {
        dispatch('animate');
    }
    $: if (animation) {
        const currentTime = $tickTock;
        last = last || currentTime;
        update(currentTime - last);
        last = currentTime;
    } else {
        last = null;
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="boxItem"
    class:selected
    bind:this={boxItemElement}
    on:keydown
    hidden={!show}
>
    <ObjHeader
        bind:minimize
        bind:selectedObjects
        {onClose}
        {toggleHide}
        objHidden={!point.visible}
        {color}
        {onSelect}
    >
        <Nametag bind:title />
        <M size="sm">\langle p_1, p_2, p_3 \rangle</M>
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['a', 'b', 'c'] as name}
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
                <!-- <div class="dynamic-container" transition:slide|global> -->
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
                    bind:animation
                    on:animate
                    on:pause={() => (last = null)}
                    on:rew={() => {
                        tau = 0;
                        update();
                    }}
                />
                <!-- </div> -->
            {/if}

            {#if isDiscrete}
                <input
                    class="form-control form-control-sm box-1"
                    type="number"
                    max={params.n1}
                    bind:value={params.n0}
                    name="n0"
                />
                <span class="box box-3">
                    <M size="sm">{'\\leq n \\leq '}</M>
                </span>
                <input
                    class="form-control form-control-sm box-4"
                    type="number"
                    min={params.n0}
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
    /* .dynamic-container {
        grid-column: 0 / 5;
    } */
    .t-box {
        display: inline-block;
        width: 40%;
        text-align: left;
    }
    input.form-control {
        color: black;
    }
</style>
