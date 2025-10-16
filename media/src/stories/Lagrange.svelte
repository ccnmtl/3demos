<script>
    import * as THREE from 'three';

    import { all, create, xor } from 'mathjs';
    import M from '../M.svelte';
    import {
        sampleImplicitSurface,
        evolveFlowOnLevel,
        ArrowBufferGeometry,
        clamp,
    } from '../utils';
    import { mathToJSFunction } from '../objects/mathutils';
    import { onMount, onDestroy, untrack } from 'svelte';
    import { demoObjects } from '../states.svelte';
    import InputChecker from '../form-components/InputChecker.svelte';
    import PlayButtons from '../form-components/PlayButtons.svelte';

    let { scene, render, selectedPoint = undefined } = $props();

    const config = {};
    const math = create(all, config);

    let sampleParam = $state(0);

    let backupObjects = $state(
        demoObjects.map((obj) => {
            obj.selected = false;
            return obj;
        }),
    );

    let standardExamples = $state([
        {
            uuid: 'lag-story-example-001-',
            kind: 'level',
            title: 'Sphere',
            params: {
                a: '-2',
                b: '2',
                c: '-2',
                d: '2',
                e: '-2',
                f: '2',
                g: 'x^2 + (z - y / 4 - x / 3)^2 - 1',
                k: '0',
            },
            color: '#44CB44',
        },
    ]);

    const whiteLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        depthTest: true,
    });

    let currentSurface = $state(
        backupObjects.find((o) => o.kind === 'level') ?? standardExamples[0],
    );

    // $inspect(currentSurface);

    onMount(() => {
        if (math.evaluate(currentSurface.params.k) != 0) {
            console.log(
                `${currentSurface.params.g} - ${currentSurface.params.k}`,
            );
            currentSurface.params.g = math
                .parse(
                    `${currentSurface.params.g} - ${currentSurface.params.k}`,
                )
                .toString();
            currentSurface.params.k = '0';
        }
        render();
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
    });

    onDestroy(() => {
        for (let index = 0; index < boxes.children.length; index++) {
            const box = boxes.children[index];
            for (const element of box.children) {
                element.geometry?.dispose();
                element.material?.dispose();
            }
        }
        scene.remove(boxes);
        demoObjects.length = 0;
        demoObjects.push(...backupObjects);
        render();
        document.removeEventListener('keydown', onKeyDown, false);
        document.removeEventListener('keyup', onKeyUp, false);
    });

    const onKeyDown = (e) => {
        if (e.target.matches('input, textarea')) {
            return;
        }

        if (currentSurface.selected) {
            switch (e.key) {
                case 'Shift':
                    document.addEventListener(
                        'mousemove',
                        processMouseMove,
                        false,
                    );
                    break;
            }
        }
    };

    const onKeyUp = (e) => {
        if (e.key === 'Shift') {
            document.removeEventListener('mousemove', processMouseMove, false);
        }
    };

    function processMouseMove(e) {
        if (selectedPoint && selectedPoint.visible) {
            const { x, y, z } = selectedPoint.position;
            targetInfo = `f(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}) = ${f(x, y, z).toFixed(4)}`;
        }
    }

    let vfScale = 0.4;
    let arrowArgs = {
        radiusTop: vfScale / 60,
        radiusBottom: vfScale / 150,
        heightTop: vfScale / 16,
        heightIncludesHead: true,
        height: vfScale / 3,
    };

    const arrGeo = new ArrowBufferGeometry(arrowArgs);

    const plusMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });
    const targetMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });
    const constraintMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });
    const projMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.8,
    });

    const boxes = new THREE.Object3D();
    // boxes.add(new THREE.Mesh(undefined, plusMaterial)); // pos boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // pos edges
    // boxes.add(new THREE.Mesh(undefined, minusMaterial)); // neg boxes
    // boxes.add(new THREE.LineSegments(undefined, whiteLineMaterial)); // neg edges

    scene.add(boxes);

    let boxesVisible = $state(false);
    let projVisible = $state(false);
    let gradfVisible = $state(true);
    let gradgVisible = $state(true);
    let clampDown = $state(false);

    $effect(() => {
        [gradfVisible, gradgVisible, projVisible];
        for (const b of boxes.children) {
            b.children[0].visible = gradfVisible;
            b.children[1].visible = gradgVisible;
            b.children[2].visible = projVisible;
        }
        render();
    });

    $effect(() => {
        boxes.visible = boxesVisible;
        render();
    });

    let minOrMax = $state(-1);

    let nBoxes = $state(5);
    let boxing = false;

    let x0 = $derived(math.parse(currentSurface.params.a).evaluate());
    let x1 = $derived(math.parse(currentSurface.params.b).evaluate());
    let y0 = $derived(math.parse(currentSurface.params.c).evaluate());
    let y1 = $derived(math.parse(currentSurface.params.d).evaluate());
    let z0 = $derived(math.parse(currentSurface.params.e).evaluate());
    let z1 = $derived(math.parse(currentSurface.params.f).evaluate());
    let g = $derived(
        mathToJSFunction(currentSurface.params.g, ['x', 'y', 'z']),
    );
    let gx = $derived(
        mathToJSFunction(
            math.derivative(currentSurface.params.g, 'x').toString(),
            ['x', 'y', 'z'],
        ),
    );
    let gy = $derived(
        mathToJSFunction(
            math.derivative(currentSurface.params.g, 'y').toString(),
            ['x', 'y', 'z'],
        ),
    );
    let gz = $derived(
        mathToJSFunction(
            math.derivative(currentSurface.params.g, 'z').toString(),
            ['x', 'y', 'z'],
        ),
    );

    let pts = $derived(
        sampleImplicitSurface(
            g,
            [
                [x0, x1],
                [y0, y1],
                [z0, z1],
            ],
            nBoxes,
            nBoxes,
            nBoxes,
        ),
    );

    $inspect(pts);

    const sphereGeo = new THREE.SphereGeometry(0.01, 14, 14);

    $effect(() => {
        untrack(() => {
            for (let index = boxes.children.length - 1; index >= 0; index--) {
                const element = boxes.children[index];
                element.children[0].geometry?.dispose();
                element.children[2].geometry?.dispose();
                boxes.remove(element);
            }
        });
        for (const p of pts) {
            const box = new THREE.Mesh(sphereGeo, plusMaterial);
            const [x, y, z] = p;
            const [Fx, Fy, Fz] = F(x, y, z);
            const [Gx, Gy, Gz] = [gx(x, y, z), gy(x, y, z), gz(x, y, z)];
            const c =
                (Fx * Gx + Fy * Gy + Fz * Gz) / (Gx * Gx + Gy * Gy + Gz * Gz);
            const [px, py, pz] = [Fx - c * Gx, Fy - c * Gy, Fz - c * Gz];
            box.position.set(...p);
            const arr = new THREE.Mesh(
                new ArrowBufferGeometry({
                    ...arrowArgs,
                    height:
                        (Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz) * vfScale) / 7,
                }),
                targetMaterial,
            );
            arr.lookAt(Fx, Fy, Fz);
            box.add(arr);
            const arr2 = new THREE.Mesh(arrGeo, constraintMaterial);
            arr2.lookAt(Gx, Gy, Gz);
            box.add(arr2);
            const arr3 = new THREE.Mesh(
                new ArrowBufferGeometry({
                    ...arrowArgs,
                    height:
                        (Math.sqrt(px * px + py * py + pz * pz) * vfScale) / 7,
                }),
                projMaterial,
            );
            arr3.lookAt(px, py, pz);
            box.add(arr3);
            boxes.add(box);
            untrack(() => {
                arr.visible = gradfVisible;
                arr2.visible = gradgVisible;
                arr3.visible = projVisible;
            });
        }
        console.log('effecttt', boxes);
        render();
    });

    $effect(() => {
        // console.log('demobj maintenance');
        if (currentSurface)
            untrack(() => {
                demoObjects[0] = currentSurface;
                demoObjects.length = 1;
                // filterBang(
                //     (o) => o === currentField || o === currentSurface,
                //     demoObjects,
                // );
                // if (demoObjects.findIndex((o) => o === currentField) < 0)
                //     demoObjects.push(currentField);
                // if (demoObjects.findIndex((o) => o === currentSurface) < 0)
                //     demoObjects.push(currentSurface);
            });
    });

    let desideratumString = $state('x^2 + y^2 + z^2');
    let f = $derived(mathToJSFunction(desideratumString, ['x', 'y', 'z']));
    const F = $derived.by(() => {
        const fx = mathToJSFunction(
            math.derivative(desideratumString, 'x').toString(),
            ['x', 'y', 'z'],
        );
        const fy = mathToJSFunction(
            math.derivative(desideratumString, 'y').toString(),
            ['x', 'y', 'z'],
        );
        const fz = mathToJSFunction(
            math.derivative(desideratumString, 'z').toString(),
            ['x', 'y', 'z'],
        );
        return (x, y, z) => [
            minOrMax * fx(x, y, z),
            minOrMax * fy(x, y, z),
            minOrMax * fz(x, y, z),
        ];
    });
    let targetInfo = $state('');

    let req = $state();

    function go() {
        const xMin = math.evaluate(currentSurface.params.a);
        const xMax = math.evaluate(currentSurface.params.b);
        const yMin = math.evaluate(currentSurface.params.c);
        const yMax = math.evaluate(currentSurface.params.d);
        const zMin = math.evaluate(currentSurface.params.e);
        const zMax = math.evaluate(currentSurface.params.f);

        boxes.children.forEach((b) => {
            let [px, py, pz] = evolveFlowOnLevel(
                F,
                g,
                [b.position.x, b.position.y, b.position.z],
                0.002,
            );

            const A = math.evaluate(currentSurface.params.a);

            if (clampDown) {
                px = clamp(xMin, px, xMax);
                py = clamp(yMin, py, yMax);
                pz = clamp(zMin, pz, zMax);
            }

            b.position.set(px, py, pz);
            const [arr, arr2, arr3] = b.children;
            const [Fx, Fy, Fz] = F(px, py, pz);
            const Gx = gx(px, py, pz);
            const Gy = gy(px, py, pz);
            const Gz = gz(px, py, pz);

            const c =
                (Fx * Gx + Fy * Gy + Fz * Gz) / (Gx * Gx + Gy * Gy + Gz * Gz);

            const Px = Fx - c * Gx;
            const Py = Fy - c * Gy;
            const Pz = Fz - c * Gz;

            arr.geometry.adjustHeight(
                (Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz) * vfScale) / 7,
            );
            arr3.geometry.adjustHeight(
                (Math.sqrt(Px * Px + Py * Py + Pz * Pz) * vfScale) / 7,
            );

            arr.lookAt(px + Fx, py + Fy, pz + Fz);
            arr2.lookAt(px + Gx, py + Gy, pz + Gz);
            arr3.lookAt(px + Fx - c * Gx, py + Fy - c * Gy, pz + Fz - c * Gz);
        });
        render();
        if (req) cancelAnimationFrame(req);
        req = requestAnimationFrame(go);
    }

    /**
     *  "Check parameters"
     * */
    function chickenParms(val, params) {
        let valuation;
        try {
            const { a, b, c, d, e, f } = params;

            const parsedVal = math.parse(val);

            valuation = Number.isFinite(
                parsedVal.evaluate({
                    x: (a + b) / 2,
                    y: (c + d) / 2,
                    z: (e + f) / 2,
                }),
            );
        } catch (e) {
            console.error('Parse error in expression', val, e);
            return false;
        }
        return valuation;
    }
</script>

<div class="unselectable">
    <h3>Constrained Optimization</h3>

    <div>
        <p>
            We seek to <button
                onclick={() => {
                    minOrMax *= -1;
                }}
            >
                {#if minOrMax > 0}maximize{:else}minimize{/if}
            </button>
            the <strong>desideratum</strong>
        </p>
    </div>
    <div class="container">
        <M s={'f(x,y,z) = \\,'} /><InputChecker
            value={desideratumString}
            checker={chickenParms}
            name={'target'}
            params={currentSurface.params}
            cleared={(val) => {
                desideratumString = val;
            }}
        />
    </div>
    <p>subject to the constraint</p>
    <div class="container">
        <M s={'g(x,y,z) = \\,'} />
        <InputChecker
            value={currentSurface.params.g}
            checker={chickenParms}
            name={'target'}
            params={currentSurface.params}
            cleared={(val) => {
                currentSurface.params.g = val;
            }}
        /><M s={'\\,= 0'} />
    </div>
    <hr />
    <div>
        {#if currentSurface.selected && selectedPoint?.visible}
            <M s={targetInfo} display />
        {:else}
            <p style="font-size: smaller">
                Double-click the constraint surface, then hold <kbd>Shift</kbd> to
                select a point and display the target value.
            </p>
        {/if}
    </div>
    <div class="container around">
        <span>Show swarm</span>
        <label class="switch box box-2">
            <input type="checkbox" bind:checked={boxesVisible} />
            <span class="slider round"></span>
        </label>
    </div>

    {#if boxesVisible}
        <div class="container between">
            <label>
                <span><M s={'n = \\;'} /></span>
                <input
                    type="range"
                    name=""
                    id=""
                    min="1"
                    bind:value={nBoxes}
                    step="1"
                    max="20"
                />
            </label>

            <PlayButtons
                play={go}
                pause={() => {
                    cancelAnimationFrame(req);
                    req = undefined;
                }}
                rew={() => {
                    // Stupidest way of triggering an effect
                    nBoxes = nBoxes + 1;
                    nBoxes = nBoxes - 1;
                }}
                playMode="none"
            />
        </div>

        <div class="container evenly unselectable">
            <label>
                <span style="color: #aaaaff">
                    <M
                        s={minOrMax > 0
                            ? '\\hphantom{-}\\nabla f'
                            : '-\\nabla f'}
                    /></span
                >
                <input type="checkbox" bind:checked={gradfVisible} />
            </label>
            <label>
                <span style="color: #ffaaaa"> <M s={'\\nabla g'} /> </span>

                <input type="checkbox" bind:checked={gradgVisible} />
            </label>
            <label>
                <span style="color: #aaffaa"> proj </span>
                <input type="checkbox" bind:checked={projVisible} />
            </label>
            <label>
                <span> clamp </span>
                <input type="checkbox" bind:checked={clampDown} />
            </label>
        </div>
    {/if}
</div>

<style>
    /* .demos-obj-select {
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
    } */
    /* .blue-button {
        background-color: red;
    } */
    .container {
        display: flex;
        justify-content: center;
    }
    .container.between {
        justify-content: space-between;
    }
    .container.evenly {
        justify-content: space-evenly;
    }
    .container.around {
        justify-content: space-around;
    }
    .unselectable {
        user-select: none;
        -webkit-user-select: none; /* for Safari */
        -moz-user-select: none; /* for older Firefox */
        -ms-user-select: none; /* for older IE/Edge */
    }
</style>
