<script>
    import {
        onMount,
        onDestroy,
        createEventDispatcher,
        beforeUpdate,
    } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import {
        ArrowBufferGeometry,
        ParametricCurve,
        checksum,
    } from '../utils.js';
    import InputChecker from '../form-components/InputChecker.svelte';

    import { tickTock } from '../stores';
    import PlayButtons from '../form-components/PlayButtons.svelte';

    const config = {};
    const math = create(all, config);

    const dispatch = createEventDispatcher();

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};
    export let onSelect = function() {};
    export let selectedColor;

    // export let paramString;

    export let params = {
        a: '-1',
        b: '1',
        x: 't',
        y: 't^2',
        z: 't^3',
    };

    let xyz;

    $: {
        const [x, y, z] = [params.x, params.y, params.z].map((f) =>
            math.parse(f).compile()
        );
        xyz = (t) =>
            new THREE.Vector3(
                x.evaluate({ t }),
                y.evaluate({ t }),
                z.evaluate({ t })
            );
    }

    // Only run the update if the params have changed.
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateCurve();

    // Check midpoint of parameter space and see if all is ok.
    const chickenParms = (val, { a, b }) => {
        let valuation;
        try {
            const [A, B, V] = math.parse([a, b, val]);
            const t = (A.evaluate() + B.evaluate()) / 2;
            valuation = V.evaluate({ t });
        } catch (error) {
            console.log('ParseError in evaluation.', error);
            return false;
        }
        if (Number.isFinite(valuation)) {
            return true;
        } else {
            console.log('Evaluation error. Incomplete expression, maybe.');
            return false;
        }
    };

    // Meta-parameters
    export let color = '#FFDD33';
    export let tau = 0;

    export let scene;
    export let render = () => {};
    export let onClose = () => {};
    export let controls;
    export let camera;
    export let gridStep;
    export let animation = false;
    export let selected;
    let last;

    const update = (dt = 0) => {
        const { a, b } = params;
        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();

        if (TNB) {
            tau += dt / arrows.v.speed / (B - A);
        } else {
            tau += dt / (B - A);
        }
        tau %= 1;
        const T = A + (B - A) * tau;
        updateFrame({ T });
    };

    let TNB = false;
    let osculatingCircle = false;
    let hidden = false;
    // let stopButton, rewButton;

    const curveMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
    });

    beforeUpdate(() => {
        // This fixes an artificial case where color was dropped as a prop when the params were re-assigned.
        // Would like to drop it.
        color = color ? color : '#FFA3BB';
    });
    // Keep updated
    $: {
        if (selected) {
            curveMaterial.color.set(selectedColor);
        } else {
            curveMaterial.color.set(color);
        }
        render();
    }

    const grayMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.39, 0.34, 0.35),
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
    });

    let tube;
    let circleTube = new THREE.Mesh(new THREE.BufferGeometry(), grayMaterial);

    scene.add(circleTube);
    circleTube.visible = false;

    const updateCurve = function () {
        const { a, b } = params;
        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();

        // if (animation) {
        //     startAnimation(false);
        // }

        let path = new ParametricCurve(1, xyz, A, B);
        let geometry = new THREE.TubeGeometry(
            path,
            1000,
            gridStep / 20,
            8,
            false
        );
        if (tube) {
            tube.geometry.dispose();
            tube.geometry = geometry;
        } else {
            tube = new THREE.Mesh(geometry, curveMaterial);
            scene.add(tube);

            tube.name = uuid;
            onRenderObject(tube);
        }

        updateFrame();
    };

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

    const frame = new THREE.Object3D();
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
        pointMaterial
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
                    2 * Math.PI
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
                    gridStep * 30
                );
            }
            const geometry = new THREE.TubeGeometry(
                path,
                1000,
                gridStep / 20,
                8,
                false
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

    // Start animating if animation changes (e.g. animating scene published)
    // Two ifs because one reacts only to animation changing and the other
    // to the $tickTock.
    $: if (animation) {
        frame.visible = true;
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

    onMount(() => {
        updateCurve();
        if (animation) {
            frame.visible = true;
            dispatch('animate');
        }
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
        render();
    });

    $: texString1 = `${stringifyT(tau)}`;

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const onMouseMove = function (e) {
        // normalized mouse coordinates
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);

        raycaster.setFromCamera(mouseVector, camera);

        const intersects = raycaster.intersectObjects(tube, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            point.position.x = intersect.point.x;
            point.position.y = intersect.point.y;
            point.position.z = intersect.point.z;

            render();
        }
    };

    const onKeyDown = (e) => {
        if (e.target.matches('input')) {
            return;
        }

        switch (e.key) {
            case 'Backspace':
                if (tube.visible) {
                    tube.visible = false;
                    circleTube.visible = false;
                } else {
                    tube.visible = true;
                    circleTube.visible = osculatingCircle;
                }
                render();
                break;
            case 'Shift':
                window.addEventListener('mousemove', onMouseMove, false);
                frame.visible = true;
                break;
            case 'c':
                controls.target.set(
                    point.position.x,
                    point.position.y,
                    point.position.z
                );
                render();
                break;
            case 'o':
                osculatingCircle = !osculatingCircle;
                render();
                break;
            case 'p':
                animation = !animation;
                break;
            case 's':
                TNB = !TNB;
                render();
                break;
            case 't':
                frame.visible = !frame.visible;
                render();
                break;
        }
    };

    const onKeyUp = (e) => {
        if (e.target.matches('input')) {
            return;
        }

        if (e.key === 'Shift') {
            window.removeEventListener('mousemove', onMouseMove);
        }
    };

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
</script>

<div class={'boxItem' + (selected ? ' selected' : '')} on:keydown>
    <ObjHeader bind:hidden {onClose} {color} {onSelect}>
        Space Curve
    </ObjHeader>
    <div {hidden}>
        <div class="threedemos-container container">
            {#each ['x', 'y', 'z'] as name}
                <span class="box-1"><M size="sm">{name}(t) =</M></span>
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    on:cleared={(e) => {
                        params[name] = e.detail;
                        // updateSurface();
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
                        console.log('Parsing error', e);
                        return false;
                    }
                }}
                name="a"
                {params}
                on:cleared={(e) => {
                    params.a = e.detail;
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
                        console.log('Parsing error', e);
                        return false;
                    }
                }}
                name="b"
                {params}
                on:cleared={(e) => {
                    params.b = e.detail;
                }}
            />

            <span class="box-1">
                <span class="t-box">t = {texString1}</span>
            </span>
            <input
                type="range"
                bind:value={tau}
                min="0"
                max="1"
                step="0.001"
                on:input={() => {
                    const { a, b } = params;
                    const A = math.parse(a).evaluate();
                    const B = math.parse(b).evaluate();

                    updateFrame({ T: A + tau * (B - A) });
                }}
                class="box box-2"
            />
            <span class="box-1">Frame</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="frameVisible"
                    id="frameVisible"
                    bind:checked={frame.visible}
                    on:change={render}
                />
                <span class="slider round" />
            </label>

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
            <!-- <span class="play-buttons box-4">
                <button class="btn box-1" on:click={() => startAnimation(true)}>
                    {#if !animation}
                        <i class="fa fa-play" />
                    {:else}
                        <i class="fa fa-pause" />
                    {/if}
                </button>
                <button
                    class="btn box-3"
                    on:click={() => {
                        animation = false;
                        render();
                    }}
                    bind:this={stopButton}
                >
                    <i class="fa fa-stop" />
                </button>
                <button
                    class="btn box-4"
                    on:click={() => {
                        tau = 0;
                        update(0);
                    }}
                    bind:this={rewButton}
                >
                    <i class="fa fa-fast-backward" />
                </button>
            </span> -->

            <span class="box-1">Reparamterize by <M>s</M></span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="reparamByArcLength"
                    id="reparamByArcLength"
                    bind:checked={TNB}
                    on:change={updateFrame}
                />
                <span class="slider round" />
            </label>

            <span class="box-1">Osculating Circle</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="osculatingCircle"
                    id="osculatingCircle"
                    bind:checked={osculatingCircle}
                    on:change={updateFrame}
                />
                <span class="slider round" />
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
