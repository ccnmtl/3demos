<script module>
    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
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
    import Panel from '../Panel.svelte';
    import PathIntegral from '../stories/PathIntegral.svelte';

    const config = {};
    const math = create(all, config);

    let {
        title = $bindable(),
        uuid,
        onRenderObject,
        onDestroyObject,
        selectObject,
        selectPoint,
        animate = () => {},
        animation = $bindable(false),
        params,
        color = $bindable('#FFDD33'),
        scene,
        render = () => {},
        onClose = () => {},
        camera,
        gridStep,
        selected = $bindable(false),
    } = $props();

    title = title || `Curve ${++titleIndex}`;

    params.a0 = params.a0 || '0';
    params.a1 = params.a1 || '1';
    // let animation = $state(false);

    let X = $derived(math.parse(params.x).compile());
    let Y = $derived(math.parse(params.y).compile());
    let Z = $derived(math.parse(params.z).compile());

    let alpha = $state(0);
    let a0 = $derived(math.parse(params.a0).evaluate());
    let a1 = $derived(math.parse(params.a1).evaluate());
    let aVal = $derived(a0 + alpha * (a1 - a0));
    let displayAVal = $derived((Math.round(100 * aVal) / 100).toString());

    let tau = $state(0);
    let A = $derived(math.parse(params.a).evaluate({ a: aVal }));
    let B = $derived(math.parse(params.b).evaluate({ a: aVal }));
    let tVal = $derived(A + tau * (B - A));
    let displayTVal = $derived((Math.round(100 * tVal) / 100).toString());

    let xyz = $derived(
        (t) =>
            new THREE.Vector3(
                X.evaluate({ t, a: aVal }),
                Y.evaluate({ t, a: aVal }),
                Z.evaluate({ t, a: aVal }),
            ),
    );
    $inspect(xyz);

    $effect(() => {
        // console.log('effex in framez');
        updateFrame({ T: tVal });
        render();
    });

    $effect(() => {
        // console.log('effex in effect no xyz');
        updateCurve();
        render();
    });

    let boxItemElement = $state();

    // Only run the update if the params have changed.
    // $: hashTag = checksum(JSON.stringify(params));
    // $: hashTag, updateCurve();

    // Find approximate t for a given point on the curve.
    const findT = (vec) => {
        // const { a, b } = params;

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

        if (vizOptions.TNB) {
            tau += dt / arrows.v.speed / (B - A);
        } else {
            tau += dt / (B - A);
        }
        tau %= 1;
        // const T = A + (B - A) * tau;

        // uncomment this if we want aVal to be animated:
        // if (animation) {
        //     alpha += dt / (a1 - a0);
        //     alpha %= 1;
        //     const t = a0 + alpha * (a1 - a0);
        //
        //     updateCurve()
        // }

        // updateFrame({ T });
    };

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

    // $effect.pre(() => {
    //     // This fixes an artificial case where color was dropped as a prop when the params were re-assigned.
    //     // Would like to drop it.
    //     color = color ? color : '#FFA3BB';
    // });

    // Keep color updated
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

    // This registers the mouse-selectable scene object as belonging to this particular demoObject.
    tube.name = uuid;
    onRenderObject(tube);

    let circleTube = new THREE.Mesh(new THREE.BufferGeometry(), grayMaterial);

    tube.add(circleTube);

    const updateCurve = function () {
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
    };

    let vizOptions = $state({
        frame: false,
        pos: true,
        vel: false,
        acc: false,
        TNB: false,
        osculatingCircle: false,
    });

    $effect(() => {
        frame.visible = vizOptions.frame;
        arrows.r.visible = vizOptions.pos;
        arrows.v.visible = vizOptions.vel;
        arrows.a.visible = vizOptions.acc;

        circleTube.visible = vizOptions.osculatingCircle;
        render();
    });

    let choosingPoint = $state(false);
    const frame = new THREE.Object3D();
    // frame.visible = false;
    tube.add(frame);
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

        const rVec = xyz(T);

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

        if (vizOptions.osculatingCircle) {
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
        }

        if (vizOptions.TNB) {
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
        if (selected) selectPoint(point);
    };

    // Runs the update if math expression "params" has a dependence on 'a'
    let isDynamic = $derived(dependsOn(params, 'a'));
    $inspect(isDynamic);

    // Start animating if animation changes (e.g. animating scene published)
    // Two ifs because one reacts only to animation changing and the other
    // to the $tickTock.
    $effect(() => {
        if (animation) {
            vizOptions.frame = true;
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

    // onMount(() => {
    //     // updateCurve();

    //     if (animation) {
    //         vizOptions.frame = true;
    //         animate();
    //     }
    //     // titleIndex++;
    //     // title = title || `Space Curve ${titleIndex}`;
    // });

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
        render();
    });

    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(tube, render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };

    $effect(() => {
        if (selected) untrack(flash);
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
            tau = (T - A) / (B - A); // Update the UI
            // updateFrame({ T });
            vizOptions.frame = true;
        }
    };

    const toggleHide = function () {
        tube.visible = !tube.visible;
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
                    toggleHide();
                    break;
                case 'Shift':
                    window.addEventListener(
                        'mousemove',
                        placePointAtMouse,
                        false,
                    );
                    break;
                // case 'c':
                //     if (selected) {
                //         setControlTarget(
                //             point.position.x,
                //             point.position.y,
                //             point.position.z,
                //         );
                //     }
                //     render();
                //     break;
                case 'o':
                    vizOptions.osculatingCircle = !vizOptions.osculatingCircle;
                    break;
                case 'x':
                    vizOptions.pos = !vizOptions.pos;
                    break;
                case 'v':
                    vizOptions.vel = !vizOptions.vel;
                    break;
                case 'a':
                    vizOptions.acc = !vizOptions.acc;
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
                    vizOptions.TNB = !vizOptions.TNB;
                    break;
                case 't':
                    vizOptions.frame = !vizOptions.frame;
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
</script>

<div class="boxItem" class:selected bind:this={boxItemElement}>
    <ObjHeader
        bind:minimize
        {toggleHide}
        {onClose}
        {color}
        onSelect={(e) => {
            selectObject(uuid, !e.shiftKey);
        }}
        objHidden={!tube.visible}
    >
        <Nametag bind:title />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['x', 'y', 'z'] as name}
                <span class="box-1"><M size="sm" s="{name}(t) =" /></span>
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    cleared={(val) => {
                        params[name] = val;
                        // updateCurve();
                    }}
                />
            {/each}
            <InputChecker
                className="form-control form-control-sm box box-1"
                value={params.a}
                checker={(val, { b }) => {
                    try {
                        return (
                            math.parse(val).evaluate({ a: aVal }) <=
                            math.parse(b).evaluate({ a: aVal })
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
                    // updateCurve();
                }}
            />
            <span class="box box-3"><M size="sm" s="\leq t \leq" /></span>
            <InputChecker
                className="form-control form-control-sm box box-4"
                value={params.b}
                checker={(val, { a }) => {
                    try {
                        return (
                            math.parse(a).evaluate({ a: aVal }) <=
                            math.parse(val).evaluate({ a: aVal })
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
                    // updateCurve();
                }}
            />

            <span class="box-1">
                <span class="t-box">
                    <M size="sm" s="t = {displayTVal}" /></span
                >
            </span>
            <input
                type="range"
                bind:value={tau}
                min="0"
                max="1"
                step="0.001"
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
                            ><M size="sm" s="\\leq a \\leq " /></span
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
                            // updateCurve();
                        }}
                    />
                {/each}

                <span class="box-1">
                    <span class="t-box">
                        <M size="sm" s="a = {displayAVal}" /></span
                    >
                </span>
                <input
                    type="range"
                    bind:value={alpha}
                    min="0"
                    max="1"
                    step="0.001"
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
                        bind:checked={vizOptions.frame}
                    />
                    <span class="slider round"></span>
                </label>
                {#if vizOptions.frame}
                    <label for="framPos"
                        ><M size={'sm'} s="\\mathbf r" />
                        <input
                            type="checkbox"
                            name="framePos"
                            bind:checked={vizOptions.pos}
                        />
                    </label>
                    <label for="framevel">
                        <M size={'sm'} s={"\\mathbf r'"} />
                        <input
                            type="checkbox"
                            name="framevel"
                            bind:checked={vizOptions.vel}
                        />
                    </label>
                    <label for="frameacc"
                        ><M size="sm" s={"\\mathbf r''"} />
                        <input
                            type="checkbox"
                            name="frameacc"
                            bind:checked={vizOptions.acc}
                        />
                    </label>
                {/if}
            </span>
            {#if vizOptions.frame}
                {#if choosingPoint}
                    <button
                        class="box box-2 btn btn-secondary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = false;
                            window.removeEventListener(
                                'click',
                                placePointAtMouse,
                            );
                        }}
                    >
                        Cancel
                    </button>
                {:else}
                    <button
                        class="box box-2 btn btn-primary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = true;
                            window.addEventListener('click', placePointAtMouse);
                        }}
                    >
                        Select Point
                    </button>
                {/if}
            {/if}

            <span class="box-1">Reparametrize by <M s="s" /></span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="reparamByArcLength"
                    id="reparamByArcLength"
                    bind:checked={vizOptions.TNB}
                    onchange={() => {
                        updateFrame({ T: tVal });
                    }}
                />
                <span class="slider round"></span>
            </label>

            <span class="box-1">Osculating Circle</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="osculatingCircle"
                    id="osculatingCircle"
                    bind:checked={vizOptions.osculatingCircle}
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

    #frameSwitches {
        display: flex;
        justify-content: space-between;
    }
</style>
