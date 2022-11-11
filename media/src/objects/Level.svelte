<script>
    import { onDestroy } from "svelte";
    import M from "../M.svelte";

    import * as THREE from "three";

    import { create, all } from "mathjs";

    const config = {};
    const math = create(all, config);

    import {updateParams} from './levelWorker.js';

    import {
        marchingCubes,
        ArrowBufferGeometry
    } from "../utils.js";

    // const config = {};
    // const math = create(all, config);

    export let params = {
        g: "x^2 - y^2 + z^2",
        k: "1",
        a: "-2",
        b: "2",
        c: "-2",
        d: "2",
        e: "-2",
        f: "2",
    };

    let oldParams = params;

    $: {
        if (
            oldParams.g !== params.g
                || oldParams.k !== params.k
                || oldParams.a !== params.a
                || oldParams.b !== params.b
                || oldParams.a !== params.a
                || oldParams.c !== params.c
                || oldParams.d !== params.d
                || oldParams.e !== params.e
                || oldParams.f !== params.f
        ) {
            updateLevel();
            oldParams.g = params.g;
            oldParams.k = params.k;
            oldParams.a = params.a;
            oldParams.b = params.b;
            oldParams.c = params.c;
            oldParams.d = params.d;
            oldParams.e = params.e;
            oldParams.f = params.f;
        }
    }

    export let scene;
    export let shadeUp;
    export let render = () => {};
    export let onClose = () => {};
    export let onUpdate = () => {};

    export let camera,
    controls,
    // animation = false,
    gridStep;
    // showLevelCurves = false;

    let hidden = false,
        loading = false;

    const geometry = new THREE.BufferGeometry();
    const xTraceGeometry = new THREE.BufferGeometry();
    const yTraceGeometry = new THREE.BufferGeometry();
    const zTraceGeometry = new THREE.BufferGeometry();

    const minusMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3232,
        shininess: 80,
        side: THREE.BackSide,
        vertexColors: false,
        transparent: true,
        opacity: 0.7,
    });
    const plusMaterial = new THREE.MeshPhongMaterial({
        color: 0x3232ff,
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: false,
        transparent: true,
        opacity: 0.7,
    });

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
    });

    const mesh = new THREE.Object3D();
    mesh.add(new THREE.Mesh(geometry, plusMaterial));
    mesh.add(new THREE.Mesh(geometry, minusMaterial));
    mesh.visible = false;
    scene.add(mesh);

    const updateLevel = function() {
        loading = true;
        updateParams(params).then((data) => {
            levelWorkerSuccessHandler(data);
        });
    }

    updateLevel();

    const levelWorkerSuccessHandler = (data) => {
        const { normals, vertices, xpts, ypts, zpts } = data;
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        geometry.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute(normals, 3)
        );

        mesh.visible = true;

        {
            xTraceGeometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(xpts, 3)
            );

            const trace = new THREE.LineSegments(xTraceGeometry, whiteLineMaterial);

            trace.rotation.y = Math.PI / 2;
            trace.rotation.z = Math.PI / 2;

            mesh.add(trace);
        }
        {
            yTraceGeometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(ypts, 3)
            );

            const trace = new THREE.LineSegments(yTraceGeometry, whiteLineMaterial);

            trace.rotation.x = -Math.PI / 2;
            trace.rotation.z = -Math.PI / 2;

            mesh.add(trace);
        }
        {
            zTraceGeometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(zpts, 3)
            );

            const trace = new THREE.LineSegments(zTraceGeometry, whiteLineMaterial);

            mesh.add(trace);
        }

        point.position.set(0, 0, 0);

        tangentVectors({ point });

        loading = false;
        render();
    };

    onDestroy(() => {
        geometry.dispose();
        plusMaterial.dispose();
        minusMaterial.dispose();
        scene.remove(mesh);
        scene.remove(tanFrame);
        render();
    });

    // Select a point
    const tanFrame = new THREE.Object3D();
    const arrows = {
        u: new THREE.Mesh(),
        v: new THREE.Mesh(),
        n: new THREE.Mesh(),
    };
    const ruColors = { u: 0x992525, v: 0x252599, n: 0xb6b6b6 };
    for (let key of Object.keys(arrows)) {
        arrows[key].material = new THREE.MeshBasicMaterial({
            color: ruColors[key],
        });
        tanFrame.add(arrows[key]);
    }

    const pointMaterial = new THREE.MeshLambertMaterial({ color: 0xffff33 });
    const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 / 8, 16, 16),
        pointMaterial
    );

    tanFrame.add(point);

    const shardMaterial = new THREE.MeshPhongMaterial({
        color: 0x4b4b4b,
        shininess: 80,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
    });
    const planeShard = new THREE.Mesh(new THREE.BufferGeometry(), shardMaterial);
    tanFrame.add(planeShard);

    tanFrame.visible = false;

    scene.add(tanFrame);

    const nFrame = function({
        f = (x, y, z) => math.evaluate(params.g, { x, y, z }),
        point = point,
        eps = 1e-4,
    } = {}) {
        const [u, v, w] = [point.position.x, point.position.y, point.position.z];

        let h;

        h = Math.max(u * eps, (2 * eps) ** 2);
        const fx = (f(u + h / 2, v, w) - f(u - h / 2, v, w)) / h;
        h = Math.max(v * eps, (2 * eps) ** 2);
        const fy = (f(u, v + h / 2, w) - f(u, v - h / 2, w)) / h;
        h = Math.max(w * eps, (2 * eps) ** 2);
        const fz = (f(u, v, w + h / 2) - f(u, v, w - h / 2)) / h;

        return { p: point.position, n: new THREE.Vector3(fx, fy, fz) };
    }

    // Construct tangent vectors at a point u,v (both 0 to 1)
    const tangentVectors = function({ point, eps = 1e-4, plane = true } = {}) {
        const { p, n } = nFrame({
            point,
            eps,
        });

        // point.position.copy(dr.p);

        const arrowParams = {
            radiusTop: gridStep / 10,
            radiusBottom: gridStep / 20,
            heightTop: gridStep / 7,
        };

        const arrow = arrows.n;
        const pos = p.clone();
        arrow.position.copy(pos);
        if (arrow.geometry) arrow.geometry.dispose();
        arrow.geometry = new ArrowBufferGeometry({
            ...arrowParams,
            height: n.length() / 8,
        });
        arrow.lookAt(pos.add(n));

        planeShard.geometry.dispose();

        if (plane) {
            const { a, b, c, d, e, f } = params;

            const tangentPlaneGeometry = marchingCubes({
                f: (x, y, z) => {
                    const xVec = new THREE.Vector3(x, y, z);
                    return xVec.dot(n);
                },
                level: n.dot(p) + 1e-8, // offset to avoid overlap artifacts
                xMin: math.evaluate(String(a)),
                xMax: math.evaluate(String(b)),
                yMin: math.evaluate(String(c)),
                yMax: math.evaluate(String(d)),
                zMin: math.evaluate(String(e)),
                zMax: math.evaluate(String(f)),
                N: 2,
            });

            planeShard.geometry = tangentPlaneGeometry;
        }
    }

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const onMouseMove = function(e) {
        // normalized mouse coordinates
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);

        raycaster.setFromCamera(mouseVector, camera);

        const intersects = raycaster.intersectObjects(
            [mesh.children[0], mesh.children[1]],
            true
        );

        if (intersects.length > 0) {
            const intersect = intersects[0];
            point.position.x = intersect.point.x;
            point.position.y = intersect.point.y;
            point.position.z = intersect.point.z;

            tangentVectors({ point });

            render();
        }
    }

    const shiftDown = (e) => {
        if (shadeUp) {
            switch (e.key) {
                case "Shift":
                    // animation = true;
                    // frameBall.visible = true;
                    // onMouseMove();
                    window.addEventListener("mousemove", onMouseMove, false);
                    break;
                case "c":
                    controls.target.set(
                        point.position.x,
                        point.position.y,
                        point.position.z
                    );
                    render();
                    break;
                case "t":
                    tanFrame.visible = !tanFrame.visible;
                    render();
                    break;
                case "y":
                    planeShard.visible = !planeShard.visible;
                    render();
                    break;
                case "n":
                    arrows.n.visible = !arrows.n.visible;
                    render();
                    break;
            }
        }
    };

    const shiftUp = (e) => {
        if (e.key === "Shift") {
            // animation = false;
            // frameBall.visible = false;
            window.removeEventListener("mousemove", onMouseMove);
        }
    };

    window.addEventListener("keydown", shiftDown, false);
    window.addEventListener("keyup", shiftUp, false);
</script>

<div class="boxItem">
    <div class="box-title">
        <span>
            <strong>Level surface </strong>
            <span class:hidden={!loading}
                  ><i class="fa fa-spinner fa-pulse fa-fw" />
                <span class="sr-only">Loading...</span>
            </span>
        </span>
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
            <span class="box-1"><M>g(x,y,z) =</M></span>
            <input
                type="text"
                bind:value={params.g}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box box-2"
                />
            <span class="box-1"><M>k =</M></span>
            <input
                type="number"
                bind:value={params.k}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box box-2"
                />

            <input
                type="number"
                bind:value={params.a}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />
            <span class="box box-3"><M>\leq x \leq</M></span>
            <input
                type="number"
                bind:value={params.b}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />
            <input
                type="number"
                bind:value={params.c}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />
            <span class="box box-3"><M>\leq y \leq</M></span>
            <input
                type="number"
                bind:value={params.d}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />
            <input
                type="number"
                bind:value={params.e}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />
            <span class="box box-3"><M>\leq z \leq</M></span>
            <input
                type="number"
                bind:value={params.f}
                on:change={() => {
            onUpdate();
            updateLevel();
            }}
                class="box"
                />

            <span class="box-1">tangents</span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    value="false"
                    name="frameVisible"
                    id="frameVisible"
                    bind:checked={tanFrame.visible}
                    on:change={render}
                    />
                <span class="slider round" />
            </label>
        </div>
    </div>
</div>

<style>
    .container {
        display: grid;

        grid-template-columns: 130px auto 130px;
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
