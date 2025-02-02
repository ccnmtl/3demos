<script module>
    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import Nametag from './Nametag.svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    import { dependsOn } from './Vector.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import {
        ArrowBufferGeometry,
        ParametricCurve,
        checksum,
    } from '../utils.js';
    import { flashDance } from '../sceneUtils';
    import InputChecker from '../form-components/InputChecker.svelte';

    import { tickTock } from '../stores';
    import PlayButtons from '../form-components/PlayButtons.svelte';

    const config = {};
    const math = create(all, config);

    let {
        title,
        uuid,
        onRenderObject,
        onDestroyObject,
        onSelect,
        animate = () => {},
        animation = $bindable(false),
        params,
        color = '#FFDD33',
        tau = 0,
        alpha = 0,
        scene,
        render = () => {},
        onClose = () => {},
        controls,
        camera,
        gridStep,
        selectedObjects,
        selected,
    } = $props();

    // let animation = $state(false);

    let xyz = (
        t, // evaluate with t and a (the constant parameter)
    ) =>
        new THREE.Vector3(
            math.parse(params.x).compile().evaluate({ t, a: aVal }),
            math.parse(params.y).compile().evaluate({ t, a: aVal }),
            math.parse(params.z).compile().evaluate({ t, a: aVal }),
        );

    let boxItemElement = $state();

    let aVal = 0;
    let displayAVal = $state('0');

    // Only run the update if the params have changed.
    // $: hashTag = checksum(JSON.stringify(params));
    // $: hashTag, updateCurve();

    // Find approximate t for a given point on the curve.
    const findT = (vec) => {
        const { a, b } = params;
        const [A, B] = [a, b].map((x) => math.parse(x).evaluate());

        let closestT = undefined;
        let closestDist = Infinity;

        // Find an approximate t with linear search first
        for (let tau = 0; tau <= 1; tau += 0.01) {
            const t = A + (B - A) * tau;
            const dist = xyz(t).distanceTo(vec);
            if (dist < closestDist) {
                closestDist = dist;
                closestT = t;
            }
        }

        // Now refine with binary search
        const eps = 0.0001;
        let t = closestT;
        // let dist = closestDist;
        let step = 0.005 * (B - A); // The 0.005 here is chosen to be half of the 0.01 above.
        while (step > eps) {
            const t1 = t - step;
            const t2 = t + step;
            const dist1 = xyz(t1).distanceTo(vec);
            const dist2 = xyz(t2).distanceTo(vec);
            if (dist1 < dist2) {
                t = t1;
                // dist = dist1;
            } else {
                t = t2;
                // dist = dist2;
            }
            step /= 2;
        }

        return t;
    };

    // Check midpoint of parameter space and see if all is ok.
    // Also check if constant's bounds are ok.
    const chickenParms = (val, { a, b, a0, a1 }) => {
        let valuation;
        try {
            const [A, B, A0, A1, V] = math.parse([a, b, a0, a1, val]);
            const t = (A.evaluate() + B.evaluate()) / 2;
            valuation = V.evaluate({
                t,
                a: A0.evaluate() / 2 + A1.evaluate() / 2,
            });
        } catch (error) {
            console.error('ParseError in evaluation.', error);
            return false;
        }
        if (Number.isFinite(valuation)) {
            return true;
        } else {
            console.error('Evaluation error. Incomplete expression, maybe.');
            return false;
        }
    };

    // Meta-parameters

    let last;

    const update = (dt = 0) => {
        const { a, b } = params;
        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();

        const a0 = math.parse(params.a0).evaluate();
        const a1 = math.parse(params.a1).evaluate();

        displayAVal = (
            Math.round(100 * (a0 + alpha * (a1 - a0))) / 100
        ).toString();

        if (TNB) {
            tau += dt / arrows.v.speed / (B - A);
        } else {
            tau += dt / (B - A);
        }
        tau %= 1;
        const T = A + (B - A) * tau;

        // uncomment this if we want aVal to be animated:
        // if (animation) {
        //     alpha += dt / (a1 - a0);
        //     alpha %= 1;
        //     const t = a0 + alpha * (a1 - a0);
        //
        //     updateCurve()
        // }

        updateFrame({ T });
    };

    let TNB = $state(false);
    let osculatingCircle = $state(false);
    let minimize = $state(false);
    // let stopButton, rewButton;

    const curveMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: true,
        opacity: 0.5,
    });

    $effect.pre(() => {
        // This fixes an artificial case where color was dropped as a prop when the params were re-assigned.
        // Would like to drop it.
        color = color ? color : '#FFA3BB';
    });

    // Keep updated
    $effect(() => {
        curveMaterial.color.set(color);
        render();
    });

    const grayMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.39, 0.34, 0.35),
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
    });

    let tube = new THREE.Mesh(new THREE.BufferGeometry(), curveMaterial);
    scene.add(tube);

    tube.name = uuid;
    onRenderObject(tube);

    let circleTube = new THREE.Mesh(new THREE.BufferGeometry(), grayMaterial);

    scene.add(circleTube);
    circleTube.visible = false;

    const updateCurve = function () {
        const { a0, a1 } = params;

        aVal = a0
            ? math.evaluate(a0) +
              alpha * (math.evaluate(a1) - math.evaluate(a0))
            : 0;

        const { a, b } = params;
        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();

        // if (animation) {
        //     startAnimation(false);
        // }

        const path = new ParametricCurve(1, xyz, A, B);
        const geometry = new THREE.TubeGeometry(
            path,
            1000,
            gridStep / 20,
            8,
            false,
        );
        tube.geometry.dispose();
        tube.geometry = geometry;
        // if (tube) {
        // } else {
        //     tube = new THREE.Mesh(geometry, curveMaterial);
        //     scene.add(tube);

        //     tube.name = uuid;
        //     onRenderObject(tube);
        // }

        updateFrame();
    };

    $effect(() => {
        // console.log('effex in effect', xyz(1).z);
        console.log('effex in effect no xyz');
        updateCurve();
    });

    const stringifyT = function (tau) {
        const { a, b } = params;
        try {
            const [A, B] = [a, b].map((x) => math.parse(x).evaluate());

            const t = A + (B - A) * tau;

            return (Math.round(100 * t) / 100).toString();
        } catch (e) {
            console.error(e);
            return '';
        }
    };

    let choosingPoint = $state(false);
    const frame = $state(new THREE.Object3D());
    frame.visible = false;
    scene.add(frame);
    const arrows = {
        r: new THREE.Mesh(),
        v: new THREE.Mesh(),
        a: new THREE.Mesh(),
    };

    const arrowParams = {
        radiusTop: gridStep / 8,
        radiusBottom: gridStep / 16,
        heightTop: gridStep / 7,
    };
    const ruColors = { r: 0x992525, v: 0x252599, a: 0xb6b6b6, n: 0x121212 };
    for (let key of Object.keys(arrows)) {
        arrows[key].material = new THREE.MeshBasicMaterial({
            color: ruColors[key],
        });
        frame.add(arrows[key]);
    }

    const pointMaterial = new THREE.MeshLambertMaterial({ color: 0xffff33 });
    const point = new THREE.Mesh(
        new THREE.SphereGeometry(gridStep / 8, 16, 16),
        pointMaterial,
    );

    frame.add(point);

    const updateFrame = function ({ T = 0, dt = 0.01 } = {}) {
        // const { a, b } = params;
        // const [A, B] = [a, b].map((x) => math.parse(x).evaluate());

        // const T = A + (B - A) * tau;

        let curvature = 0;

        const rVec = xyz(T, alpha);

        const dr = {
            r: rVec,
            v: xyz(T + dt / 2)
                .sub(xyz(T - dt / 2))
                .divideScalar(dt),
            a: xyz(T + dt)
                .sub(rVec.clone().multiplyScalar(2))
                .add(xyz(T - dt))
                .divideScalar(dt * dt),
        };

        // Store speed for reparametrization
        arrows.v.speed = dr.v.length();

        if (osculatingCircle) {
            const R = dr.r.clone(),
                V = dr.v.clone(),
                A = dr.a.clone();
            const Av = A.clone().cross(V).length();
            let path;
            if (Av > 0) {
                curvature = Av / (V.length() * V.length() * V.length());
                V.normalize();
                A.addScaledVector(V, A.dot(V) * -1);
                A.normalize();
                path = new ParametricCurve(
                    1,
                    (t) => {
                        const vec = R.clone()
                            .addScaledVector(A, (1 - Math.cos(t)) / curvature)
                            .addScaledVector(V, Math.sin(t) / curvature);
                        return vec;
                    },
                    0,
                    2 * Math.PI,
                );
            } else {
                V.normalize();
                path = new ParametricCurve(
                    1,
                    (t) => {
                        const vec = R.clone().addScaledVector(V, t);
                        return vec;
                    },
                    -gridStep * 30,
                    gridStep * 30,
                );
            }
            const geometry = new THREE.TubeGeometry(
                path,
                1000,
                gridStep / 20,
                8,
                false,
            );

            circleTube.geometry?.dispose();
            circleTube.geometry = geometry;

            circleTube.visible = true;
        } else {
            circleTube.visible = false;
        }

        if (TNB) {
            const A = dr.a.clone();
            dr.v.normalize();
            if (A.cross(dr.v).length() > gridStep / 100) {
                dr.a.addScaledVector(dr.v, dr.v.dot(dr.a) * -1).normalize();
            } else {
                dr.a = new THREE.Vector3(0, 0, 0);
            }
        }

        point.position.copy(dr.r);

        for (const [key, arrow] of Object.entries(arrows)) {
            const pos = dr.r.clone();
            if (arrow.geometry) arrow.geometry.dispose();

            if (key === 'r') {
                arrow.position.set(0, 0, 0);
                arrow.geometry = new ArrowBufferGeometry({
                    ...arrowParams,
                    height: pos.length(),
                });
                arrow.lookAt(pos);
                arrow.visible = true;
            } else {
                arrow.position.copy(pos);
                arrow.geometry = new ArrowBufferGeometry({
                    ...arrowParams,
                    height: dr[key].length(),
                });
                arrow.lookAt(pos.add(dr[key]));
            }
            if (key === 'n') {
                arrow.visible = false;
            }
        }
        render();
    };

    // Runs the update if math expression "params" has a dependence on 'a'
    let isDynamic = $derived(dependsOn(params, 'a'));
    $inspect(isDynamic);

    let X = $derived(math.parse(params.x).compile());
    $inspect(X);
    let A = $derived(math.parse(params.a).compile());
    $inspect(A);

    // Start animating if animation changes (e.g. animating scene published)
    // Two ifs because one reacts only to animation changing and the other
    // to the $tickTock.
    $effect(() => {
        if (animation) {
            frame.visible = true;
            animate();
        }
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

    onMount(() => {
        params.a0 = params.a0 || '0';
        params.a1 = params.a1 || '1';

        updateCurve();

        if (animation) {
            frame.visible = true;
            animate();
        }
        titleIndex++;
        title = title || `Space Curve ${titleIndex}`;
    });

    onDestroy(() => {
        onDestroyObject(tube);

        if (tube) {
            tube.geometry && tube.geometry.dispose();
            tube.material && tube.material.dispose();
        }
        scene.remove(tube);

        if (frame) {
            frame.children.forEach((x) => {
                x.geometry && x.geometry.dispose();
                x.material && x.material.dispose();
            });
        }

        scene.remove(circleTube);
        scene.remove(frame);

        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('click', onMouseClick);
        render();
    });

    let texString1 = $derived(stringifyT(tau));

    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(tube, render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };

    $effect(() => {
        if (selected && selectedObjects.length > 0) flash();
    });

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const placePointAtMouse = function (e) {
        // normalized mouse coordinates
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);

        raycaster.setFromCamera(mouseVector, camera);

        const intersects = raycaster.intersectObjects([tube], true);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const T = findT(intersect.point);
            tau =
                (T - math.parse(params.a).evaluate()) /
                (math.parse(params.b).evaluate() -
                    math.parse(params.a).evaluate()); // Update the UI
            updateFrame({ T });
            frame.visible = true;
            render();
        }
    };

    const onMouseClick = function (e) {
        if (choosingPoint) {
            placePointAtMouse(e);
            choosingPoint = false;
        }
    };

    const toggleHide = function () {
        if (tube.visible) {
            tube.visible = false;
            circleTube.visible = false;
        } else {
            tube.visible = true;
            circleTube.visible = osculatingCircle;
        }
        render();
    };

    // register shortcuts in settings/Kbd.svelte
    const onKeyDown = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }
        if (selected) {
            switch (e.key) {
                case 'Backspace':
                    if (selectedObjects[0] === uuid) {
                        toggleHide();
                    }
                    break;
                case 'Shift':
                    window.addEventListener(
                        'mousemove',
                        placePointAtMouse,
                        false,
                    );
                    break;
                case 'c':
                    if (selectedObjects[selectedObjects.length - 1] === uuid) {
                        controls.target.set(
                            point.position.x,
                            point.position.y,
                            point.position.z,
                        );
                    }
                    render();
                    break;
                case 'o':
                    osculatingCircle = !osculatingCircle;
                    render();
                    break;
                case 'p':
                    animation = !animation;
                    break;
                case 'r':
                    tau = 0;
                    animation = false;
                    update();
                    break;
                case 's':
                    TNB = !TNB;
                    render();
                    break;
                case 't':
                    if (uuid === selectedObjects[selectedObjects.length - 1]) {
                        frame.visible = !frame.visible;
                    }
                    render();
                    break;
            }
        }
    };

    const onKeyUp = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }

        if (e.key === 'Shift') {
            window.removeEventListener('mousemove', placePointAtMouse);
        }
    };

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('click', onMouseClick);
</script>

<div class="boxItem" class:selected bind:this={boxItemElement}>
    <ObjHeader
        bind:minimize
        bind:selectedObjects
        {toggleHide}
        {onClose}
        {color}
        {onSelect}
        objHidden={!tube.visible}
    >
        <Nametag bind:title />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['x', 'y', 'z'] as name}
                <span class="box-1"><M size="sm">{name}(t) =</M></span>
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    cleared={(val) => {
                        params[name] = val;
                        updateCurve();
                    }}
                />
            {/each}
            <InputChecker
                className="form-control form-control-sm box box-1"
                value={params.a}
                checker={(val, { b }) => {
                    try {
                        return (
                            math.parse(val).evaluate() <=
                            math.parse(b).evaluate()
                        );
                    } catch (e) {
                        console.error('Parsing error', e);
                        return false;
                    }
                }}
                name="a"
                {params}
                cleared={(val) => {
                    params.a = val;
                    updateCurve();
                }}
            />
            <span class="box box-3"><M size="sm">\leq t \leq</M></span>
            <InputChecker
                className="form-control form-control-sm box box-4"
                value={params.b}
                checker={(val, { a }) => {
                    try {
                        return (
                            math.parse(a).evaluate() <=
                            math.parse(val).evaluate()
                        );
                    } catch (e) {
                        console.error('Parsing error', e);
                        return false;
                    }
                }}
                name="b"
                {params}
                cleared={(val) => {
                    params.b = val;
                    updateCurve();
                }}
            />

            <span class="box-1">
                <span class="t-box"> <M size="sm">t =</M> {texString1}</span>
            </span>
            <input
                type="range"
                bind:value={tau}
                min="0"
                max="1"
                step="0.001"
                oninput={() => {
                    const { a, b } = params;
                    const A = math.parse(a).evaluate();
                    const B = math.parse(b).evaluate();

                    updateFrame({ T: A + tau * (B - A) });
                }}
                class="box box-2"
            />
            <PlayButtons
                bind:animation
                {animate}
                pause={() => (last = null)}
                rew={() => {
                    tau = 0;
                    animation = false;
                    update();
                }}
            />

            {#if isDynamic}
                {#each ['a0', 'a1'] as name}
                    {#if name === 'a1'}
                        <span class="box box-3"
                            ><M size="sm">{'\\leq a \\leq '}</M></span
                        >
                    {/if}
                    <InputChecker
                        className="form-control form-control-sm {name === 'a0'
                            ? 'box-1'
                            : 'box-4'}"
                        checker={(val) =>
                            Number.isFinite(math.parse(val).evaluate())}
                        value={params[name]}
                        {name}
                        cleared={(val) => {
                            params[name] = val;
                            updateCurve();
                        }}
                    />
                {/each}

                <span class="box-1">
                    <span class="t-box">
                        <M size="sm">a =</M> {displayAVal}</span
                    >
                </span>
                <input
                    type="range"
                    bind:value={alpha}
                    min="0"
                    max="1"
                    step="0.001"
                    oninput={() => {
                        const a0 = math.evaluate(params.a0);
                        const a1 = math.evaluate(params.a1);

                        const aVal = a0 + alpha * (a1 - a0);
                        displayAVal = (Math.round(100 * aVal) / 100).toString();

                        updateCurve();

                        render();
                    }}
                    class="box box-2"
                />
                <!--                <PlayButtons-->
                <!--                    bind:animation-->
                <!--                    on:animate-->
                <!--                    on:pause={() => (last = null)}-->
                <!--                    on:rew={() => {-->
                <!--                        alpha = 0;-->
                <!--                    }}-->
                <!--                />-->
            {/if}

            <span class="box-1">Frame</span>
            <span class="box box-2" id="frameSwitches">
                <label class="switch" for="frameVisible">
                    <input
                        type="checkbox"
                        name="frameVisible"
                        id="frameVisible"
                        checked={frame.visible}
                        onchange={(val) => {
                            frame.visible = !frame.visible;
                            render();
                        }}
                    />
                    <span class="slider round"></span>
                </label>
                {#if TNB}
                    <label for="framPos"
                        >pos
                        <input type="checkbox" name="framePos" /></label
                    >
                {/if}
            </span>
            {#if frame.visible}
                {#if choosingPoint}
                    <button
                        class="box box-2 btn btn-secondary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = false;
                        }}
                        >Cancel
                    </button>
                {:else}
                    <button
                        class="box box-2 btn btn-primary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = true;
                        }}
                        >Select point
                    </button>
                {/if}
            {/if}

            <span class="box-1">Reparamterize by <M>s</M></span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="reparamByArcLength"
                    id="reparamByArcLength"
                    bind:checked={TNB}
                    onchange={updateFrame}
                />
                <span class="slider round"></span>
            </label>

            <span class="box-1">Osculating Circle</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="osculatingCircle"
                    id="osculatingCircle"
                    bind:checked={osculatingCircle}
                    onchange={updateFrame}
                />
                <span class="slider round"></span>
            </label>
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
    .t-box {
        display: inline-block;
        width: 40%;
        text-align: left;
    }
</style>
