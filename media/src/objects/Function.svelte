<script module>
    let titleIndex = 0;
</script>

<script>
    import { onMount, onDestroy, untrack } from 'svelte';
    import { slide } from 'svelte/transition';
    import * as THREE from 'three';
    import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
    import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
    import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

    import { create, all, neutronMassDependencies } from 'mathjs';

    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import InputChecker from '../form-components/InputChecker.svelte';
    import Nametag from './Nametag.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import { dependsOn } from './Vector.svelte';
    import { tickTock } from '../stores';

    const config = {};
    const math = create(all, config);

    const transParams = {
        duration: 200,
        axis: 'y',
    };

    import {
        lcm,
        marchingSegments,
        ParametricGeometry,
        marchingSquares,
        ArrowBufferGeometry,
        blockGeometry,
        checksum,
    } from '../utils.js';
    import { flashDance } from '../sceneUtils';

    let {
        uuid,
        onRenderObject,
        onDestroyObject,
        params = $bindable({
            a: '-2',
            b: '2',
            c: '-2',
            d: '1 + sin(pi*x)/4',
            z: 'exp(-(1 - (x^2 + y^2))^2)',
        }),
        color = $bindable('#FFFF33'),
        title = $bindable(),
        scene,
        render,
        gridStep,
        show = true,
        showLevelCurves = false,
        animation = $bindable(false),
        selected,
        selectPoint,
        selectObject,
        animate,
        camera,
        onClose = () => {},
    } = $props();

    // $inspect(camera);

    /**
     *  "Check parameters"
     * */
    const chickenParms = (val, params) => {
        let valuation;
        try {
            const { a, b, c, d } = params;
            const A = math.parse(a).evaluate();
            const B = math.parse(b).evaluate();
            const C = math.parse(c).evaluate({ x: (A + B) / 2 });
            const D = math.parse(d).evaluate({ x: (A + B) / 2 });
            const parsedVal = math.parse(val);

            valuation = Number.isFinite(
                parsedVal.evaluate({
                    x: (A + B) / 2,
                    y: (C + D) / 2,
                    t: (t0 + t1) / 2,
                }),
            );
        } catch (e) {
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };

    let tau = $state(0);
    let t0 = $derived(math.parse(params.t0 ?? '0').evaluate());
    let t1 = $derived(math.parse(params.t1 ?? '1').evaluate());
    let tVal = $derived(t0 + tau * (t1 - t0));
    let displayTVal = $derived(tVal.toFixed(2));

    // $inspect(t0, t1);

    let last = null;

    // Better called "meta-parameters" these are internal values that can stay in the component.
    let data = $state({
        rNum: 10,
        cNum: 10,
        nX: 100,
        nL: 16,
        N: 1,
        s: 0,
        t: 0,
        samp: 0,
        levelDelta: -1,
        shiftLevel: 0.0,
    });

    let minimize = $state(false);

    const colorMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: true,
        transparent: false,
        opacity: 0.8,
    });
    const boxEdgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
    });

    // Tangents
    let showTangents = $state(false);
    let choosingPoint = $state(false);
    const pointMaterial = new THREE.MeshLambertMaterial({ color: 0xffff33 });
    const point = new THREE.Mesh(
        new THREE.SphereGeometry(gridStep / 8, 16, 16),
        pointMaterial,
    );
    point.position.set(1, 1, 1);

    $effect(() => {
        point.visible = showTangents;
    });
    $effect(() => {
        if (selected) selectPoint(point);
    });

    const arrowParams = {
        radiusTop: gridStep / 10,
        radiusBottom: gridStep / 20,
        heightTop: gridStep / 7,
    };
    const arrows = {
        u: new THREE.Mesh(
            new ArrowBufferGeometry({
                ...arrowParams,
                height: 1,
            }),
            new THREE.MeshBasicMaterial({}),
        ),
        v: new THREE.Mesh(
            new ArrowBufferGeometry({
                ...arrowParams,
                height: 1,
            }),
            new THREE.MeshBasicMaterial({}),
        ),
        n: new THREE.Mesh(
            new ArrowBufferGeometry({
                ...arrowParams,
                height: 1,
            }),
            new THREE.MeshBasicMaterial({}),
        ),
        grad: new THREE.Mesh(
            new ArrowBufferGeometry({
                ...arrowParams,
                height: 1,
            }),
            new THREE.MeshBasicMaterial({}),
        ),
    };
    const ruColors = { u: 0x992525, v: 0x252599, grad: 0x259925, n: 0xb6b6b6 };
    for (let key of Object.keys(arrows)) {
        arrows[key].material.color.set(ruColors[key]);
        point.add(arrows[key]);
    }
    arrows.n.visible = false;
    arrows.grad.visible = false;

    const shardMaterial = new THREE.MeshPhongMaterial({
        color: 0x4b4b4b,
        shininess: 80,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
    });
    const planeShard = new THREE.Mesh(undefined, shardMaterial);
    planeShard.visible = false;
    point.add(planeShard);

    scene.add(point);

    // Compile main function
    let func = $derived.by(() => {
        const z = math.parse(params.z).compile();
        return (x, y, t) => z.evaluate({ x, y, t });
    });

    const tangentVectors = function () {
        // const arrowParams = {
        //     radiusTop: gridStep / 10,
        //     radiusBottom: gridStep / 20,
        //     heightTop: gridStep / 7,
        // };

        const dx = 0.001;

        const x = point.position.x;
        const y = point.position.y;

        const f0 = func(x, y, tVal);
        const fx = (func(x + dx / 2, y, tVal) - func(x - dx / 2, y, tVal)) / dx;
        const fy = (func(x, y + dx / 2, tVal) - func(x, y - dx / 2, tVal)) / dx;

        for (let key of Object.keys(arrows)) {
            const geo = arrows[key].geometry;
            switch (key) {
                case 'u':
                    geo.adjustHeight(Math.sqrt(1 + fx * fx));
                    arrows[key].lookAt(1 + x, 0 + y, fx + f0);
                    break;

                case 'v':
                    geo.adjustHeight(Math.sqrt(1 + fy * fy));
                    arrows[key].lookAt(0 + x, 1 + y, fy + f0);
                    break;

                case 'n':
                    arrows[key].lookAt(-fx + x, -fy + y, 1 + f0);
                    break;

                case 'grad':
                    geo.adjustHeight(Math.sqrt(fx * fx + fy * fy));
                    arrows[key].lookAt(x + fx, y + fy, 0);
                    arrows[key].position.z = -f0;
                    break;

                default:
                    break;
            }
        }

        // tangent plane
        planeShard.geometry?.dispose();

        const tangentPlaneGeometry = new ParametricGeometry(
            (u, v, vec) => {
                const U = -2 + 4 * u,
                    V = -2 + 4 * v;

                vec.set(U, V, U * fx + V * fy);
                vec.add(new THREE.Vector3(0, 0, 0.0001));
            },
            2,
            2,
        );

        planeShard.geometry = tangentPlaneGeometry;
    };

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    whiteLineMaterial.polygonOffset = true;
    whiteLineMaterial.polygonOffsetFactor = 0.1;

    const redLineMaterial = new THREE.LineBasicMaterial({
        color: 0xbb3333,
        linewidth: 4,
    });

    let materialOpacity = $state(0.8);

    const plusMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: false,
        transparent: true,
        depthTest: true,
    });
    const minusMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3232,
        shininess: 80,
        side: THREE.BackSide,
        vertexColors: false,
        transparent: true,
    });

    // Set other side a complementary color.
    // {
    //     const hsl = {};
    //     plusMaterial.color.getHSL(hsl);
    //     minusMaterial.color.setHSL(
    //         (hsl.h + 0.618033988749895) % 1,
    //         hsl.s,
    //         hsl.l
    //     );
    // }

    let cMin, dMax; // make these globals as useful for tangents.
    const tol = 1e-12; //tolerance for comparisons

    let surfaceMesh = new THREE.Object3D();

    let graphVisible = $state(true);
    $effect(() => (surfaceMesh.visible = graphVisible));

    const updateSurface = function () {
        const { a, b, c, d } = params;
        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();

        const C = math.parse(c);
        const D = math.parse(d);

        const geometry = new ParametricGeometry(
            (u, v, vec) => {
                const U = A + (B - A) * u;
                const cU = C.evaluate({ x: U });
                const dU = D.evaluate({ x: U });

                const V = (1 - v) * cU + v * dU;

                vec.set(U, V, func(U, V, tVal));
            },
            data.nX,
            data.nX,
        );
        const meshGeometry = meshLines(params, data.rNum, data.cNum, data.nX);
        if (!meshGeometry) {
            // Geometry calculation failed, there must have been an
            // input error.
            console.error('Geometry calculation failed.');
            return;
        }

        if (surfaceMesh.children.length > 0) {
            for (let i = 0; i < surfaceMesh.children.length; i++) {
                const mesh = surfaceMesh.children[i];
                mesh.geometry.dispose();
                mesh.geometry = i < 2 ? geometry : meshGeometry;
                if (i < 1) {
                    mesh.material = plusMaterial;
                }
            }
        } else {
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

        point.position.z = func(point.position.x, point.position.y, tVal);

        tangentVectors();

        if (showLevelCurves) {
            updateLevels();
        }

        if (showLevelCurves) updateLevels();

        if (boxMesh.visible) {
            updateBoxes();
        }

        render();
    };

    const meshLines = function (rData, rNum = 10, cNum = 10, nX = 30) {
        let { a, b, c, d, t0, t1 } = rData;

        const A = math.parse(a).evaluate();
        const B = math.parse(b).evaluate();
        const C = math.parse(c).compile();
        const D = math.parse(d).compile();

        const du = (B - A) / rNum;
        const dx = (B - A) / lcm(nX, cNum);
        const points = [];

        for (let u = A; u <= B; u += du) {
            const cU = C.evaluate({ x: u });
            const dU = D.evaluate({ x: u });

            const dy = (dU - cU) / lcm(nX, rNum);
            // args.x = u;
            // args.y = cU;

            points.push(new THREE.Vector3(u, cU, func(u, cU, tVal)));
            for (let v = cU + dy; v < dU; v += dy) {
                // args.y = v;
                points.push(new THREE.Vector3(u, v, func(u, v, tVal)));
                points.push(new THREE.Vector3(u, v, func(u, v, tVal)));
            }
            // args.y = D;
            points.push(new THREE.Vector3(u, dU, func(u, dU, tVal)));
        }

        // v-Meshes
        // args.x = A;
        cMin = C.evaluate({ x: A });
        dMax = D.evaluate({ x: A });
        for (let u = A + dx; u <= B; u += dx) {
            // args.x = u;
            cMin = Math.min(cMin, C.evaluate({ x: u }));
            dMax = Math.max(dMax, D.evaluate({ x: u }));
        }

        for (let v = cMin; v <= dMax; v += (dMax - cMin) / cNum) {
            const zs = marchingSegments(
                (x) => (C.evaluate({ x: x }) - v) * (v - D.evaluate({ x: x })),
                A,
                B,
                nX,
            );
            // args['y'] = v;
            let nextZero = zs.shift();
            for (let u = A; u <= B - dx + tol; u += dx) {
                // args.x = u;
                if (C.evaluate({ x: u }) <= v && v <= D.evaluate({ x: u })) {
                    points.push(new THREE.Vector3(u, v, func(u, v, tVal)));
                    if (nextZero < u + dx) {
                        // args.x = nextZero;
                        points.push(
                            new THREE.Vector3(
                                nextZero,
                                v,
                                func(nextZero, v, tVal),
                            ),
                        );
                        nextZero = zs.shift();
                    } else {
                        // args.x = u + dx;
                        points.push(
                            new THREE.Vector3(u + dx, v, func(u + dx, v, tVal)),
                        );
                    }
                } else {
                    if (nextZero < u + dx) {
                        // args.x = nextZero;
                        points.push(
                            new THREE.Vector3(
                                nextZero,
                                v,
                                func(nextZero, v, tVal),
                            ),
                        );
                        nextZero = zs.shift();
                        // args.x = u + dx;
                        points.push(
                            new THREE.Vector3(u + dx, v, func(u + dx, v, tVal)),
                        );
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    };

    const evolveSurface = function (t) {
        boxMeshVisible = false;

        // the front and back surfaces share a geometry. The meshlines are separate
        for (let j = 0; j < 3; j += 2) {
            const geometry = surfaceMesh.children[j].geometry;
            const positions = geometry.attributes.position.array;

            let index = 0;
            for (let i = 0; i < positions.length / 3; i++) {
                const x = positions[index++],
                    y = positions[index++];
                positions[index++] = func(x, y, t);
            }

            geometry.attributes.position.needsUpdate = true;

            if (j === 0) {
                const normals = geometry.attributes.normal.array;
                const vec = new THREE.Vector3(),
                    dx = 0.001;
                let index = 0;
                for (let i = 0; i < normals.length / 3; i++) {
                    const ix = index++;
                    const iy = index++;
                    const iz = index++;

                    const x = positions[ix],
                        y = positions[iy];

                    const fx =
                        (func(x + dx / 2, y, t) - func(x - dx / 2, y, t)) / 2;
                    const fy =
                        (func(x, y + dx / 2, t) - func(x, y - dx / 2, t)) / 2;

                    vec.set(-fx, -fy, dx).normalize();
                    normals[ix] = vec.x;
                    normals[iy] = vec.y;
                    normals[iz] = vec.z;

                    geometry.attributes.normal.needsUpdate = true;
                }

                geometry.computeBoundingBox();
                geometry.computeBoundingSphere();
            }
        }

        if (showTangents) {
            const x = point.position.x;
            const y = point.position.y;
            point.position.z = func(x, y, t);

            tangentVectors();
        }
    };

    const levelHolder = new THREE.Object3D();
    scene.add(levelHolder);

    const curveBall = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        redLineMaterial,
    );
    scene.add(curveBall);

    const shiftInterpolation = function (t, L) {
        if (t < 2) {
            return L - (L / 2) * t;
        } else {
            return (L / 2) * ((3 - t) ** 3 - (3 - t) ** 2);
        }
    };

    /**
     * Reactivity, REE-ac-tivity
     */
    let isDynamic = $derived(dependsOn(params, 't'));

    $effect(() => {
        [params.z, params.a, params.b, params.c, params.d];
        untrack(updateSurface);
    });

    // $effect(updateSurface);

    // Keep color fresh
    $effect(() => {
        plusMaterial.color.set(color);
        const hsl = {};
        plusMaterial.color.getHSL(hsl);
        hsl.h = (hsl.h + 0.618033988749895) % 1;
        minusMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);
        render();
    });

    let boxItemElement;
    /**
     * Close on mesh so reactive statement doesn't react when individual parameters change.
     */
    const flash = () => {
        surfaceMesh.children.map((mesh) => flashDance(mesh, render));
        boxItemElement?.scrollIntoView({ behavior: 'smooth' });
    };

    $effect(() => {
        if (selected) untrack(flash);
    });

    const update = function (dt) {
        tau += dt / (t1 - t0);
        tau %= 1;

        evolveSurface(tVal);

        render();
    };

    // Reacts once when `animation` changes
    // Useful it the objects file is updated with new flag
    $effect(() => {
        if (animation) untrack(animate);
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

    let lastLevelTime = null;
    let levelReq;

    const updateLevelShift = (timestamp) => {
        // console.log('uLS', timestamp);
        lastLevelTime = lastLevelTime || timestamp;
        const dt = (timestamp - lastLevelTime) / 1000;
        // console.log(dt, lastLevelTime, timestamp);
        if (
            (data.shiftLevel < 3 && data.levelDelta > 0) ||
            (data.shiftLevel > 0 && data.levelDelta < 0)
        ) {
            const newLevel = data.shiftLevel + data.levelDelta * dt;
            data.shiftLevel = Math.max(0, Math.min(3, newLevel));
            changeLevels(data.shiftLevel);
            lastLevelTime = timestamp;
            levelReq = requestAnimationFrame(updateLevelShift);
        } else {
            // animateLevels = false;
            lastLevelTime = null;
            if (data.shiftLevel >= 3) {
                arrows.u.visible = false;
                arrows.v.visible = false;
                arrows.n.visible = false;
                arrows.grad.visible = true;
            } else {
                arrows.u.visible = true;
                arrows.v.visible = true;
                arrows.grad.visible = false;
            }
        }
        render();
    };

    function changeLevels(t) {
        for (let element of levelHolder.children) {
            element.position.set(0, 0, shiftInterpolation(t, element.level));
        }
    }

    function updateLevels() {
        for (let index = levelHolder.children.length - 1; index >= 0; index--) {
            const element = levelHolder.children[index];
            element.geometry.dispose();
            levelHolder.remove(element);
        }
        const { a, b, c, d } = params;
        // const t0 = math.parse(params.t0).evaluate();
        // const t1 = math.parse(params.t1).evaluate();
        // const t = t0 + tau * (t1 - t0);
        let C = 0,
            D = 0,
            zMin = 0,
            zMax = 0;
        const [A, B] = [math.evaluate(a), math.evaluate(b)];
        for (let i = 0; i <= data.nL; i++) {
            C = Math.min(
                C,
                math.evaluate(c, { x: A + ((B - A) * i) / data.nL }),
            );
            D = Math.max(
                D,
                math.evaluate(d, { x: A + ((B - A) * i) / data.nL }),
            );
            for (let j = 0; j <= data.nL; j++) {
                const Z = func(
                    A + ((B - A) * i) / data.nL,
                    C + ((D - C) * j) / data.nL,
                    tVal,
                );
                zMin = Math.min(zMin, Z);
                zMax = Math.max(zMax, Z);
            }
        }

        for (
            let lev = zMin;
            lev <= zMax;
            lev += Math.max((zMax - zMin) / data.nL, 0.01)
        ) {
            const points = marchingSquares({
                f: (x, y) => {
                    return func(x, y, tVal);
                },
                xmin: A,
                xmax: B,
                ymin: C,
                ymax: D,
                level: lev,
                zLevel: 0,
                nX: data.nX,
                nY: data.nX,
            });

            if (points.length > 1) {
                const lsg = new THREE.BufferGeometry();
                lsg.setFromPoints(points);
                const lsm = new THREE.LineSegments(lsg, undefined);

                const levelGeometry = new LineSegmentsGeometry();
                // levelGeometry.setFromPoints(points);
                levelGeometry.fromLineSegments(lsm);

                const levelMesh = new LineSegments2(
                    levelGeometry,
                    new LineMaterial({
                        color: new THREE.Color().setHSL(
                            (lev - zMin) / (zMax - zMin),
                            0.5,
                            0.5,
                        ),
                        linewidth: 3,
                        transparent: false,
                    }),
                );

                levelMesh.level = lev;
                levelMesh.position.set(
                    0,
                    0,
                    shiftInterpolation(data.shiftLevel, lev),
                );

                levelHolder.add(levelMesh);
            }
        }

        // change selected level curve height
        curveBall.position.set(
            0,
            0,
            shiftInterpolation(data.shiftLevel, curveBall.level),
        );
    }

    $effect(() => {
        if (showLevelCurves) {
            untrack(updateLevels);
            levelHolder.visible = true;
        } else {
            levelHolder.visible = false;
        }
        render();
    });

    // For drawing Riemann sums
    //  - Construct boxes over domain of function with height given
    // by the function value at that location

    const boxMesh = new THREE.Mesh();
    boxMesh.material = colorMaterial;

    let boxMeshVisible = $state(false);
    $effect(() => (boxMesh.visible = boxMeshVisible));

    scene.add(boxMesh);
    const boxMeshEdges = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        boxEdgeMaterial,
    );
    boxMesh.add(boxMeshEdges);

    const updateBoxes = function () {
        const { a, b, c, d, t0, t1 } = params;
        const [A, B, C, D, T0, T1] = [
            math.evaluate(a),
            math.evaluate(b),
            math.evaluate(c),
            math.evaluate(d),
            math.evaluate(t0),
            math.evaluate(t1),
        ];
        const t = T0 + tau * (T1 - T0);

        if (boxMesh.geometry) {
            boxMesh.geometry.dispose();
            boxMeshEdges.geometry.dispose();
        }
        boxMesh.geometry = blockGeometry(
            (x, y) => {
                return func(x, y, t);
            },
            A,
            B,
            C,
            D,
            data.N,
            data.N,
            data.s,
            data.t,
        );
        boxMeshEdges.geometry = new THREE.EdgesGeometry(boxMesh.geometry);
    };

    onMount(() => {
        titleIndex++;
        title = title || `Graph ${titleIndex}`;

        updateSurface();
        updateBoxes();
        // if (animation) dispatch('animate');
    });

    onDestroy(() => {
        onDestroyObject(...surfaceMesh.children);

        for (const child of surfaceMesh.children) {
            child.geometry && child.geometry.dispose();
            child.material && child.material.dispose();
        }
        scene.remove(surfaceMesh);
        for (const child of levelHolder.children) {
            child.geometry && child.geometry.dispose();
            child.material && child.material.dispose();
        }
        scene.remove(levelHolder);

        // Remove integral
        scene.remove(boxMesh);

        scene.remove(point);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('click', onMouseClick);
        render();
    });

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const placePointAtMouse = function (e) {
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

            tangentVectors();

            render();
        }
    };

    const onMouseClick = function (e) {
        if (choosingPoint) {
            placePointAtMouse(e);
            choosingPoint = false;
        }
    };

    const activateLevelElevator = function () {
        cancelAnimationFrame(levelReq);
        data.levelDelta *= -1;
        levelReq = requestAnimationFrame(updateLevelShift);
    };

    const toggleHide = function () {
        graphVisible = !graphVisible;
        render();
    };

    const onKeyDown = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }

        if (selected) {
            switch (e.key) {
                case 'Shift':
                    showTangents = true;
                    window.addEventListener(
                        'mousemove',
                        placePointAtMouse,
                        false,
                    );
                    break;
                case '0':
                    activateLevelElevator();
                    break;
                case 'c':
                    controls.target.set(
                        point.position.x,
                        point.position.y,
                        point.position.z,
                    );
                    render();
                    break;
                case 'Backspace':
                    graphVisible = !graphVisible;
                    render();
                    break;
                case 't':
                    if (selected) {
                        showTangents = !showTangents;
                        render();
                    }
                    break;
                case 'y':
                    planeShard.visible = !planeShard.visible;
                    render();
                    break;
                case 'n':
                    arrows.n.visible = !arrows.n.visible;
                    render();
                    break;
                case 'r':
                    if (selected) {
                        tau = 0;
                        update(0);
                        animation = false;
                        render();
                    }
                    break;
                case 'i':
                    if (selected) {
                        tau = 0;
                        update(0);
                        animation = false;
                        boxMesh.visible = !boxMesh.visible;
                        render();
                    }
                    break;
                case '>':
                    data.N = Math.min(101, data.N + 1);
                    updateBoxes();
                    render();
                    break;
                case '<':
                    data.N = Math.max(1, data.N - 1);
                    updateBoxes();
                    render();
                    break;
                case 'l':
                    showLevelCurves = !showLevelCurves;
                    break;
                case 'p':
                    animation = !animation;
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

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('click', onMouseClick);
</script>

<!-- snippets -->
{#snippet intervalEndPtInput(nm, gridno)}
    <InputChecker
        className="form-control form-control-sm box-{gridno}"
        checker={(val) => Number.isFinite(math.parse(val).evaluate())}
        value={params[nm]}
        name={nm}
        cleared={(val) => {
            params[nm] = val;
        }}
    />
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="boxItem" class:selected bind:this={boxItemElement}>
    <ObjHeader
        bind:minimize
        {onClose}
        {toggleHide}
        objHidden={!point.visible}
        {color}
        onSelect={(e) => selectObject(uuid, !e.shiftKey)}
    >
        <Nametag bind:title />
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            <span class="box-1">
                <M size="sm" s="f(x,y[,t]) =" />
            </span>
            <InputChecker
                value={params['z']}
                checker={chickenParms}
                name={'z'}
                {params}
                cleared={(val) => {
                    params['z'] = val;
                    // updateSurface();
                }}
            />

            {@render intervalEndPtInput('a', '1')}
            <span class="box box-3">
                <M size="sm" s={'\\leq x \\leq '} />
            </span>
            {@render intervalEndPtInput('b', '4')}

            {#each ['c', 'd'] as name}
                {#if name === 'd'}
                    <span class="box box-3">
                        <M size="sm" s={'\\leq y \\leq '} />
                    </span>
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
                                .evaluate({ x: (A + B) / 2 });
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

            <span class="box-1"> Resolution </span>
            <input
                type="range"
                bind:value={data.nX}
                min="10"
                max="60"
                step="5"
                oninput={updateSurface}
                class="box box-2"
            />
            <span class="box-1"> Levels </span>
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    name="showLevels"
                    id="showLevels"
                    bind:checked={showLevelCurves}
                />
                <span class="slider round"></span>
            </label>
            <span class="box-4">
                <button
                    class="btn box-4"
                    onclick={activateLevelElevator}
                    class:hidden={!showLevelCurves}
                >
                    {#if data.levelDelta === 1}
                        Up <i class="fa fa-caret-up"></i>
                    {:else}
                        Down <i class="fa fa-caret-down"></i>
                    {/if}
                </button>
            </span>
            <span class="box-1"> View Graph </span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="graphVisible"
                    id="graphVisible"
                    bind:checked={graphVisible}
                    onchange={render}
                />
                <span class="slider round"></span>
            </label>

            {#if isDynamic}
                {@render intervalEndPtInput('t0', '1')}
                <span class="box box-3">
                    <M size="sm" s={'\\leq t \\leq '} />
                </span>
                {@render intervalEndPtInput('t1', '4')}

                <span class="box-1">
                    <span class="t-box"><M s="t =" /><M s={displayTVal} /></span
                    >
                </span>
                <input
                    type="range"
                    bind:value={tau}
                    min="0"
                    max="1"
                    step="0.001"
                    oninput={() => {
                        evolveSurface(tVal);
                        render();
                    }}
                    class="box box-2"
                />

                <PlayButtons
                    bind:animation
                    pause={() => (last = null)}
                    rew={() => {
                        tau = 0;
                    }}
                />
                <!-- </div> -->
            {/if}

            <span class="box-1"> Tangents </span>
            <label class="switch box box-3">
                <input
                    type="checkbox"
                    name="frameVisible"
                    id="frameVisible"
                    bind:checked={showTangents}
                    onchange={render}
                />
                <span class="slider round"></span>
            </label>
            {#if showTangents}
                {#if choosingPoint}
                    <button
                        class="box box-2 btn btn-secondary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = false;
                        }}>Cancel</button
                    >
                {:else}
                    <button
                        class="box box-2 btn btn-primary"
                        onclick={(e) => {
                            e.stopImmediatePropagation();
                            choosingPoint = true;
                        }}>Select point</button
                    >
                {/if}
            {/if}
            <span class="box-1"> Color </span>
            <span class="box box-2">
                <input
                    type="color"
                    name="colorPicker"
                    id="colorPicker"
                    bind:value={color}
                    style="width:85%; padding: 1px 1px;"
                />
            </span>
            <span class="box-1"> Opacity </span>
            <input
                type="range"
                bind:value={materialOpacity}
                min="0"
                max="1"
                step="0.05"
                oninput={() => {
                    plusMaterial.opacity = materialOpacity;
                    minusMaterial.opacity = materialOpacity;
                    render();
                }}
                class="box box-2"
            />
            <span class="box-1"> Integrate </span>
            <label class="switch box box-2">
                <input
                    type="checkbox"
                    name="doIntegral"
                    id="doIntegral"
                    bind:checked={boxMeshVisible}
                    onchange={() => {
                        if (boxMeshVisible) {
                            updateBoxes();
                        }
                        render();
                    }}
                />
                <span class="slider round"></span>
            </label>
            {#if boxMeshVisible}
                <span class="box-1" transition:slide={transParams}>
                    <M size="sm" s="N" />
                </span>
                <input
                    transition:slide={transParams}
                    type="range"
                    bind:value={data.N}
                    min="1"
                    max="81"
                    step="1"
                    oninput={() => {
                        updateBoxes();
                        render();
                    }}
                    class="box box-2"
                />
                <span class="box-1" transition:slide={transParams}>
                    Sample
                </span>
                <input
                    transition:slide={transParams}
                    type="range"
                    bind:value={data.samp}
                    min="0"
                    max="4"
                    step="1"
                    oninput={() => {
                        const pt = [
                            [0, 0],
                            [1, 0],
                            [1 / 2, 1 / 2],
                            [0, 1],
                            [1, 1],
                        ];
                        [data.s, data.t] = pt[data.samp];
                        updateBoxes();
                        render();
                    }}
                    class="box box-2"
                />
            {/if}
        </div>
    </div>
</div>

<style>
    .hidden {
        display: none;
        background-color: aliceblue;
    }
    .t-box {
        display: inline-block;
        width: 40%;
        text-align: left;
    }
</style>
