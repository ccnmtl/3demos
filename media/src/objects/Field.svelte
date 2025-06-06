<script module>
    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
    import * as THREE from 'three';
    import { create, all, e, xgcd } from 'mathjs';

    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import Nametag from './Nametag.svelte';
    import { ArrowBufferGeometry, rk4, norm1, checksum } from '../utils.js';
    import { flashDance } from '../sceneUtils';
    import { tickTock } from '../stores';
    // import ObjectParamInput from '../form-components/ObjectParamInput.svelte';
    import InputChecker from '../form-components/InputChecker.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import FlowArrowMesh from './FlowArrowMesh';
    import { mathToJSFunction } from './mathutils';

    const config = {};
    const math = create(all, config);

    let {
        uuid,
        onRenderObject,
        onDestroyObject,
        params = $bindable({
            p: 'y',
            q: 'z',
            r: '-x',
            nVec: 6,
        }),
        scene,
        render,
        animation = $bindable(false),
        animate,
        onClose,
        gridMax,
        gridStep,
        selectObject,
        selected,
        color = $bindable('#373765'),
        title = $bindable(),
        meta = {
            flowTrails: true,
        },
    } = $props();

    $effect(() => updateField());

    let nCubed = $derived(Math.pow(params.nVec, 3));

    let flowTrails = $state(meta.flowTrails && true);
    // console.log(meta, flowTrails);
    let minimize = $state(false);

    /**
     *  "Check parameters"
     * */
    const chickenParms = (val) => {
        let valuation;
        try {
            const x = ((2 * Math.random() - 1) * gridMax * 3) / 2;
            const y = ((2 * Math.random() - 1) * gridMax * 3) / 2;
            const z = ((2 * Math.random() - 1) * gridMax * 3) / 2;
            const parsedVal = math.parse(val);

            valuation = Number.isFinite(parsedVal.evaluate({ x, y, z }));
        } catch (e) {
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    const flowArrows = new THREE.Object3D();
    const fieldMaterial = new THREE.MeshLambertMaterial({
        color,
        transparent: false,
        // opacity: 0.5,
    });
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
    });

    const compColor = new THREE.Color();
    let interpretColor;

    // Keep color fresh
    $effect(() => {
        fieldMaterial.color.set(color);
        const hsl = {};
        fieldMaterial.color.getHSL(hsl);
        compColor.setHSL((hsl.h + 0.618033988749895) % 1, hsl.s, hsl.l);
        interpretColor = (t) =>
            new THREE.Color().setHSL(
                (hsl.h + t * 0.618033988749895) % 1,
                hsl.s,
                hsl.l,
            );

        if (flowTrails && !animation && trails.geometry.attributes.color) {
            setTrailColors(
                trails.geometry.attributes.color.array,
                trailLength * nCubed * 6,
                MAX_TRAIL_LENGTH,
            );
            trails.geometry.attributes.color.needsUpdate = true;
        }
        render();
    });

    let boxItemElement;
    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(flowArrows.children[0], render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };
    $effect(() => {
        if (selected) untrack(flash);
    });

    const trailGeometry = new THREE.BufferGeometry();

    const MAX_TRAIL_LENGTH = 250;
    let trailLength = 0;

    const trails = new THREE.LineSegments(trailGeometry, trailMaterial);

    let vfScale = $derived(gridStep * 5);
    let arrowArgs = $derived({
        radiusTop: vfScale / 60,
        radiusBottom: vfScale / 150,
        heightTop: vfScale / 16,
        heightIncludesHead: true,
    });

    const setTrailColors = function (
        colorArray,
        start,
        total = MAX_TRAIL_LENGTH,
    ) {
        let index = 0,
            i = 0;

        while (index < colorArray.length) {
            for (let j = 0; j < nCubed; j++) {
                let { r, g, b } = interpretColor(1 - i / total);
                colorArray[(start + index++) % colorArray.length] = r; // red
                colorArray[(start + index++) % colorArray.length] = g; // green
                colorArray[(start + index++) % colorArray.length] = b; // blue

                const rgb = interpretColor(1 - (i + 1) / total);
                colorArray[(start + index++) % colorArray.length] = rgb.r; // red
                colorArray[(start + index++) % colorArray.length] = rgb.g; // green
                colorArray[(start + index++) % colorArray.length] = rgb.b; // blue
            }
            i += 1;
        }
    };

    const initFlowArrows = function (arrows, lim = gridMax, N = params.nVec) {
        const vec = new THREE.Vector3();
        let maxLength = 0;

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                for (let k = 0; k < N; k++) {
                    const arrow = new FlowArrowMesh(
                        new ArrowBufferGeometry({
                            ...arrowArgs,
                            height: gridStep / gridMax,
                        }),
                        fieldMaterial,
                        1.2 * lim,
                    );
                    // arrow.scale.set(gridMax, gridMax, gridMax);
                    arrow.position.set(
                        (((i + 1 / 2) * 2) / N - 1) * lim +
                            0.01 * Math.random(),
                        (((j + 1 / 2) * 2) / N - 1) * lim +
                            0.01 * Math.random(),
                        (((k + 1 / 2) * 2) / N - 1) * lim +
                            0.01 * Math.random(),
                    );
                    arrow.initiate(fieldF);
                    // const posr = new THREE.Vector3();

                    fieldF(
                        arrow.position.x,
                        arrow.position.y,
                        arrow.position.z,
                        vec,
                    );
                    const len = vec.length();
                    maxLength = Math.max(maxLength, len);

                    vec.add(arrow.position);
                    arrow.lookAt(vec);
                    arrows.add(arrow);
                }
            }
        }

        trailLength = 0;
        const trailPoints = new Float32Array(MAX_TRAIL_LENGTH * 2 * 3 * nCubed);
        trails.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(trailPoints, 3),
        );

        const trailColors = new Float32Array(MAX_TRAIL_LENGTH * 2 * 3 * nCubed);
        setTrailColors(trailColors, 0);
        trails.geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(trailColors, 3),
        );

        trails.geometry.setDrawRange(0, trailLength);

        return maxLength; //
    };

    const updateFlowArrows = function (arrows, F, dt = 0.016) {
        const vec = new THREE.Vector3();
        let index;

        const trailPoints = trails.geometry.attributes.position.array;

        if (flowTrails) {
            index = (trailLength % MAX_TRAIL_LENGTH) * 2 * 3 * nCubed;
            setTrailColors(
                trails.geometry.attributes.color.array,
                trailLength * nCubed * 6,
                MAX_TRAIL_LENGTH,
            );
            trails.geometry.attributes.color.needsUpdate = true;
            trailLength++;
        }

        arrows.children.forEach((arrow) => {
            const { x, y, z } = arrow.position;

            const pos1 = new THREE.Vector3();
            pos1.set(...rk4(x, y, z, F, dt));

            if (flowTrails) {
                trailPoints[index++] = arrow.position.x;
                trailPoints[index++] = arrow.position.y;
                trailPoints[index++] = arrow.position.z;

                trailPoints[index++] = pos1.x;
                trailPoints[index++] = pos1.y;
                trailPoints[index++] = pos1.z;
            }

            if (
                norm1(pos1) > arrow.lim ||
                (dt > 1e-6 && pos1.clone().sub(arrow.position).length() < 1e-3)
            ) {
                arrow.position.copy(
                    arrow.start
                        .clone()
                        .add(
                            new THREE.Vector3(
                                Math.random() * 0.01,
                                Math.random() * 0.01,
                                Math.random() * 0.01,
                            ),
                        ),
                );
            } else {
                arrow.position.copy(pos1);
            }

            let height = F(
                arrow.position.x,
                arrow.position.y,
                arrow.position.z,
                vec,
            ).length();
            height = ((height / maxLength) * vfScale) / 2;

            arrow.geometry.adjustHeight(height);

            arrow.lookAt(vec.add(arrow.position));
        });

        trails.geometry.setDrawRange(0, trailLength * 2 * nCubed);
        trails.geometry.attributes.position.needsUpdate = true;
    };

    const freeChildren = function (objectHolder) {
        for (let i = objectHolder.children.length - 1; i >= 0; i--) {
            const element = objectHolder.children[i];
            if (element.geometry.dispose) element.geometry.dispose();
            objectHolder.remove(element);
        }
    };

    const freeTrails = function () {
        trailLength = 0;
    };

    const rewindArrows = () => {
        freeChildren(flowArrows);
        maxLength = initFlowArrows(flowArrows, gridMax, params.nVec);
        updateFlowArrows(flowArrows, fieldF, 0);
        freeTrails();
        render();
    };

    let fieldF = $derived.by(() => {
        const { p, q, r } = params;

        const [P, Q, R] = [p, q, r].map((x) =>
            mathToJSFunction(x, ['x', 'y', 'z']),
        );

        return (x, y, z, vec) => {
            vec.set(P(x, y, z), Q(x, y, z), R(x, y, z));
            return vec;
        };
    });

    const updateField = function () {};

    let maxLength = 2;
    flowArrows.name = uuid;
    onRenderObject(flowArrows);
    scene.add(flowArrows);
    scene.add(trails);

    onMount(() => {
        titleIndex++;
        title = title || `Vector Field ${titleIndex}`;

        updateField();
        maxLength = initFlowArrows(flowArrows, gridMax, params.nVec);
        updateFlowArrows(flowArrows, fieldF, 0);
        render();
        if (animation) animate();
    });
    onDestroy(() => {
        onDestroyObject(flowArrows);
        freeChildren(flowArrows);
        freeChildren(trails);
        scene.remove(flowArrows);
        scene.remove(trails);
        trails.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([], 3),
        );

        freeTrails();
        window.removeEventListener('keydown', onKeyDown, false);
        render();
    });

    // Set update function for animation
    const update = (dt) => updateFlowArrows(flowArrows, fieldF, dt);

    // animation loop
    let last = null;

    $effect(() => {
        if (animation) {
            const currentTime = $tickTock;
            last = last || currentTime;
            if (!trails.geometry.attributes.position) {
                maxLength = initFlowArrows(flowArrows, gridMax, params.nVec);
            }
            update(currentTime - last);
            last = currentTime;
        }
    });

    $effect(() => {
        if (animation) {
            untrack(animate);
        }
    });

    const toggleHide = function () {
        flowArrows.visible = !flowArrows.visible;
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
                case 't':
                    flowTrails = !flowTrails;
                    freeTrails();
                    render();
                    break;
                case 'p':
                    flowArrows.visible = true;
                    animation = !animation;
                    if (animation) {
                        animate();
                    }
                    render();
                    break;
                case 'r':
                    rewindArrows();
                    break;
            }
        }
    };

    window.addEventListener('keydown', onKeyDown, false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="boxItem" class:selected bind:this={boxItemElement}>
    <ObjHeader
        bind:minimize
        {onClose}
        {toggleHide}
        objHidden={!flowArrows.visible}
        {color}
        onSelect={(e) => selectObject(uuid, !e.shiftKey)}
    >
        <Nametag bind:title />
    </ObjHeader>

    {#snippet vfComponent(nm)}
        <span class="box-1"
            ><M size="sm" s="{nm.toUpperCase()}(x,y,z) =" /></span
        >
        <InputChecker
            value={params[nm]}
            checker={chickenParms}
            name={nm}
            {params}
            cleared={(val) => {
                params[nm] = val;
            }}
        />
    {/snippet}

    <div hidden={minimize}>
        <div class="threedemos-container container">
            {@render vfComponent('p')}
            {@render vfComponent('q')}
            {@render vfComponent('r')}

            <span class="box-1">Resolution</span>
            <input
                type="range"
                bind:value={params.nVec}
                min="1"
                max="10"
                step="1"
                class="box box-2"
                oninput={() => {
                    freeChildren(flowArrows);
                    maxLength = initFlowArrows(
                        flowArrows,
                        gridMax,
                        params.nVec,
                    );
                    updateFlowArrows(flowArrows, fieldF, 0);
                    freeTrails();
                    render();
                }}
            />
            <span class="box-1">Trails</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="trailsVisible"
                    id="trailsVisible"
                    bind:checked={flowTrails}
                    onchange={freeTrails}
                />
                <span class="slider round"></span>
            </label>

            <PlayButtons
                bind:animation
                {animate}
                play={() => (flowArrows.visible = true)}
                pause={() => (last = null)}
                rew={rewindArrows}
            />

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
