<script context="module">
    let titleIndex = 0;
</script>

<script>
    import { onDestroy, onMount } from 'svelte';
    import * as THREE from 'three';
    import { create, all } from 'mathjs';

    import M from '../M.svelte';
    import ObjHeader from './ObjHeader.svelte';
    import Nametag from './Nametag.svelte';
    import ObjectParamInput from '../form-components/ObjectParamInput.svelte';
    import InputChecker from '../form-components/InputChecker.svelte';

    const config = {};
    const math = create(all, config);

    import { updateParams } from './levelWorker.js';

    import { marchingCubes, ArrowBufferGeometry, checksum } from '../utils.js';
    import { flashDance } from '../sceneUtils';

    export let uuid;
    export let onRenderObject = function () {};
    export let onDestroyObject = function () {};
    export let onSelect = function () {};

    export let params = {
        g: 'x^2 - y^2 + z^2',
        k: '1',
        a: '-2',
        b: '2',
        c: '-2',
        d: '2',
        e: '-2',
        f: '2',
    };

    export let scene;
    export let render = () => {};
    export let onClose = () => {};
    export let selected;
    export let selectedObjects;
    export let selectedPoint;
    export let title;

    export let camera,
        controls,
        // animation = false,
        gridStep;
    // showLevelCurves = false;

    let minimize = false;
    let loading = false;

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

    // $: col = new THREE.Color(color);
    $: {
        if (selectedObjects.length === 0 || selected) {
            if (selectedObjects[selectedObjects.length - 1] === uuid) {
                selectedPoint = point;
            }
            // plusMaterial.opacity = 0.7;
            // minusMaterial.opacity = 0.7;
        } else {
            // plusMaterial.opacity = 0.3;
            // minusMaterial.opacity = 0.3;
        }
        plusMaterial.color.set(color);
        const hsl = {};
        plusMaterial.color.getHSL(hsl);
        hsl.h = (hsl.h + 0.618033988749895) % 1;
        minusMaterial.color.setHSL(hsl.h, hsl.s, hsl.l);
        render();
    }

    let boxItemElement;
    $: if (selected && selectedObjects.length > 0) {
        mesh.children.map((mesh) => flashDance(mesh, render));
        boxItemElement.scrollIntoView({ behavior: 'smooth' });
    }

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
    });

    const mesh = new THREE.Object3D();

    const plusMesh = new THREE.Mesh(geometry, plusMaterial);
    const minusMesh = new THREE.Mesh(geometry, minusMaterial);
    mesh.add(plusMesh);
    mesh.add(minusMesh);

    // Register meshes for pointer events
    plusMesh.name = uuid;
    minusMesh.name = uuid;

    mesh.visible = false;
    scene.add(mesh);

    const updateLevel = function () {
        loading = true;
        const gc = math.parse(params.g).compile();
        updateParams(gc, params).then((data) => {
            levelWorkerSuccessHandler(data);
            onRenderObject(plusMesh, minusMesh);
        });
    };

    /**
     *  "Check parameters"
     * */
    const chickenParms = (val, params) => {
        let valuation;
        try {
            const { a, b, c, d, e, f } = params;

            const parsedVal = math.parse(val);

            valuation = Number.isFinite(
                parsedVal.evaluate({
                    x: (a + b) / 2,
                    y: (c + d) / 2,
                    z: (e + f) / 2,
                })
            );
        } catch (e) {
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    };
    export let color = '#3232ff';

    $: hashTag = checksum(JSON.stringify(params));
    $: hashTag, updateLevel();

    const levelWorkerSuccessHandler = (data) => {
        const { normals, vertices, xpts, ypts, zpts } = data;
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(normals, 3)
        );

        mesh.visible = true;

        {
            xTraceGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(xpts, 3)
            );

            const trace = new THREE.LineSegments(
                xTraceGeometry,
                whiteLineMaterial
            );

            trace.rotation.y = Math.PI / 2;
            trace.rotation.z = Math.PI / 2;

            mesh.add(trace);
        }
        {
            yTraceGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(ypts, 3)
            );

            const trace = new THREE.LineSegments(
                yTraceGeometry,
                whiteLineMaterial
            );

            trace.rotation.x = -Math.PI / 2;
            trace.rotation.z = -Math.PI / 2;

            mesh.add(trace);
        }
        {
            zTraceGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(zpts, 3)
            );

            const trace = new THREE.LineSegments(
                zTraceGeometry,
                whiteLineMaterial
            );

            mesh.add(trace);
        }

        point.position.set(0, 0, 0);

        tangentVectors({ point });

        loading = false;
        render();
    };
    onMount(() => {
        titleIndex++;
        title = title || `Level Surface ${titleIndex}`;

        selectedObjects = [];
        setTimeout(onSelect, 350);
    });

    onDestroy(() => {
        onDestroyObject(...mesh.children);
        geometry.dispose();
        plusMaterial.dispose();
        minusMaterial.dispose();
        scene.remove(mesh);
        scene.remove(tanFrame);
        window.removeEventListener('keydown', onKeyDown, false);
        window.removeEventListener('keyup', onKeyUp, false);
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
    const planeShard = new THREE.Mesh(
        new THREE.BufferGeometry(),
        shardMaterial
    );
    tanFrame.add(planeShard);

    tanFrame.visible = false;

    scene.add(tanFrame);

    const nFrame = function ({
        f = (x, y, z) => math.evaluate(params.g, { x, y, z }),
        point = point,
        eps = 1e-4,
    } = {}) {
        const [u, v, w] = [
            point.position.x,
            point.position.y,
            point.position.z,
        ];

        let h;

        h = Math.max(u * eps, (2 * eps) ** 2);
        const fx = (f(u + h / 2, v, w) - f(u - h / 2, v, w)) / h;
        h = Math.max(v * eps, (2 * eps) ** 2);
        const fy = (f(u, v + h / 2, w) - f(u, v - h / 2, w)) / h;
        h = Math.max(w * eps, (2 * eps) ** 2);
        const fz = (f(u, v, w + h / 2) - f(u, v, w - h / 2)) / h;

        return { p: point.position, n: new THREE.Vector3(fx, fy, fz) };
    };

    // Construct tangent vectors at a point u,v (both 0 to 1)
    const tangentVectors = function ({ point, eps = 1e-4, plane = true } = {}) {
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
    };

    const raycaster = new THREE.Raycaster();

    let mouseVector = new THREE.Vector2();

    const onMouseMove = function (e) {
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
    };

    const toggleHide = function () {
        mesh.visible = !mesh.visible;
        render();
    };

    const onKeyDown = (e) => {
        if (e.target.matches('input')) {
            return;
        }

        if (selected) {
            switch (e.key) {
                case 'Backspace':
                    if (selected) {
                        toggleHide();
                    }
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

    const onKeyUp = (e) => {
        if (e.key === 'Shift') {
            window.removeEventListener('mousemove', onMouseMove);
        }
    };

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
</script>

<div class="boxItem" class:selected bind:this={boxItemElement} on:keydown>
    <ObjHeader
        bind:minimize
        bind:selectedObjects
        {onClose}
        {toggleHide}
        objHidden={!mesh.visible}
        {color}
        {onSelect}
    >
        <Nametag bind:title />
        <span hidden={!loading}>
            <i class="fa fa-spinner fa-pulse fa-fw" />
            <span class="sr-only">Loading...</span>
        </span>
    </ObjHeader>
    <div hidden={minimize}>
        <div class="threedemos-container container">
            <span class="box-1"><M size="sm">g(x,y,z) =</M></span>
            <InputChecker
                value={params['g']}
                checker={chickenParms}
                name={'g'}
                {params}
                on:cleared={(e) => {
                    params['g'] = e.detail;
                }}
            />

            <span class="box-1"><M size="sm">k =</M></span>
            <InputChecker
                value={params['k']}
                checker={(val) => Number.isFinite(math.parse(val).evaluate())}
                name={'k'}
                {params}
                on:cleared={(e) => {
                    params['k'] = e.detail;
                }}
            />

            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.a}
                onChange={(newVal) => {
                    params.a = newVal;
                }}
            />
            <span class="box box-3"><M size="sm">\leq x \leq</M></span>
            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.b}
                onChange={(newVal) => {
                    params.b = newVal;
                }}
            />

            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.c}
                onChange={(newVal) => {
                    params.c = newVal;
                }}
            />
            <span class="box box-3"><M size="sm">\leq y \leq</M></span>
            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.d}
                onChange={(newVal) => {
                    params.d = newVal;
                }}
            />

            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.e}
                onChange={(newVal) => {
                    params.e = newVal;
                }}
            />
            <span class="box box-3"><M size="sm">\leq z \leq</M></span>
            <ObjectParamInput
                type="number"
                className="form-control form-control-sm box"
                initialValue={params.f}
                onChange={(newVal) => {
                    params.f = newVal;
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

            <span class="box-1">Tangent plane </span>
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
