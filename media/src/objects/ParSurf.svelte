<script>
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';
    // import { beforeUpdate } from 'svelte';

    import M from '../M.svelte';
    import ObjHeader from '../ObjHeader.svelte';

    const config = {};
    const math = create(all, config);

    import {
        ArrowBufferGeometry,
        lcm,
        marchingSegments,
        // marchingCubes,
        checksum,
        ParametricGeometry,
    } from '../utils.js';
    import InputChecker from '../form-components/InputChecker.svelte';
    // import ObjectParamInput from '../form-components/ObjectParamInput.svelte';

    export let params = {
        a: '-2',
        b: '2',
        c: '-2',
        d: '1 + sin(pi*u)/2',
        x: 'u',
        y: 'v',
        z: '1 - sin(u^2 - v^2)/2',
        rNum: 10,
        cNum: 10,
        nX: 30,
    };

    export let myId;

    let xyz;

    // See how often the DOM updates.
    //
    // beforeUpdate((arg) => {
    //     console.log("I'm being updated", params, 'again.');
    // });

    $: {
        const [x, y, z] = [params.x, params.y, params.z].map((f) =>
            math.parse(f).compile()
        );
        xyz = (u, v, vec) =>
            vec.set(
                x.evaluate({ u, v }),
                y.evaluate({ u, v }),
                z.evaluate({ u, v })
            );
    }

    // Only run the update if the params have changed.
    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateSurface();

    // Check midpoint of parameter space and see if all is ok.
    const chickenParms = (val, { a, b, c, d }) => {
        let valuation;
        try {
            const [A, B, C, D, V] = math.parse([a, b, c, d, val]);
            const u = (A.evaluate() + B.evaluate()) / 2;
            const v = (C.evaluate({ u }) + D.evaluate({ u })) / 2;
            valuation = V.evaluate({ u, v });
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

    export let scene;
    export let shadeUp;
    export let controls;
    export let camera;
    export let gridStep;
    export let render = () => {};
    export let onClose = () => {};
    // export let onUpdate = () => {};
    export let selected;

    let hidden = false;

    // params['rNum'] = 10;
    // params['cNum'] = 10;
    // params['nX'] = 60;
    params = { ...params, rNum: 10, cNum: 10, nX: 60 };

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
    });

    whiteLineMaterial.polygonOffset = true;
    whiteLineMaterial.polygonOffsetFactor = 0.1;

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

    let cMin, dMax; // make these globals as useful for tangents.

    const tol = 1e-12; //tolerance for comparisons

    let surfaceMesh;

    const updateSurface = function () {
        console.log(`I'm ${myId} and I'm updatin'.`);
        const { a, b, c, d, x, y, z } = params;
        const A = math.parse(a).evaluate(),
            B = math.parse(b).evaluate();
        const [C, D, X, Y, Z] = math.parse([c, d, x, y, z]);
        const geometry = new ParametricGeometry(
            (u, v, vec) => {
                const U = A + (B - A) * u;
                const uv = {
                    u: U,
                    v:
                        (1 - v) * C.evaluate({ u: U }) +
                        v * D.evaluate({ u: U }),
                };
                vec.set(X.evaluate(uv), Y.evaluate(uv), Z.evaluate(uv));
            },
            params.nX || 30,
            params.nX || 30
        );
        const meshGeometry = meshLines(
            params,
            params.rNum,
            params.cNum,
            params.nX
        );
        // let material = plusMaterial;

        if (surfaceMesh) {
            for (let i = 0; i < surfaceMesh.children.length; i++) {
                const mesh = surfaceMesh.children[i];
                mesh.geometry.dispose();
                mesh.geometry = i < 2 ? geometry : meshGeometry;
                // if (i < 1) {
                //     mesh.material = material;
                // }

                // if (i === 1) {
                //     mesh.visible = true;
                // }
            }
        } else {
            surfaceMesh = new THREE.Object3D();
            const backMesh = new THREE.Mesh(geometry, minusMaterial);
            const frontMesh = new THREE.Mesh(geometry, plusMaterial);
            // mesh.add(new THREE.Mesh( geometry, wireMaterial ))
            surfaceMesh.add(frontMesh);
            surfaceMesh.add(backMesh);
            surfaceMesh.add(
                new THREE.LineSegments(meshGeometry, whiteLineMaterial)
            );
            // mesh.visible = false;
            scene.add(surfaceMesh);
        }

        tanFrame.visible = false;
        tangentVectors({ uv: new THREE.Vector2(0, 0) });
        render();
    };

    const meshLines = function (rData, rNum = 10, cNum = 10, nX = 30) {
        let { a, b, c, d, x, y, z } = rData;
        // const N = lcm(lcm(rNum, cNum), nX);
        const A = math.parse(a).evaluate(),
            B = math.parse(b).evaluate();
        [c, d, x, y, z] = math.parse([c, d, x, y, z]);

        const du = (B - A) / rNum;
        const dx = (B - A) / lcm(nX, cNum);
        const points = [];
        for (let u = A; u <= B; u += du) {
            const C = c.evaluate({ u: u }),
                D = d.evaluate({ u: u });
            const dy = (D - C) / lcm(nX, rNum);
            const params = { u: u, v: C };
            points.push(
                new THREE.Vector3(
                    x.evaluate(params),
                    y.evaluate(params),
                    z.evaluate(params)
                )
            );
            for (let v = C + dy; v < D; v += dy) {
                params.v = v;
                points.push(
                    new THREE.Vector3(
                        x.evaluate(params),
                        y.evaluate(params),
                        z.evaluate(params)
                    )
                );
                points.push(
                    new THREE.Vector3(
                        x.evaluate(params),
                        y.evaluate(params),
                        z.evaluate(params)
                    )
                );
            }
            params.v = D;
            points.push(
                new THREE.Vector3(
                    x.evaluate(params),
                    y.evaluate(params),
                    z.evaluate(params)
                )
            );
        }

        // v-Meshes
        const params = { u: A };
        (cMin = c.evaluate(params)), (dMax = d.evaluate(params));
        for (let u = A + dx; u <= B; u += dx) {
            params.u = u;
            cMin = Math.min(cMin, c.evaluate(params));
            dMax = Math.max(dMax, d.evaluate(params));
        }

        for (let v = cMin; v <= dMax; v += (dMax - cMin) / cNum) {
            const zs = marchingSegments(
                (x) => (c.evaluate({ u: x }) - v) * (v - d.evaluate({ u: x })),
                A,
                B,
                nX
            );
            params.v = v;
            let nextZero = zs.shift();
            for (let u = A; u <= B - dx + tol; u += dx) {
                params.u = u;
                if (c.evaluate(params) <= v && v <= d.evaluate(params)) {
                    points.push(
                        new THREE.Vector3(
                            x.evaluate(params),
                            y.evaluate(params),
                            z.evaluate(params)
                        )
                    );
                    if (nextZero < u + dx) {
                        params.u = nextZero;
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params)
                            )
                        );
                        nextZero = zs.shift();
                    } else {
                        params.u = u + dx;
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params)
                            )
                        );
                    }
                } else {
                    if (nextZero < u + dx) {
                        params.u = nextZero;
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params)
                            )
                        );
                        nextZero = zs.shift();
                        params.u = u + dx;
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params)
                            )
                        );
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    };

    // onMount(updateSurface);
    onMount(() => console.log(`${myId} mounted`));
    // afterUpdate(() => {
    //     console.log('Ima a surface. My params are ', params);
    // });
    onDestroy(() => {
        console.log("Ugh. I'm parsurf-destroyed.");
        for (const child of surfaceMesh.children) {
            child.geometry && child.geometry.dispose();
            child.material && child.material.dispose();
        }
        scene.remove(surfaceMesh);
        scene.remove(tanFrame);
        window.removeEventListener('keydown', shiftDown, false);
        window.removeEventListener('keyup', shiftUp, false);
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
        opacity: 0.3,
    });
    const planeShard = new THREE.Mesh(
        new THREE.BufferGeometry(),
        shardMaterial
    );
    tanFrame.add(planeShard);

    // initial visibility
    planeShard.visible = false;
    arrows.n.visible = false;
    tanFrame.visible = false;

    scene.add(tanFrame);

    const rFrame = function ({
        r = (u, v) => new THREE.Vector3(u, v, u * u + v * v),
        uv = [1, 1],
        eps = 1e-4,
    } = {}) {
        const [u, v] = uv;

        let h;

        h = Math.max(u * eps, (2 * eps) ** 2); // dumb way of dealing with floating point arithmetic issues
        const ru = r(u + h / 2, v)
            .sub(r(u - h / 2, v))
            .divideScalar(h);
        h = Math.max(v * eps, (2 * eps) ** 2);
        const rv = r(u, v + h / 2)
            .sub(r(u, v - h / 2))
            .divideScalar(h);
        const n = ru.clone().cross(rv);
        return { p: r(u, v), ru, rv, n };
    };

    // Construct tangent vectors at a point u,v (both 0 to 1)
    const tangentVectors = function ({ uv, eps = 1e-4, plane = true } = {}) {
        const { a, b, c, d } = params;
        const A = math.parse(a).evaluate(),
            B = math.parse(b).evaluate();
        const [C, D] = math.parse([c, d]);
        const U = A + (B - A) * uv.x;
        const uvs = [
            U,
            (1 - uv.y) * C.evaluate({ u: U }) + uv.y * D.evaluate({ u: U }),
        ];
        const { p, ru, rv, n } = rFrame({
            r: (u, v) => {
                const out = new THREE.Vector3();
                xyz(u, v, out);
                return out;
            },
            uv: uvs,
            eps,
        });

        // point.position.copy(dr.p);

        const arrowParams = {
            radiusTop: gridStep / 10,
            radiusBottom: gridStep / 20,
            heightTop: gridStep / 7,
        };

        // const arrow = arrows.n;
        Object.keys(arrows).forEach((key) => {
            const arrow = arrows[key];
            let vec;
            switch (key) {
                case 'u':
                    vec = ru;
                    break;
                case 'v':
                    vec = rv;
                    break;
                case 'n':
                    vec = n;
                    break;

                default:
                    break;
            }
            const pos = p.clone();
            arrow.position.copy(pos);
            arrow.geometry?.dispose();

            arrow.geometry = new ArrowBufferGeometry({
                ...arrowParams,
                height: vec.length(),
            });
            arrow.lookAt(pos.add(vec));
        });

        // tangent plane

        if (plane) {
            planeShard.geometry?.dispose();
            const tangentPlaneGeometry = new ParametricGeometry(
                (u, v, vec) => {
                    vec.copy(p)
                        .add(ru.clone().multiplyScalar(u))
                        .add(rv.clone().multiplyScalar(v));
                    // vec.add(new THREE.Vector3(0, 0, 0.0001*gridStep)); //
                },
                2,
                2
            );

            planeShard.geometry = tangentPlaneGeometry;
        }
    };

    const raycaster = new THREE.Raycaster();

    const mouseVector = new THREE.Vector2();

    const onMouseMove = function (e) {
        // normalized mouse coordinates
        mouseVector.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (e.clientY / window.innerHeight);

        raycaster.setFromCamera(mouseVector, camera);

        const intersects = raycaster.intersectObjects(
            [surfaceMesh.children[0], surfaceMesh.children[1]],
            true
        );

        if (intersects.length > 0) {
            const intersect = intersects[0];
            point.position.x = intersect.point.x;
            point.position.y = intersect.point.y;
            point.position.z = intersect.point.z;

            const uv = intersect.uv;

            tangentVectors({ uv });

            render();
        }
    };

    const shiftDown = (e) => {
        if (shadeUp) {
            switch (e.key) {
                case 'Backspace':
                    surfaceMesh.visible = !surfaceMesh.visible;
                    render();
                    break;
                case 'Shift':
                    window.addEventListener('mousemove', onMouseMove, false);
                    tanFrame.visible = true;
                    break;
                case 'c':
                    controls.target.set(
                        point.position.x,
                        point.position.y,
                        point.position.z
                    );
                    render();
                    break;
                case 't':
                    tanFrame.visible = !tanFrame.visible;
                    render();
                    break;
                case 'y':
                    if (!planeShard.visible) {
                        tanFrame.visible = true;
                        planeShard.visible = true;
                    } else {
                        planeShard.visible = false;
                    }
                    render();
                    break;
                case 'n':
                    if (!arrows.n.visible) {
                        tanFrame.visible = true;
                        arrows.n.visible = true;
                    } else {
                        arrows.n.visible = false;
                    }

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

<div class="boxItem" class:selected on:click on:keydown>
    <div class="box-title">
        <strong>Parametric surface</strong>
        <ObjHeader bind:hidden bind:onClose />
    </div>
    <div {hidden}>
        <div class="container">
            {#each ['x', 'y', 'z'] as name}
                <span class="box-1"><M size="sm">{name}(u,v) =</M></span>
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

            <input
                class="form-control form-control-sm box box-1"
                value={params.a}
                on:change={(e) => {
                    const val = e.target.value;
                    if (chickenParms(params.x, params)) {
                        params.a = val;
                        e.target.classList.remove('is-invalid');
                        // updateSurface();
                    } else {
                        e.target.classList.add('is-invalid');
                    }
                }}
            />

            <span class="box box-3"><M size="sm">\leq u \leq</M></span>
            <input
                class="form-control form-control-sm box box-4"
                value={params.b}
                on:change={(e) => {
                    const val = e.target.value;
                    if (chickenParms(params.x, params)) {
                        params.b = val;
                        e.target.classList.remove('is-invalid');
                        // updateSurface();
                    } else {
                        e.target.classList.add('is-invalid');
                    }
                }}
            />

            <input
                class="form-control form-control-sm box box-1"
                value={params.c}
                on:change={(e) => {
                    const val = e.target.value;
                    if (chickenParms(params.x, params)) {
                        params.c = val;
                        e.target.classList.remove('is-invalid');
                        // updateSurface();
                    } else {
                        e.target.classList.add('is-invalid');
                    }
                }}
            />
            <span class="box box-3"><M size="sm">\leq v \leq</M></span>
            <input
                class="form-control form-control-sm box box-4"
                value={params.d}
                on:change={(e) => {
                    const val = e.target.value;
                    if (chickenParms(params.x, params)) {
                        params.d = val;
                        e.target.classList.remove('is-invalid');
                        // updateSurface();
                    } else {
                        e.target.classList.add('is-invalid');
                    }
                }}
            />

            <span class="box-1"><M size="sm">u</M>-meshes</span>
            <input
                type="range"
                bind:value={params.rNum}
                min="0"
                max="20"
                step="1"
                class="box box-2"
            />
            <span class="box-1"><M size="sm">v</M>-meshes</span>
            <input
                type="range"
                bind:value={params.cNum}
                min="0"
                max="20"
                step="1"
                class="box box-2"
            />
            <span class="box-1">Resolution</span>
            <input
                type="range"
                bind:value={params.nX}
                min="10"
                max="80"
                step="5"
                class="box box-2"
            />
        </div>
    </div>
</div>

<style>
    .box-3 {
        color: white;
        vertical-align: middle;
        text-align: center;

        grid-column: 2 / 3;
    }
    input {
        color: black;
    }
</style>
