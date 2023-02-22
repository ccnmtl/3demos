<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import * as THREE from "three";
    import { create, all } from "mathjs";

    import M from "../M.svelte";
    import ObjHeader from "../ObjHeader.svelte";
    import {
        ArrowBufferGeometry,
        ParametricCurve,
    } from "../utils.js";
    import ObjectParamInput from '../form-components/ObjectParamInput.svelte';

    const config = {};
    const math = create(all, config);

    const dispatch = createEventDispatcher();

    // export let paramString;

    export let params = {
        a: "-1",
        b: "1",
        x: "t",
        y: "t^2",
        z: "t^3",
        tau: 0,
        color: "#FFDD33",
    };

    let paramErrors = {
        a: false,
        b: false,
        x: false,
        y: false,
        z: false
    };

    if (!params.color) {
        params.color = "#FFDD33";
    }

    let oldParams = Object.assign({}, params);

    // This pattern mimicks the componentDidUpdate/prevState stuff
    // that's used in React. The goal here is to only call the
    // expensive render methods when absolutely necessary.
    //
    // This allows for WebSocket listeners to see updated objects
    // in their scene when new params come through.
    //
    // This is a more intricate alternative to the simple way of
    // doing things, which would be:
    // $: params && updateCurve();
    // $: params && updateColor();
    //
    // The problem with listening for all `params` updates like this
    // is that the `params` object is updated way too often,
    // because of the nature of the input bindings in this component.
    //
    // This scheme is really dependent on how the Svelte/Three.js
    // component is organized, and it's not always necessary,
    // for example, see the Box component for a simpler pattern that
    // works in that scenario.
    //
    // It may be possible to refactor this into a more general function,
    // which would be nice.
    $: {
        if (oldParams.color !== params.color) {
            updateColor();
            oldParams.color = params.color;
        }

        if (
            oldParams.a !== params.a ||
            oldParams.b !== params.b ||
            oldParams.a !== params.a ||
            oldParams.x !== params.x ||
            oldParams.y !== params.y
        ) {
            updateCurve();
            oldParams.a = params.a;
            oldParams.b = params.b;
            oldParams.x = params.x;
            oldParams.y = params.y;
            oldParams.z = params.z;
        }
    }

    export let scene;
    export let shadeUp;
    export let render = () => {};
    export let onClose = () => {};
    export let onUpdate = () => {};
    export let controls;
    export let camera;
    export let gridStep;
    export let animation = false;
    export let selected;
    export const update = (dt) => {
        const { a, b, x, y, z } = goodParams;
        const T = a + (b - a) * params.tau;
        if (TNB) {
            const vel = new THREE.Vector3(
                (x.evaluate({ t: T + 0.01 / 2 }) - x.evaluate({ t: T - 0.01 / 2 })) /
                    0.01,
                (y.evaluate({ t: T + 0.01 / 2 }) - y.evaluate({ t: T - 0.01 / 2 })) /
                    0.01,
                (z.evaluate({ t: T + 0.01 / 2 }) - z.evaluate({ t: T - 0.01 / 2 })) /
                    0.01
            );
            params.tau += dt / vel.length() / (b - a);
        } else {
            try {
                params.tau +=
                    dt /
                    (math.parse(params.b).evaluate() - math.parse(params.a).evaluate());
            } catch (e) {
                console.error("update parse error", e);
            }
        }
        params.tau %= 1;
        updateFrame();
    };

    /**
     * Eval x, y, and z mathjs objects on the given t value.
     *
     * Catch mathjs errors as necessary.
     *
     * Returns a three.js Vector.
     */
    const evalXYZ = function(x, y, z, t) {
        let evalX = 0;
        let evalY = 0;
        let evalZ = 0;

        try {
            evalX = x.evaluate({ t: t });
            paramErrors.x = false;
        } catch (e) {
            paramErrors.x = true;
        }

        try {
            evalY = y.evaluate({ t: t });
            paramErrors.y = false;
        } catch (e) {
            paramErrors.y = true;
        }

        try {
            evalZ = z.evaluate({ t: t });
            paramErrors.z = false;
        } catch (e) {
            paramErrors.z = true;
        }

        return new THREE.Vector3(evalX, evalY, evalZ);
    };

    let TNB = false;
    let osculatingCircle = false;
    let hidden = false;
    let stopButton, rewButton;
    const goodParams = {};

    const curveMaterial = new THREE.MeshPhongMaterial({
        color: params.color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
    });

    const grayMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.39, 0.34, 0.35),
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
    });

    let tube,
        circleTube = new THREE.Mesh(new THREE.BufferGeometry(), grayMaterial);

    scene.add(circleTube);
    circleTube.visible = false;

    const updateCurve = function () {
        const { a, b, x, y, z } = params;
        let A, B, X, Y, Z;

        try {
            A = math.parse(a).evaluate();
            paramErrors.a = false;
        } catch (e) {
            paramErrors.a = true;
            return;
        }

        try {
            B = math.parse(b).evaluate();
            paramErrors.b = false;
        } catch (e) {
            paramErrors.b = true;
            return;
        }

        try {
            [X, Y, Z] = math.parse([x, y, z]);
            goodParams["a"] = A;
            goodParams["b"] = B;
            goodParams["x"] = X.compile();
            goodParams["y"] = Y.compile();
            goodParams["z"] = Z.compile();
        } catch (e) {
            animation = false;
            return;
        }

        if (animation) {
            startAnimation(false);
        }

        const r = (t) => {
            return evalXYZ(X, Y, Z, t);
        }

        let path = new ParametricCurve(1, r, A, B);
        let geometry = new THREE.TubeGeometry(path, 1000, gridStep / 20, 8, false);
        if (tube) {
            tube.geometry.dispose();
            tube.geometry = geometry;
        } else {
            tube = new THREE.Mesh(geometry, curveMaterial);
            scene.add(tube);
        }

        updateFrame();
    };

    const stringifyT = function (params) {
        const { a, b, tau } = params;
        try {
            const [A, B] = [a, b].map((x) => math.parse(x).evaluate());

            const t = A + (B - A) * tau;

            return (Math.round(100 * t) / 100).toString();
        } catch (e) {
            console.error(e);
        return "";
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

    const updateFrame = function ({ dt = 0.01 } = {}) {
        const { a, b, x, y, z } = goodParams;
        const tau = params.tau;
        const T = a + (b - a) * tau;
        let curvature = 0;

        const rVec = evalXYZ(x, y, z, T);
        if (Object.values(paramErrors).some((x) => x === true)) {
            // There's a param error. Don't finish updating the frame,
            // just return. The appropriate input will be set to
            // invalid state.
            return;
        }

        const dr = {
            r: rVec,
            v: new THREE.Vector3(
                (x.evaluate({ t: T + dt / 2 }) - x.evaluate({ t: T - dt / 2 })) / dt,
                (y.evaluate({ t: T + dt / 2 }) - y.evaluate({ t: T - dt / 2 })) / dt,
                (z.evaluate({ t: T + dt / 2 }) - z.evaluate({ t: T - dt / 2 })) / dt
            ),
            a: new THREE.Vector3(
                (x.evaluate({ t: T + dt }) -
                    2 * x.evaluate({ t: T }) +
                    x.evaluate({ t: T - dt })) /
                    (dt * dt),
                (y.evaluate({ t: T + dt }) -
                    2 * y.evaluate({ t: T }) +
                    y.evaluate({ t: T - dt })) /
                    (dt * dt),
                (z.evaluate({ t: T + dt }) -
                    2 * z.evaluate({ t: T }) +
                    z.evaluate({ t: T - dt })) /
                    (dt * dt)
            ),
        };

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

            circleTube.geometry.dispose();
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

            if (key === "r") {
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
            if (key === "n") {
                arrow.visible = false;
            }
        }
        render();
    };

    const updateColor = function () {
        curveMaterial.color.set(params.color);
        render();
    };

    const startAnimation = (toggleState=false) => {
        frame.visible = true;
        if (toggleState) {
            animation = !animation;
        }
        if (animation) {
            dispatch('animate');
        }
    };

    onMount(updateCurve);
    onDestroy(() => {
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

        window.removeEventListener('keydown', shiftDown);
        window.removeEventListener('keyup', shiftUp);
        render();
    });

    $: texString1 = `t = ${stringifyT(params)}`;

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const onMouseMove = function (e) {
        // normalized mouse coordinates
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);

        raycaster.setFromCamera(mouseVector, camera);

        const intersects = raycaster.intersectObjects(
            tube,
            true
        );

        if (intersects.length > 0) {
            const intersect = intersects[0];
            point.position.x = intersect.point.x;
            point.position.y = intersect.point.y;
            point.position.z = intersect.point.z;

            render();
        }
    };

    const shiftDown = (e) => {
        if (shadeUp) {
            switch (e.key) {
                case 'Backspace':
                    if(tube.visible) {
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
                    startAnimation(true);
                    break;
                case 'r':
                    TNB = !TNB;
                    render();
                    break;
                case 't':
                    frame.visible = !frame.visible;
                    render();
                    break;
            }
        }
    };

    const shiftUp = (e) => {
        if (e.key === 'Shift') {
            window.removeEventListener('mousemove', onMouseMove);
        }
    };

    window.addEventListener('keydown', shiftDown, false);
    window.addEventListener('keyup', shiftUp, false);
</script>

<div class={'boxItem' + (selected ? ' selected': '')} on:click on:keydown>
    <div class="box-title">
        <span>
            <strong style="color: {params.color};">
                <i class="fa fa-square" />
            </strong>
            <strong>Space Curve</strong>
        </span>
        <ObjHeader bind:hidden bind:onClose />
    </div>
    <div {hidden}>
        <div class="container">
            <span class="box-1"><M size="sm">x(t) =</M></span>
            <ObjectParamInput
                error={paramErrors.x}
                initialValue={params.x}
                onChange={(newVal) => {
                    params.x = newVal;
                    onUpdate();
                    updateCurve();
                }} />
            <span class="box-1"><M size="sm">y(t) =</M></span>
            <ObjectParamInput
                error={paramErrors.y}
                initialValue={params.y}
                onChange={(newVal) => {
                    params.y = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1"><M size="sm">z(t) =</M></span>
            <ObjectParamInput
                error={paramErrors.z}
                initialValue={params.z}
                onChange={(newVal) => {
                    params.z = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <ObjectParamInput
                className="form-control form-control-sm box"
                error={paramErrors.a}
                initialValue={params.a}
                onChange={(newVal) => {
                    params.a = newVal;
                    onUpdate();
                    updateCurve();
                }} />
            <span class="box box-3"><M size="sm">\leq t \leq</M></span>
            <ObjectParamInput
                className="form-control form-control-sm box"
                error={paramErrors.b}
                initialValue={params.b}
                onChange={(newVal) => {
                    params.b = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1">
                <M size="sm">{texString1}</M>
            </span>
            <input
                type="range"
                bind:value={params.tau}
                min="0"
                max="1"
                step="0.001"
                on:input={updateFrame}
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
            <span class="play-buttons box-4">
                <button class="btn box-1"
                    on:click={() => startAnimation(true)}>
                    {#if !animation}
                        <i class="fa fa-play" />
                    {:else}
                        <i class="fa fa-pause" />
                    {/if}
                </button>
                <button class="btn box-3"
                    on:click={() => {
                        animation = false;
                        render();
                    }}
                    bind:this={stopButton}
                >
                    <i class="fa fa-stop" />
                </button>
                <button class="btn box-4"
                    on:click={() => {
                        params.tau = 0;
                        updateFrame();
                    }}
                    bind:this={rewButton}
                >
                    <i class="fa fa-fast-backward" />
                </button>
            </span>

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
                bind:value={params.color}
                on:change={() => {
                    onUpdate();
                    updateColor();
                }}
                style="width:85%; padding: 1px 1px;"
            />
        </span>
        </div>
    </div>
</div>
