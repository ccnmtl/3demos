<script>
    import { onMount, onDestroy } from "svelte";
    import M from "../M.svelte";
    import ObjHeader from "../ObjHeader.svelte";

    import * as THREE from "three";

    import { create, all } from "mathjs";

    import {
        ArrowBufferGeometry
    } from "../utils.js";

    const config = {};
    const math = create(all, config);

    // export let paramString;

    export let params = {
        a: "-1",
        b: "1",
        c: "2",
        x: "0",
        y: "0",
        z: "0",
        nX: 30,
        show: true,
    };

    if (!params.color) {
        params.color = "#FF0000";
    }

    let oldParams = Object.assign({}, params);

    if (!('show' in params)) {
        params.show = true;
    }

    export let scene;
    export let render = () => {};
    export let onClose = () => {};
    export let onUpdate = () => {};
    export let gridStep;

    let hidden = false;

    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: params.color,
        shininess: 80,
        side: THREE.DoubleSide,
        vertexColors: false,
        transparent: false,
        opacity: 0.7,
    });
    const vfScale = gridStep * 5;
    const arrowArgs = {
        radiusTop: vfScale / 24,
        radiusBottom: vfScale / 75,
        heightTop: vfScale / 8,
    };

    let arrow;

    const updateCurve = function() {
        const { a, b, c, x, y, z } = params;

        const [A, B, C, X, Y, Z] = math
              .parse([a, b, c, x, y, z])
              .map((item) => item.evaluate());

        const v = new THREE.Vector3(A, B, C);

        let geometry = new ArrowBufferGeometry({
            ...arrowArgs,
            height: v.length(),
        });

        if (arrow) {
            arrow.geometry.dispose();
            arrow.geometry = geometry;
        } else {
            arrow = new THREE.Mesh(geometry, arrowMaterial);
            scene.add(arrow);
        }
        arrow.position.set(X, Y, Z);

        arrow.lookAt(v.add(arrow.position));

        render();
    };

    const updateColor = function() {
        arrowMaterial.color.set(params.color);
        render();
    }

    // call updateCurve() when params change
    $: {
        if (oldParams.color !== params.color) {
            updateColor();
            oldParams.color = params.color;
        }

        if (
            oldParams.a !== params.a
                || oldParams.b !== params.b
                || oldParams.a !== params.a
                || oldParams.x !== params.x
                || oldParams.y !== params.y
        ) {
            updateCurve();
            oldParams.a = params.a;
            oldParams.b = params.b;
            oldParams.x = params.x;
            oldParams.y = params.y;
            oldParams.z = params.z;
        }
    }
    // Exercises
    //

    onMount(updateCurve);
    onDestroy(() => {
        if (arrow) {
            arrow.geometry && arrow.geometry.dispose();
            arrow.material && arrow.material.dispose();
        }
        scene.remove(arrow);
        render();
    });
</script>

<div class="boxItem" hidden={!params.show}>
    <div class="box-title">
        <span><strong>Vector</strong> <M size="sm">\langle a, b, c \rangle</M></span>
        <ObjHeader
            bind:hidden={hidden}
            bind:onClose={onClose}
        />
    </div>
    <div hidden={hidden}>
        <div class="container">
            <span class="box-1"><M size="sm">a =</M></span>
            <input
                type="text"
                bind:value={params.a}
                on:change={() => {
            onUpdate()
            updateCurve()
            }}
                class="box box-2"
                />
            <span class="box-1"><M size="sm">b =</M></span>
            <input
                type="text"
                bind:value={params.b}
                on:change={() => {
            onUpdate()
            updateCurve()
            }}
                class="box box-2"
                />
            <span class="box-1"><M size="sm">c =</M></span>
            <input
                type="text"
                bind:value={params.c}
                on:change={() => {
            onUpdate()
            updateCurve()
            }}
                class="box box-2"
                />

            Plot at position <M size="sm">(p_1, p_2, p_3)</M>:

            <span class="box-1"><M size="sm">p_1 =</M></span>
            <input
                type="text"
                bind:value={params.x}
                on:change={() => {
            onUpdate()
            updateCurve()
            }}
                class="box box-2"
                />

            <span class="box-1"><M size="sm">p_2 =</M></span>
            <input
                type="text"
                bind:value={params.y}
                on:change={() => {
            onUpdate()
            updateCurve()
            }}
                class="box box-2"
                />
            <span class="box-1"><M size="sm">p_3 =</M></span>
            <input
                type="text"
                bind:value={params.z}
                on:change={() => {
                    onUpdate()
                    updateCurve()
                }}
                class="box box-2"
                />
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
        </div>
    </div>
</div>
