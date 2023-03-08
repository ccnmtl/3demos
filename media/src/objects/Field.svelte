<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    import M from '../M.svelte';
    import ObjHeader from '../ObjHeader.svelte';
    import { ArrowBufferGeometry, rk4, norm1, checksum } from '../utils.js';
    import { tickTock } from '../stores';
    // import ObjectParamInput from '../form-components/ObjectParamInput.svelte';
    import InputChecker from '../form-components/InputChecker.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';

    const config = {};
    const math = create(all, config);

    const dispatch = createEventDispatcher();

    export let uuid;
    export let onRenderObject = function() {};
    export let onDestroyObject = function() {};

    export let params = {
        p: 'y',
        q: 'z',
        r: '-x',
        nVec: 6,
    };

    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateField();

    $: nCubed = Math.pow(params.nVec, 3);

    export let scene;
    export let shadeUp;
    export let render = () => {};
    export let animation = false;
    export let onClose = () => {};
    export let gridMax, gridStep;
    export let selected;
    export let color = '#373765';

    let hidden = false;
    let flowTrails = true;

    class FlowArrowMesh extends THREE.Mesh {
        constructor(geometry, material, lim = 1) {
            super(geometry, material);

            this.start = new THREE.Vector3();
            this.lim = lim;
            this.lastPosition = null;
        }

        initiate(F, dt = 0.01, maxSteps = 500, tol = 1e-3) {
            const vec = new THREE.Vector3();
            const vec1 = new THREE.Vector3();
            vec.copy(this.position);
            for (let i = 0; i < maxSteps; i++) {
                vec1.set(...rk4(vec.x, vec.y, vec.z, F, -dt));
                if (vec.clone().sub(vec1).length() < tol * this.lim) {
                    return this.start.copy(vec1);
                } else {
                    if (norm1(vec1) > this.lim) {
                        return this.start.copy(vec);
                    }
                }
                vec.copy(vec1);
            }
            return this.start.copy(vec1);
        }
    }

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
            console.log('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    const flowArrows = new THREE.Object3D();
    const fieldMaterial = new THREE.MeshLambertMaterial({ color });
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
    });

    const compColor = new THREE.Color();
    let interpretColor;
    // Keep color fresh
    $: {
        fieldMaterial.color.set(color);
        const hsl = {};
        fieldMaterial.color.getHSL(hsl);
        compColor.setHSL((hsl.h + 0.618033988749895) % 1, hsl.s, hsl.l);
        interpretColor = (t) =>
            new THREE.Color().setHSL(
                (hsl.h + t * 0.618033988749895) % 1,
                hsl.s,
                hsl.l
            );
        render();
    }

    const trailGeometry = new THREE.BufferGeometry();

    const MAX_TRAIL_LENGTH = 250;
    let trailLength = 0;

    const trails = new THREE.LineSegments(trailGeometry, trailMaterial);
    const arrowGeometries = [],
        heightResolution = 150,
        vfScale = gridStep * 5;
    const arrowArgs = {
        radiusTop: vfScale / 30,
        radiusBottom: vfScale / 100,
        heightTop: vfScale / 8,
    };

    const setTrailColors = function (
        colorArray,
        start,
        total = MAX_TRAIL_LENGTH
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

    // Make a fixed set of different arrow lengths instead of regenerating each time.
    for (let i = 1; i <= heightResolution; i++) {
        const geometry = new ArrowBufferGeometry({
            radiusBottom: vfScale / 100,
            height: ((i / heightResolution) * vfScale) / 2,
            heightTop: Math.min(
                ((i / heightResolution) * vfScale) / 3,
                vfScale / 8
            ),
            radiusTop: Math.min(
                vfScale / 30,
                ((i / heightResolution) * vfScale) / 6
            ),
        });
        arrowGeometries.push(geometry);
    }

    const initFlowArrows = function (arrows, lim = gridMax, N = params.nVec) {
        const vec = new THREE.Vector3();
        let maxLength = 0;
        const arrowDefaultGeometry = new ArrowBufferGeometry({
            ...arrowArgs,
            height: gridStep / gridMax,
        });

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                for (let k = 0; k < N; k++) {
                    const arrow = new FlowArrowMesh(
                        arrowDefaultGeometry,
                        fieldMaterial,
                        1.2 * lim
                    );
                    arrow.scale.set(gridMax, gridMax, gridMax);
                    arrow.position.set(
                        (((i + 1 / 2) * 2) / N - 1) * lim +
                            0.01 * Math.random(),
                        (((j + 1 / 2) * 2) / N - 1) * lim +
                            0.01 * Math.random(),
                        (((k + 1 / 2) * 2) / N - 1) * lim + 0.01 * Math.random()
                    );
                    arrow.initiate(fieldF);
                    // const posr = new THREE.Vector3();

                    fieldF(
                        arrow.position.x,
                        arrow.position.y,
                        arrow.position.z,
                        vec
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
            new THREE.Float32BufferAttribute(trailPoints, 3)
        );

        const trailColors = new Float32Array(MAX_TRAIL_LENGTH * 2 * 3 * nCubed);
        setTrailColors(trailColors, 0);
        trails.geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(trailColors, 3)
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
                MAX_TRAIL_LENGTH
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
                                Math.random() * 0.01
                            )
                        )
                );
            } else {
                arrow.position.copy(pos1);
            }

            let height = F(
                arrow.position.x,
                arrow.position.y,
                arrow.position.z,
                vec
            ).length();
            height = Math.round((height / maxLength) * heightResolution) - 1;

            arrow.geometry =
                arrowGeometries[
                    Math.max(0, Math.min(arrowGeometries.length - 1, height))
                ];

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

    let fieldF;

    const updateField = function () {
        const { p, q, r } = params;

        const [P, Q, R] = [p, q, r].map((x) => math.parse(x).compile());

        fieldF = (x, y, z, vec) => {
            const args = { x, y, z };
            vec.set(P.evaluate(args), Q.evaluate(args), R.evaluate(args));

            return vec;
        };
    };

    let maxLength = 2;
    flowArrows.name = uuid;
    onRenderObject(flowArrows);
    scene.add(flowArrows);
    scene.add(trails);

    onMount(() => {
        updateField();
        initFlowArrows(flowArrows);
        updateFlowArrows(flowArrows, fieldF, 0);
        render();
    });
    onDestroy(() => {
        onDestroyObject(flowArrows);
        freeChildren(flowArrows);
        freeChildren(trails);
        scene.remove(flowArrows);
        scene.remove(trails);
        trails.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([], 3)
        );

        freeTrails();
        window.removeEventListener('keydown', shiftDown, false);
        render();
    });

    // Set update function for animation
    const update = (dt) => updateFlowArrows(flowArrows, fieldF, dt);

    // animation loop
    let last = null;
    $: if (animation) {
        const currentTime = $tickTock;
        last = last || currentTime;
        update(currentTime - last);
        last = currentTime;
    }

    const shiftDown = (e) => {
        if (shadeUp) {
            switch (e.key) {
                case 'Backspace':
                    flowArrows.visible = !flowArrows.visible;
                    render();
                    break;
                case 't':
                    trails.visible = !trails.visible;
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
            }
        }
    };

    window.addEventListener('keydown', shiftDown, false);
</script>

<div class={'boxItem' + (selected ? ' selected' : '')} on:click on:keydown>
    <div class="box-title">
        <strong>Vector Field</strong>
        <ObjHeader bind:hidden bind:onClose />
    </div>
    <div {hidden}>
        <div class="threedemos-container container">
            {#each ['p', 'q', 'r'] as name}
                <span class="box-1"
                    ><M size="sm">{name.toUpperCase()}(t) =</M></span
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
                on:input={() => {
                    freeChildren(flowArrows);
                    maxLength = initFlowArrows(
                        flowArrows,
                        gridMax,
                        params.nVec
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
                    on:change={freeTrails}
                />
                <span class="slider round" />
            </label>

            <PlayButtons
                bind:animation
                on:animate
                on:play={() => (flowArrows.visible = true)}
                on:pause={() => (last = null)}
                on:stop={() => {
                    flowArrows.visible = false;
                    freeTrails();
                    freeChildren(flowArrows);
                    maxLength = initFlowArrows(
                        flowArrows,
                        gridMax,
                        params.nVec
                    );
                    render();
                }}
                on:rew={() => {
                    freeChildren(flowArrows);
                    maxLength = initFlowArrows(
                        flowArrows,
                        gridMax,
                        params.nVec
                    );
                    updateFlowArrows(flowArrows, fieldF, 0);
                    freeTrails();
                    render();
                }}
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
