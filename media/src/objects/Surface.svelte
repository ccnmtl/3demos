<script module>
    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';
    // import { beforeUpdate } from 'svelte';
    import {
        plainVertexShader,
        heatmapFragmentShader,
        plainRedFrag,
    } from './shaders';
    import { uniformColorData } from '../js-colormaps';

    import { dependsOn } from './Vector.svelte';
    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import Nametag from './Nametag.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import { densityColormap, tickTock, vMax, vMin } from '../stores';

    const config = {};
    const math = create(all, config);

    import {
        ArrowBufferGeometry,
        lcm,
        colorBufferVertices,
        marchingSegments,
        vMaxMin,
        blueUpRedDown,
        checksum,
        ParametricGeometry,
    } from '../utils.js';

    import { mathToJSFunction } from './mathutils';

    import { flashDance } from '../sceneUtils';
    import InputChecker from '../form-components/InputChecker.svelte';
    import ColorBar from '../settings/ColorBar.svelte';

    let {
        uuid,
        onRenderObject = function () {},
        onDestroyObject = function () {},
        params = $bindable({
            a: '-2',
            b: '2',
            c: '-2',
            d: '1 + sin(pi*u)/2',
            x: 'u',
            y: 'v',
            z: '1 - sin(u^2 - v^2)/2',
            t0: '0',
            t1: '1',
        }),
        color = $bindable(),
        title = $bindable(),
        animation = $bindable(false),
        scene,
        camera,
        gridStep,
        render = () => {},
        onClose = () => {},
        selected,
        selectObject,
        selectPoint,
        animate = () => {},
    } = $props();

    let rNum = 10;
    let cNum = 10;
    let nX = $state(50);

    let tau = $state(0);
    let t0 = $derived(math.parse(params.t0 ?? '0').evaluate());
    let t1 = $derived(math.parse(params.t1 ?? '1').evaluate());
    let tVal = $derived(t0 + tau * (t1 - t0));
    let displayTVal = $derived(tVal.toFixed(2));

    let last = null;

    let chooseDensity = $state(false);
    params.mu = params.mu ?? '1';
    // let compiledDensity;
    // let densityFunc = () => 1;

    const colorMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 70,
        side: THREE.DoubleSide,
        vertexColors: true,
    });

    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: plainVertexShader,
        fragmentShader: plainRedFrag,
        uniforms: {},
        side: THREE.DoubleSide,
    });

    // const colorMeBadd = (mesh, f) => {
    //     console.log('bbbbbaadddddddd');
    //     const [vMaxLocal, vMinLocal] = vMaxMin(mesh, f);
    //     $vMin = Math.min($vMin, vMinLocal);
    //     $vMax = Math.max($vMax, vMaxLocal);
    //     if ($vMax == $vMin) {
    //         if ($vMax == 0) {
    //             $vMax = 1;
    //             $vMin = -1;
    //         } else {
    //             $vMax = (4 / 3) * Math.abs($vMax);
    //             $vMin = (-4 / 3) * Math.abs($vMin);
    //         }
    //     }

    //     colorBufferVertices(mesh, (x, y, z) => {
    //         const value = f(x, y, z);
    //         return blueUpRedDown(
    //             (value - $vMin) / ($vMax - $vMin),
    //             0.8,
    //             $densityColormap,
    //         );
    //     });
    // };

    let frameVisible = $state(false);
    $effect(() => {
        // console.log('tanframe effect');
        if (tanFrame) tanFrame.visible = frameVisible;
    });

    // $effect(() => {
    //     ($vMin, $vMax),
    //         chooseDensity && colorMeBadd(surfaceMesh.children[0], densityFunc);
    // });

    $effect(() => {
        // console.log('shader effex');
        if (chooseDensity && $densityColormap) {
            const flatArray = new Float32Array(
                uniformColorData($densityColormap),
            );

            shaderMaterial.fragmentShader = heatmapFragmentShader(
                params.mu,
                $densityColormap,
                $vMin,
                $vMax,
            );
            shaderMaterial.uniforms.colorData = { value: flatArray };
            shaderMaterial.uniforms.tVal = { value: untrack(() => tVal) };

            // const shaderMaterial = new THREE.ShaderMaterial({
            //     vertexShader: plainVertexShader,
            //     fragmentShader: heatmapFragmentShader(
            //         params.mu,
            //         $densityColormap,
            //         $vMin,
            //         $vMax,
            //     ),
            //     uniforms: {
            //         colorData: { value: flatArray },
            //         // tVal: { value: tVal },
            //     },
            //     side: THREE.DoubleSide,
            // });

            surfaceMesh.children[1].visible = false;
            // colorMeBadd(surfaceMesh.children[0], densityFunc);
            surfaceMesh.children[0].material?.dispose();
            surfaceMesh.children[0].material = shaderMaterial;

            render();
        } else {
            if (surfaceMesh) {
                surfaceMesh.children[1].visible = true;
                surfaceMesh.children[0].material = plusMaterial;
                render();
            }
        }
    });

    let xyz = $derived.by(() => {
        const [x, y, z] = [params.x, params.y, params.z].map((f) =>
            mathToJSFunction(f, ['u', 'v', 't']),
        );
        return (u, v, vec, t = 0) =>
            vec.set(x(u, v, t), y(u, v, t), z(u, v, t));
    });
    let abcd = $derived.by(() => {
        const [a, b] = [params.a, params.b].map((f) => math.evaluate(f));
        const [c, d] = [params.c, params.d].map((f) =>
            mathToJSFunction(f, ['u']),
        );

        // take uv on unit square to actual uv coords for ParametricGeom
        return (u, v) => [
            a + u * (b - a),
            c(a + u * (b - a)) * (1 - v) + d(a + u * (b - a)) * v,
        ];
    });

    // compile (in the math.js sense) each expression once they change
    // and thus have been cleared
    $effect(() => {
        // console.log('parm compile');

        // React on changes here.
        const { a, b, c, d, x, y, z } = params;

        untrack(updateSurface);
    });

    let isDynamic = $derived(
        dependsOn({ x: params.x, y: params.y, z: params.z }, 't'),
    );
    let isRhoDynamic = $derived(dependsOn({ mu: params.mu }, 't'));
    // Only run the update if the params have changed.
    // let hashTag = $derived(checksum(JSON.stringify(params)));

    // $inspect(params);

    // Check midpoint of parameter space and see if all is ok.
    const chickenParms = (val, { a, b, c, d, t0, t1 }) => {
        let valuation;
        try {
            const [A, B, C, D, T0, T1, V] = math.parse([
                a,
                b,
                c,
                d,
                t0,
                t1,
                val,
            ]);
            const u = (A.evaluate() + B.evaluate()) / 2;
            const v = (C.evaluate({ u }) + D.evaluate({ u })) / 2;
            valuation = V.evaluate({
                u,
                v,
                t: T0.evaluate() / 2 + T1.evaluate() / 2,
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

    let minimize = $state(false);

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
        transparent: false,
        opacity: 0.7,
    });
    const plusMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });

    let boxItemElement;

    // Keep color fresh
    $effect(() => {
        plusMaterial.color.set(color);
        const hsl = {};
        plusMaterial.color.getHSL(hsl);
        hsl.h = (hsl.h + 0.618033988749895) % 1;
        minusMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);
        render();
    });

    let cMin, dMax; // make these globals as useful for tangents.

    const tol = 1e-12; //tolerance for comparisons

    let surfaceMesh = $state();

    let objHidden = $state(false);

    $effect(() => {
        if (surfaceMesh) surfaceMesh.visible = !objHidden;
        render();
    });

    const updateSurface = function () {
        // const { t0, t1 } = params;
        // const time = t0
        //     ? math.evaluate(t0) + tau * (math.evaluate(t1) - math.evaluate(t0))
        //     : 0;

        const geometry = new ParametricGeometry(
            (u, v, vec) => {
                const [U, V] = abcd(u, v);
                xyz(U, V, vec, tVal);
            },
            nX || 30,
            nX || 30,
        );
        const meshGeometry = meshLines(params, rNum, cNum, nX);

        if (surfaceMesh) {
            for (let i = 0; i < surfaceMesh.children.length; i++) {
                const mesh = surfaceMesh.children[i];
                mesh.geometry.dispose();
                mesh.geometry = i < 2 ? geometry : meshGeometry;
            }
        } else {
            surfaceMesh = new THREE.Object3D();
            const backMesh = new THREE.Mesh(geometry, minusMaterial);
            const frontMesh = new THREE.Mesh(geometry, plusMaterial);

            // Pass in the 3demos-generated uuid so we can keep track
            // of which object this belongs to.
            backMesh.name = uuid;
            frontMesh.name = uuid;
            onRenderObject(backMesh, frontMesh);

            surfaceMesh.add(frontMesh);
            surfaceMesh.add(backMesh);
            surfaceMesh.add(
                new THREE.LineSegments(meshGeometry, whiteLineMaterial),
            );
            scene.add(surfaceMesh);
        }
        // if (chooseDensity && densityFunc)
        //     colorMeBadd(surfaceMesh.children[0], densityFunc);

        tanFrame.visible = false;
        tangentVectors({ uv: new THREE.Vector2(0, 0) });
        render();
    };

    const meshLines = function (rData, rNum = 10, cNum = 10, nX = 60) {
        let { a, b, c, d, x, y, z } = rData;
        // const N = lcm(lcm(rNum, cNum), nX);
        const A = math.parse(a).evaluate(),
            B = math.parse(b).evaluate();
        [c, d, x, y, z] = math.parse([c, d, x, y, z]);

        const du = (B - A) / rNum;
        const dx = (B - A) / lcm(nX, cNum);
        const points = [];
        const uvs = [];
        for (let u = A; u <= B; u += du) {
            const C = c.evaluate({ u: u }),
                D = d.evaluate({ u: u });
            const dy = (D - C) / lcm(nX, rNum);
            const params = { u: u, v: C, t: tVal };
            uvs.push(params.u, params.v);
            points.push(
                new THREE.Vector3(
                    x.evaluate(params),
                    y.evaluate(params),
                    z.evaluate(params),
                ),
            );
            for (let v = C + dy; v < D; v += dy) {
                params.v = v;
                uvs.push(params.u, params.v);
                points.push(
                    new THREE.Vector3(
                        x.evaluate(params),
                        y.evaluate(params),
                        z.evaluate(params),
                    ),
                );
                uvs.push(params.u, params.v);
                points.push(
                    new THREE.Vector3(
                        x.evaluate(params),
                        y.evaluate(params),
                        z.evaluate(params),
                    ),
                );
            }
            params.v = D;
            uvs.push(params.u, params.v);
            points.push(
                new THREE.Vector3(
                    x.evaluate(params),
                    y.evaluate(params),
                    z.evaluate(params),
                ),
            );
        }

        // v-Meshes
        const params = { u: A, t: tVal };
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
                nX,
            );
            params.v = v;
            let nextZero = zs.shift();
            for (let u = A; u <= B - dx + tol; u += dx) {
                params.u = u;
                if (c.evaluate(params) <= v && v <= d.evaluate(params)) {
                    uvs.push(params.u, params.v);
                    points.push(
                        new THREE.Vector3(
                            x.evaluate(params),
                            y.evaluate(params),
                            z.evaluate(params),
                        ),
                    );
                    if (nextZero < u + dx) {
                        params.u = nextZero;
                        uvs.push(params.u, params.v);
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params),
                            ),
                        );
                        nextZero = zs.shift();
                    } else {
                        params.u = u + dx;
                        uvs.push(params.u, params.v);
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params),
                            ),
                        );
                    }
                } else {
                    if (nextZero < u + dx) {
                        params.u = nextZero;
                        uvs.push(params.u, params.v);
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params),
                            ),
                        );
                        nextZero = zs.shift();
                        params.u = u + dx;
                        uvs.push(params.u, params.v);
                        points.push(
                            new THREE.Vector3(
                                x.evaluate(params),
                                y.evaluate(params),
                                z.evaluate(params),
                            ),
                        );
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        return geometry;
    };

    const evolveSurface = function (t) {
        // if (debug) console.log('evolveSurface', t);
        // the front and back surfaces share a geometry. The meshlines are separate
        let geometry = surfaceMesh.children[0].geometry;
        let positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal.array;

        // let colors;
        // if (chooseDensity) {
        //     colors = geometry.attributes.color.array;
        // }
        let uvs = geometry.attributes.uv.array;

        const vec = new THREE.Vector3();
        const ru = new THREE.Vector3();
        const rv = new THREE.Vector3();
        const dx = 1e-4;

        let uindex = 0;
        let pindex = 0;
        let nindex = 0;
        // let cindex = 0;
        for (let i = 0; i < uvs.length / 2; i++) {
            const u = uvs[uindex++];
            const v = uvs[uindex++];
            const [U, V] = abcd(u, v);
            xyz(U, V, vec, t);
            positions[pindex++] = vec.x;
            positions[pindex++] = vec.y;
            positions[pindex++] = vec.z;

            // normals

            xyz(U + dx, V, ru, t);
            xyz(U, V + dx, rv, t);
            ru.sub(vec).cross(rv.sub(vec)).normalize();

            normals[nindex++] = ru.x;
            normals[nindex++] = ru.y;
            normals[nindex++] = ru.z;

            // if (chooseDensity && densityFunc) {
            //     const rgb = blueUpRedDown(
            //         (2 * (densityFunc(x, y, z) - vMin)) / (vMax - vMin) - 1,
            //         0.8,
            //         $densityColormap,
            //     );
            //     colors[cindex++] = rgb.r;
            //     colors[cindex++] = rgb.g;
            //     colors[cindex++] = rgb.b;
            // }
        }

        geometry.attributes.normal.needsUpdate = true;
        geometry.attributes.position.needsUpdate = true;
        // if (chooseDensity && densityFunc) {
        //     geometry.attributes.color.needsUpdate = true;
        // }

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        // // meshes
        geometry = surfaceMesh.children[2].geometry;
        positions = geometry.attributes.position.array;
        uvs = geometry.attributes.uv.array;

        uindex = 0;
        pindex = 0;
        for (let i = 0; i < uvs.length / 2; i++) {
            const u = uvs[uindex++];
            const v = uvs[uindex++];
            xyz(u, v, vec, t);
            positions[pindex++] = vec.x;
            positions[pindex++] = vec.y;
            positions[pindex++] = vec.z;
        }

        geometry.attributes.position.needsUpdate = true;

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        // tangents
        if (tanFrame.visible) {
            const u = point.uv.x;
            const v = point.uv.y;
            const [U, V] = abcd(u, v);

            xyz(U, V, vec, t);

            point.position.copy(vec);

            tangentVectors({ uv: point.uv });
        }
    };

    const update = function (dt = 0) {
        tau += dt / (t1 - t0);
        if (tau > 1) tau %= 1;

        if (isDynamic) evolveSurface(tVal);
        if (isRhoDynamic) {
            shaderMaterial.uniforms.tVal = { value: tVal };
        }

        render();
    };

    // Reacts once when `animation` changes
    // Useful it the objects file is updated with new flag
    $effect(() => {
        if (animation) {
            untrack(animate);
        }
    });

    function currentTock() {
        if (animation) {
            const currentTime = $tickTock;

            last = last || currentTime;
            update(currentTime - last);
            last = currentTime;
        } else {
            last = null;
        }
    }
    $effect(() => {
        if ($tickTock) untrack(currentTock);
    });
    // Reacts when `animation` or the ticktock store change
    // onMount(updateSurface);
    onMount(() => {
        titleIndex++;
        title = title || `Parametric Surface ${titleIndex}`;

        params.t0 = params.t0 || '0';
        params.t1 = params.t1 || '1';

        // updateSurface();
        if (animation) animate();
        if (params.mu && params.mu != '1') chooseDensity = true;
    });

    onDestroy(() => {
        onDestroyObject(...surfaceMesh.children);
        for (const child of surfaceMesh.children) {
            child.geometry && child.geometry.dispose();
            child.material && child.material.dispose();
        }
        scene.remove(surfaceMesh);
        scene.remove(tanFrame);
        window.removeEventListener('keydown', keyDown, false);
        window.removeEventListener('keyup', onKeyUp, false);
        render();
    });

    $effect(() => {
        if (selected) {
            selectPoint(point);
        }
    });

    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        flashDance(surfaceMesh.children[0], render);
        if (!chooseDensity) flashDance(surfaceMesh.children[1], render);
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };
    $effect(() => {
        if (selected) untrack(flash);
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
        pointMaterial,
    );

    tanFrame.add(point);

    const shardMaterial = new THREE.MeshPhongMaterial({
        color: 0x4b4b4b,
        shininess: 80,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
    });
    const planeShard = new THREE.Mesh(
        new THREE.BufferGeometry(),
        shardMaterial,
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
                xyz(u, v, out, tVal);
                return out;
            },
            uv: uvs,
            eps,
        });

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
                },
                2,
                2,
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
            true,
        );

        if (intersects.length > 0) {
            const intersect = intersects[0];
            point.position.x = intersect.point.x;
            point.position.y = intersect.point.y;
            point.position.z = intersect.point.z;

            const uv = intersect.uv;

            point.uv = uv;

            tangentVectors({ uv });

            render();
        }
    };

    let myReq;

    const toggleHide = function () {
        objHidden = !objHidden;
    };

    const keyDown = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        } else if (selected) {
            switch (e.key) {
                case 'Backspace':
                    objHidden = !objHidden;
                    break;
                case 'Shift':
                    window.addEventListener('mousemove', onMouseMove, false);
                    // tanFrame.visible = true;
                    break;
                // case 'c':
                //     controls.target.set(
                //         point.position.x,
                //         point.position.y,
                //         point.position.z,
                //     );
                //     render();
                //     break;
                case 'd':
                    chooseDensity = !chooseDensity;
                    render();
                    break;
                case 't':
                    if (selected) {
                        tanFrame.visible = !tanFrame.visible;
                    }
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
                case 'p':
                    animation = !animation;
                    break;
                case 'r':
                    tau = 0;
                    update();
                    animation = false;
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
            window.removeEventListener('mousemove', onMouseMove, false);
        }
    };

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="boxItem" class:selected bind:this={boxItemElement}>
    <ObjHeader
        bind:minimize
        {toggleHide}
        {onClose}
        {color}
        onSelect={(e) => selectObject(uuid, !e.shiftKey)}
        {objHidden}
    >
        <Nametag bind:title />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            {#each ['x', 'y', 'z'] as name}
                <span class="box-1"><M size="sm" s="{name}(u,v) = " /></span>
                <InputChecker
                    value={params[name]}
                    checker={chickenParms}
                    {name}
                    {params}
                    cleared={(val) => {
                        params[name] = val;
                    }}
                />
            {/each}

            {#each ['a', 'b'] as name}
                {#if name === 'b'}
                    <span class="box box-3">
                        <M size="sm" s={'\\leq u \\leq '} />
                    </span>
                {/if}
                <InputChecker
                    className="form-control form-control-sm {name === 'a'
                        ? 'box-1'
                        : 'box-4'}"
                    checker={(val) =>
                        Number.isFinite(math.parse(val).evaluate())}
                    value={params[name]}
                    {name}
                    cleared={(val) => {
                        params[name] = val;
                    }}
                />
            {/each}

            {#each ['c', 'd'] as name}
                {#if name === 'd'}
                    <span class="box box-3"
                        ><M size="sm" s={'\\leq v \\leq '} /></span
                    >
                {/if}
                <InputChecker
                    className="form-control form-control-sm {name === 'c'
                        ? 'box-1'
                        : 'box-4'}"
                    checker={(val) => {
                        const A = math.evaluate(params.a);
                        const B = math.evaluate(params.b);
                        let parsedVal;
                        try {
                            parsedVal = math
                                .parse(val)
                                .evaluate({ u: (A + B) / 2 });
                        } catch (e) {
                            console.error(e);
                            return false;
                        }
                        return Number.isFinite(parsedVal);
                    }}
                    value={params[name]}
                    {name}
                    cleared={(val) => {
                        params[name] = val;
                    }}
                />
            {/each}

            {#if isDynamic || isRhoDynamic}
                {#each ['t0', 't1'] as name}
                    {#if name === 't1'}
                        <span class="box box-3"
                            ><M size="sm" s={'\\leq t \\leq '} /></span
                        >
                    {/if}
                    <InputChecker
                        className="form-control form-control-sm {name === 't0'
                            ? 'box-1'
                            : 'box-4'}"
                        checker={(val) =>
                            Number.isFinite(math.parse(val).evaluate())}
                        value={params[name]}
                        {name}
                        cleared={(val) => {
                            params[name] = val;
                        }}
                    />
                {/each}

                <span class="box-1">
                    <span class="t-box"
                        ><M s="t = " /><M s={displayTVal} /></span
                    >
                </span>
                <input
                    type="range"
                    bind:value={tau}
                    min="0"
                    max="1"
                    step="0.001"
                    oninput={() => {
                        cancelAnimationFrame(myReq);
                        myReq = requestAnimationFrame(() => {
                            if (isDynamic) evolveSurface(tVal);
                            if (isRhoDynamic) {
                                shaderMaterial.uniforms.tVal = { value: tVal };
                            }
                            render();
                        });
                    }}
                    class="box box-2"
                />
                <span class="box-1" style="text-align: center;">
                    Tangents&nbsp;
                    <label class="switch box box-3">
                        <input
                            type="checkbox"
                            name="tangentsToggle"
                            id="tangentsToggle"
                            bind:checked={frameVisible}
                            onchange={render}
                        />
                        <span class="slider round"></span>
                    </label>
                </span>
                <PlayButtons
                    bind:animation
                    pause={() => (last = null)}
                    rew={() => {
                        tau = 0;
                        update();
                    }}
                />
            {/if}

            <span class="box-1">Resolution</span>
            <input
                type="range"
                bind:value={nX}
                min="10"
                max="80"
                step="5"
                class="box box-2"
            />
            <span class="box-1"> Density </span>
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    name="chooseDensity"
                    id="chooseDensity"
                    bind:checked={chooseDensity}
                />
                <span class="slider round"></span>
            </label>

            {#if chooseDensity}
                <span class="box-1"><M size="sm" s={'\\mu(x,y,z) = '} /></span>
                <InputChecker
                    value={params.mu}
                    checker={(val) => {
                        const vec = new THREE.Vector3();
                        xyz(0.5, 0.5, vec);

                        let parsedVal;
                        try {
                            parsedVal = math.parse(val).evaluate({
                                x: vec.x,
                                y: vec.y,
                                z: vec.z,
                                t: tVal,
                            });
                        } catch (e) {
                            console.error(e);
                            return false;
                        }
                        return Number.isFinite(parsedVal);
                    }}
                    name={'f'}
                    {params}
                    cleared={(val) => {
                        params.mu = val;
                        render();
                    }}
                />
                <div class="box colorbar-container">
                    <ColorBar
                        vMin={$vMin}
                        vMax={$vMax}
                        cmap={$densityColormap}
                    />
                </div>
            {:else}
                <span class="box box-2">
                    <input
                        type="color"
                        name="colorPicker"
                        id="colorPicker"
                        bind:value={color}
                        style="width:85%; padding: 1px 1px;"
                    />
                </span>
            {/if}
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

    .colorbar-container {
        grid-column: 1 / -1;
        height: 2.5rem;
        margin-bottom: 5px;
    }
</style>
