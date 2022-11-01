<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import katex from 'katex';
    import M from "./M.svelte";

    import * as THREE from "three";

    import { create, all } from "mathjs";

    import {
        ArrowBufferGeometry,
        ParametricCurve,
    } from "./utils.js";

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

    if (!params.color) {
        params.color = "#FFDD33";
    }

    export let scene;
    export let render = () => {};
    export let onClose = () => {};
    export let gridStep;
    // export let gridMax;
    // export let color;

    export let animation = false;
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
                console.log("update parse error", e);
            }
        }
        params.tau %= 1;
        updateFrame();
    };

    let TNB = false,
        osculatingCircle = false;

    let hidden = false;
    let stopButton, rewButton;
    const goodParams = {};

    // console.log("curve color", color);

    const curveMaterial = new THREE.MeshPhongMaterial({
        color: params.color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        // opacity: 0.7,
    });

    const grayMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(.39, .34, .35),
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        // opacity: 0.7,
    });

    let tube,
        circleTube = new THREE.Mesh(new THREE.BufferGeometry(), grayMaterial);

    scene.add(circleTube);
    circleTube.visible = false;


    const updateCurve = function() {
        animation = false;
        const { a, b, x, y, z } = params;
        let A, B, X, Y, Z;
        try {
            A = math.parse(a).evaluate();
            B = math.parse(b).evaluate();
            [X, Y, Z] = math.parse([x, y, z]);
            goodParams["a"] = A;
            goodParams["b"] = B;
            goodParams["x"] = X.compile();
            goodParams["y"] = Y.compile();
            goodParams["z"] = Z.compile();
        } catch (e) {
            console.log("Parse error", e);
            animation = false;
            return;
        }

        const r = (t) =>
              new THREE.Vector3(
                  X.evaluate({ t: t }),
                  Y.evaluate({ t: t }),
                  Z.evaluate({ t: t })
              );
        // console.log(a.evaluate(), r(0.5));

        let path = new ParametricCurve(1, r, A, B);
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
            // colorBufferVertices( tube, (x,y,z) => blueUpRedDown(1));
        }

        updateFrame();
    }

    const stringifyT = function(params) {
        const { a, b, tau } = params;
        try {
            const [A, B] = [a, b].map((x) => math.parse(x).evaluate());

            const t = A + (B - A) * tau;

            return (Math.round(100 * t) / 100).toString();
        } catch (e) {
            console.log(e);
            return '';
        }
    }

    const frame = new THREE.Object3D();
    frame.visible = false;
    scene.add(frame);
    const arrows = {
        r: new THREE.Mesh(),
        v: new THREE.Mesh(),
        a: new THREE.Mesh(),
        // n: new THREE.Mesh(), // later
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

    const updateFrame = function({ dt = 0.01 } = {}) {
        const { a, b, x, y, z } = goodParams;
        const tau = params.tau;
        const T = a + (b - a) * tau;
        let curvature = 0;

        const dr = {
            r: new THREE.Vector3(
                x.evaluate({ t: T }),
                y.evaluate({ t: T }),
                z.evaluate({ t: T })
            ),
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
                // R.addScaledVector(A, 1 / curvature);
                path = new ParametricCurve(1, (t) => {
                    const vec = R.clone().addScaledVector(A,(1 - Math.cos(t)) / curvature).addScaledVector(V, Math.sin(t) / curvature);
                    return vec;
                }, 0, 2*Math.PI);
            } else {
                V.normalize();
                path = new ParametricCurve(1, (t) => {
                    const vec = R.clone().addScaledVector(V, t);
                    return vec;
                }, -gridStep*30, gridStep*30);
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

        // tangentVectors({ u: data.currentUPosition });
        // // if (document.querySelector("input[type=checkbox]#curl").checked) {drawCurl();}

        // // updateShards(data.shards);
        // if (!frameRequested) render();
        render();
    }

    const updateColor = function() {
        curveMaterial.color.set(params.color);
        render();
    }

    // Exercises
    //

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
        scene.remove(frame);
        render();
    });

    const texString1 = `t = ${stringifyT(params)}`;
</script>

<div class="boxItem">
    <div class="box-title">
        <strong style="color: {params.color};"
                ><i class="fa fa-square" /> Space Curve</strong
                                                           >
        <span
            ><button
                 on:click={() => {
                hidden = !hidden;
                }}><i class="fa fa-window-minimize" /></button
                                                          ><button on:click={onClose}>
                <i class="fa fa-window-close" /></button
                                                    ></span
                                                         >
    </div>
    <div class:hidden>
        <div class="container">
            <span class="box-1"><M>x(t) =</M></span>
            <input
                type="text"
                bind:value={params.x}
                on:change={updateCurve}
                class="box box-2"
                />
            <span class="box-1"><M>y(t) =</M></span>
            <input
                type="text"
                bind:value={params.y}
                on:change={updateCurve}
                class="box box-2"
                />
            <span class="box-1"><M>z(t) =</M></span>
            <input
                type="text"
                bind:value={params.z}
                on:change={updateCurve}
                class="box box-2"
                />

            <input
                type="text"
                bind:value={params.a}
                on:change={updateCurve}
                class="box"
                />
            <span class="box box-3"><M>\leq t \leq</M></span>
            <input
                type="text"
                bind:value={params.b}
                on:change={updateCurve}
                class="box"
                />

            <span class="box-1">
                {@html katex.renderToString(texString1)}
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

            <span class="box-1">frame</span>
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
            <!-- </div> -->

        <span class="play-buttons box-4">
            <button
                on:click={() => {
                frame.visible = true;
                animation = !animation;
                if (animation) dispatch("animate");
                }}
                class="box-1"
                >
                {#if !animation}
                    <i class="fa fa-play" />
                {:else}
                    <i class="fa fa-pause" />
                {/if}
            </button>
            <button
                on:click={() => {
                animation = false;
                render();
                }}
                class="box-3"
                bind:this={stopButton}
                >
                <i class="fa fa-stop" />
            </button>
            <button
                on:click={() => {
                console.log("rew clicked");
                // animation = false;
                // flowArrows.visible = false;
                // freeTrails();
                params.tau = 0;
                updateFrame();
                }}
                class="box-4"
                bind:this={rewButton}
                >
                <i class="fa fa-fast-backward" />
            </button>
        </span>

        <span class="box-1">reparamterize by <M>s</M></span>
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

        <span class="box-1">osculating circle</span>
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
        <span class="box-1">color</span>
        <span class="box box-2">
            <input
                type="color"
                name="colorPicker"
                id="colorPicker"
                bind:value={params.color}
                on:change={updateColor}
                style="width:85%; padding: 1px 1px;"
                />
        </span>
    </div>
</div>
</div>

<style>
    .container {
        display: grid;

        grid-template-columns: 1fr auto 1fr;
        grid-template-rows: auto;

        grid-gap: 10px 15px;

        padding: 10px;
    }

    .box-1 {
        text-align: right;
        grid-column: 1 / 2;
        color: white;
        vertical-align: middle;
    }

    .box-2 {
        grid-column-start: 2;
        grid-column-end: 4;
    }

    .box-3 {
        color: white;
        vertical-align: middle;
        text-align: center;

        grid-column: 2 / 3;
    }

    .box-4 {
        color: white;
        vertical-align: middle;
        text-align: center;

        grid-column: 3 / 4;
    }

    .box-title {
        display: flex;
        justify-content: space-between;
        color: whitesmoke;
        padding: 0.5em;
    }

    button {
        background-color: transparent;
        color: whitesmoke;
        border: none;
    }

    button:hover {
        color: white;
    }

    button:active {
        color: gray;
    }

    .play-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1em;
        place-items: center;
    }

    /* The switch - the box around the slider */
    .switch {
        position: relative;
        display: inline-block;
        width: 2em;
        height: 1.2em;
        text-align: right;
    }

    /* Hide default HTML checkbox */
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    /* The slider */
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 1em;
        width: 1em;
        left: 0.1em;
        bottom: 0.1em;
        background-color: white;
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    input:checked + .slider {
        background-color: #2196f3;
    }

    input:focus + .slider {
        box-shadow: 0 0 1px #2196f3;
    }

    input:checked + .slider:before {
        -webkit-transform: translateX(1em);
        -ms-transform: translateX(1em);
        transform: translateX(1em);
    }

    /* Rounded sliders */
    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
