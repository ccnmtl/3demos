<script module>
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

    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
    import * as THREE from 'three';
    import { tickTock } from '../stores';

    import PlayButtons from '../form-components/PlayButtons.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import Nametag from './Nametag.svelte';
    import { ArrowBufferGeometry, checksum } from '../utils.js';
    import { flashDance } from '../sceneUtils';
    import InputChecker from '../form-components/InputChecker.svelte';

    let {
        uuid,
        onRenderObject,
        onDestroyObject,
        selectObject,
        animate,
        title = $bindable(),
        params = $bindable({
            a: '-1',
            b: '1',
            c: '2',
            x: '0',
            y: '0',
            z: '0',
            n0: 0,
            n1: 1,
        }),
        color = $bindable('#ff0000'),
        animation = $bindable(false),
        selected,
        show = true,
        scene,
        render,
        onClose,
        gridStep,
    } = $props();

    let minimize = $state(false);

    let tau = $state(0);
    let t0 = $derived(math.parse(params.t0 ?? '0').evaluate());
    let t1 = $derived(math.parse(params.t1 ?? '1').evaluate());
    let tVal = $derived(t0 + tau * (t1 - t0));
    let displayTVal = $derived(tVal.toFixed(2));

    let last = null;

    let N0 = $derived(math.parse(params.n0?.toString() ?? '0').evaluate());
    let N1 = $derived(math.parse(params.n1?.toString() ?? '0').evaluate());

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
        arrowMaterial,
    );

    arrows.add(arrow);
    scene.add(arrows);

    const updateVector = function () {
        while (arrows.children.length < N1 - N0 + 1) {
            arrows.add(
                new THREE.Mesh(
                    new ArrowBufferGeometry({
                        ...arrowArgs,
                        height: 1,
                    }),
                    arrowMaterial,
                ),
            );
        }
        while (arrows.children.length > N1 - N0 + 1) {
            const arrow = arrows.children[arrows.children.length - 1];
            arrow.geometry.dispose();
            arrows.remove(arrow);
        }

        const { a, b, c, x, y, z } = params;
        for (let index = N0; index <= N1; index++) {
            const arrow = arrows.children[index - N0];
            const [A, B, C, X, Y, Z] = math
                .parse([a, b, c, x, y, z])
                .map((s) => s.evaluate({ t: tVal, n: index }));

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
    let isDynamic = $derived(dependsOn(params, 't'));
    let isDiscrete = $derived(dependsOn(params, 'n'));

    $effect(updateVector);

    // recolor on demand
    $effect(() => {
        arrowMaterial.color.set(color);
        render();
    });

    let boxItemElement;
    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(arrow, render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };
    $effect(() => {
        if (selected) untrack(flash);
    });
    onMount(() => {
        titleIndex++;
        title = title || `Vector ${titleIndex}`;
        if (animation) animate();
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

    const toggleHide = function () {
        arrows.visible = !arrows.visible;
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
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    const update = (dt = 0) => {
        const { t0, t1 } = params;
        const A = math.parse(t0).evaluate();
        const B = math.parse(t1).evaluate();

        tau += dt / (B - A);
        tau %= 1;

        updateVector(tVal);
    };

    // Start animating if animation changes (e.g. animating scene published)
    $effect(() => {
        if (animation) untrack(animate);
    });

    $effect(() => {
        if (animation) {
            animate();
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
<div
    class="boxItem"
    class:selected
    bind:this={boxItemElement}
    hidden={!show}
    onkeydown={onKeyDown}
>
    <ObjHeader
        bind:minimize
        {onClose}
        {toggleHide}
        objHidden={!arrows.visible}
        {color}
        onSelect={(e) => selectObject(uuid, !e.shiftKey)}
    >
        <Nametag bind:title />
        <M size="sm" s={'\\langle v_1, v_2, v_3 \\rangle'} />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['a', 'b', 'c', 'x', 'y', 'z'] as name}
                {#if name === 'x'}
                    <span class="box-1">
                        Plot at position <M size="sm" s="(p_1, p_2, p_3)" />:
                    </span>
                {/if}
                <span class="box-1"
                    ><M size="sm" s="{varNames[name]} = " /></span
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
                        cleared={(val) => {
                            params[name] = val;
                        }}
                    />
                {/each}

                <span class="box-1">
                    <span class="t-box"><M s="t =" /><M s={displayTVal} /></span
                    >
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
                    {animate}
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
                <span class="box box-3"
                    ><M size="sm" s={'\\leq n \\leq '} /></span
                >
                <input
                    class="form-control form-control-sm box-4"
                    type="number"
                    bind:value={params.n1}
                    min={params.n0}
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
    input.form-control {
        color: black;
    }
</style>
