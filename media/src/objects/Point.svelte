<script module>
    import { create, all } from 'mathjs';
    const config = {};
    const math = create(all, config);

    import { dependsOn } from './Vector.svelte';

    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
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

    let {
        uuid,
        onRenderObject,
        onDestroyObject,
        params = $bindable({
            a: '-1',
            b: '1',
            c: '2',
        }),
        color = $bindable('#FFFF33'),
        title = $bindable(),
        scene,
        render,
        gridStep,
        show = true,
        animation = $bindable(false),
        selected,
        selectPoint,
        selectObject,
        animate,
        onClose = () => {},
    } = $props();

    let tau = $state(0);
    let t0 = $derived(math.parse(params.t0 ?? '0').evaluate());
    let t1 = $derived(math.parse(params.t1 ?? '1').evaluate());
    let tVal = $derived(t0 + tau * (t1 - t0));
    let displayTVal = $derived(tVal.toFixed(2));

    let N0 = $derived(math.parse(params.n0 ?? '0').evaluate());
    let N1 = $derived(math.parse(params.n1 ?? '0').evaluate());

    let last;

    let minimize = $state(false);

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
    selectPoint(point);
    scene.add(points);

    const updatePoint = function () {
        while (points.children.length < N1 - N0 + 1) {
            points.add(new THREE.Mesh(pointGeo, pointMaterial));
        }
        while (points.children.length > N1 - N0 + 1) {
            const point = points.children[points.children.length - 1];
            points.remove(point);
        }

        const { a, b, c } = params;
        const [A, B, C] = math.parse([a, b, c]);

        for (let index = N0; index <= N1; index++) {
            const point = points.children[index - N0];

            point.position.set(
                ...[A, B, C].map((s) => s.evaluate({ t: tVal, n: index })),
            );
        }

        points.name = uuid;
        onRenderObject(points);
        render();
    };

    // call updateVector() when params change
    let isDynamic = $derived(dependsOn(params, 't'));
    let isDiscrete = $derived(dependsOn(params, 'n'));

    $effect(() => {
        params;
        updatePoint();
    });

    // recolor on demand
    $effect(() => {
        pointMaterial.color.set(color);
        render();
    });

    let boxItemElement;
    /**
     * Close over mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(point, render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };
    $effect(() => {
        if (selected) untrack(flash);
    });

    onMount(() => {
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
        tau += dt / (t1 - t0);
        tau %= 1;
        updatePoint(tVal);
    };
    // Start animating if animation changes (e.g. animating scene published)
    $effect(() => {
        if (animation) untrack(animate);
    });
    $effect(() => {
        if (animation) {
            const currentTime = $tickTock;
            last = last || currentTime;
            update(currentTime - last);
            last = currentTime;
        } else {
            last = null;
        }
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="boxItem" class:selected bind:this={boxItemElement} hidden={!show}>
    <ObjHeader
        bind:minimize
        {onClose}
        {toggleHide}
        objHidden={!point.visible}
        {color}
        onSelect={(e) => selectObject(uuid, !e.shiftKey)}
    >
        <Nametag bind:title />
        <M size="sm" s={`\\langle p_1, p_2, p_3 \\rangle`} />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['a', 'b', 'c'] as name}
                <span class="box-1"
                    ><M size="sm" s={varNames[name] + ' = '} /></span
                >
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    cleared={(val) => {
                        params[name] = val;
                    }}
                />
            {/each}

            {#if isDynamic}
                <!-- <div class="dynamic-container" transition:slide|global> -->
                {#each ['t0', 't1'] as name}
                    {#if name === 't1'}
                        <span class="box box-3"
                            ><M size="sm" s={'\\leq t \\leq '} /></span
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
                        oncleared={(val) => {
                            params[name] = val;
                        }}
                    />
                {/each}

                <span class="box-1">
                    <span class="t-box">
                        <M s="t =" /><M s={displayTVal} />
                    </span>
                </span>
                <input
                    type="range"
                    bind:value={tau}
                    min="0"
                    max="1"
                    step="0.001"
                    oninput={() => update()}
                    class="box box-2"
                />

                <PlayButtons
                    bind:animation
                    pause={() => (last = null)}
                    rew={() => {
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
                    <M size="sm" s={'\\leq n \\leq '} />
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
