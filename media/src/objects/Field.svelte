<script module>
    let titleIndex = 0;
</script>

<script>
    import { run, createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

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

    const config = {};
    const math = create(all, config);

    const dispatch = createEventDispatcher();






    /**
     * @typedef {Object} Props
     * @property {any} uuid
     * @property {any} [onRenderObject]
     * @property {any} [onDestroyObject]
     * @property {any} [onSelect]
     * @property {any} [params]
     * @property {any} scene
     * @property {any} [render]
     * @property {boolean} [animation]
     * @property {any} [onClose]
     * @property {any} gridMax
     * @property {any} gridStep
     * @property {any} selectedObjects
     * @property {any} selected
     * @property {string} [color]
     * @property {any} title
     * @property {any} meta
     */

    /** @type {Props} */
    let {
        uuid,
        onRenderObject = function () {},
        onDestroyObject = function () {},
        onSelect = function () {},
        params = $bindable({
        p: 'y',
        q: 'z',
        r: '-x',
        nVec: 6,
    }),
        scene,
        render = () => {},
        animation = $bindable(false),
        onClose = () => {},
        gridMax,
        gridStep,
        selectedObjects = $bindable(),
        selected,
        color = $bindable('#373765'),
        title = $bindable(),
        meta
    } = $props();

    let flowTrails = $state(meta.flowTrails === true);
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

    const flowArrows = $state(new THREE.Object3D());
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
    let interpretColor = $state();

    let boxItemElement = $state();
    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(flowArrows.children[0], render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };

    const trailGeometry = new THREE.BufferGeometry();

    const MAX_TRAIL_LENGTH = 250;
    let trailLength = $state(0);

    const trails = $state(new THREE.LineSegments(trailGeometry, trailMaterial));


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

    let fieldF = $state();

    const updateField = function () {
        const { p, q, r } = params;

        const [P, Q, R] = [p, q, r].map((x) => math.parse(x).compile());

        fieldF = (x, y, z, vec) => {
            const args = { x, y, z };
            vec.set(P.evaluate(args), Q.evaluate(args), R.evaluate(args));

            return vec;
        };
    };

    let maxLength = $state(2);
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
        if (animation) dispatch('animate');
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
    let last = $state(null);



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
                        dispatch('animate');
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
    let hashTag = $derived(checksum(JSON.stringify(params)));
    run(() => {
        hashTag, updateField();
    });
    let nCubed = $derived(Math.pow(params.nVec, 3));
    // Keep color fresh
    run(() => {
        // if (selectedObjects.length === 0 || selected) {
        //     fieldMaterial.opacity = 1.0;
        // } else {
        //     fieldMaterial.opacity = 0.3;
        // }
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
    run(() => {
        if (selected && selectedObjects.length > 0) flash();
    });
    let vfScale = $derived(gridStep * 5);
    let arrowArgs = $derived({
        radiusTop: vfScale / 60,
        radiusBottom: vfScale / 150,
        heightTop: vfScale / 16,
        heightIncludesHead: true,
    });
    run(() => {
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
    // Move to afterUpdate?
    run(() => {
        if (animation) {
            dispatch('animate');
        }
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="boxItem" class:selected bind:this={boxItemElement} onkeydown={bubble('keydown')}>
    <ObjHeader
        bind:minimize
        bind:selectedObjects
        {onClose}
        {toggleHide}
        objHidden={!flowArrows.visible}
        {color}
        {onSelect}
    >
        <Nametag bind:title />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['p', 'q', 'r'] as name}
                <span class="box-1"
                    ><M size="sm">{name.toUpperCase()}(x,y,z) =</M></span
                >
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
                on:animate
                on:play={() => (flowArrows.visible = true)}
                on:pause={() => (last = null)}
                on:rew={rewindArrows}
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
