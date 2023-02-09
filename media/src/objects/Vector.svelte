<script>
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { create, all } from "mathjs";

    import M from "../M.svelte";
    import ObjHeader from "../ObjHeader.svelte";
    import {ArrowBufferGeometry} from "../utils.js";
    import ObjectParamInput from '../form-components/ObjectParamInput.svelte';

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

    let paramErrors = {
        a: false,
        b: false,
        c: false,
        x: false,
        y: false,
        z: false
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
        const [pA, pB, pC, pX, pY, pZ] = math.parse([a, b, c, x, y, z]);
        let A, B, C, X, Y, Z;

        try {
            A = pA.evaluate();
            paramErrors.a = false;
        } catch (e) {
            paramErrors.a = true;
            return;
        }

        try {
            B = pB.evaluate();
            paramErrors.b = false;
        } catch (e) {
            paramErrors.b = true;
            return;
        }

        try {
            C = pC.evaluate();
            paramErrors.c = false;
        } catch (e) {
            paramErrors.c = true;
            return;
        }

        try {
            X = pX.evaluate();
            paramErrors.x = false;
        } catch (e) {
            paramErrors.x = true;
            return;
        }

        try {
            Y = pY.evaluate();
            paramErrors.y = false;
        } catch (e) {
            paramErrors.y = true;
            return;
        }

        try {
            Z = pZ.evaluate();
            paramErrors.z = false;
        } catch (e) {
            paramErrors.z = true;
            return;
        }


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
            <ObjectParamInput
                error={paramErrors.a}
                initialValue={params.a}
                onChange={(newVal) => {
                    // Set the new param in Vector once blur has happened
                    params.a = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1"><M size="sm">b =</M></span>
            <ObjectParamInput
                error={paramErrors.b}
                initialValue={params.b}
                onChange={(newVal) => {
                    params.b = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1"><M size="sm">c =</M></span>
            <ObjectParamInput
                error={paramErrors.c}
                initialValue={params.c}
                onChange={(newVal) => {
                    params.c = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            Plot at position <M size="sm">(p_1, p_2, p_3)</M>:

            <span class="box-1"><M size="sm">p_1 =</M></span>
            <ObjectParamInput
                error={paramErrors.x}
                initialValue={params.x}
                onChange={(newVal) => {
                    params.x = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1"><M size="sm">p_2 =</M></span>
            <ObjectParamInput
                error={paramErrors.y}
                initialValue={params.y}
                onChange={(newVal) => {
                    params.y = newVal;
                    onUpdate();
                    updateCurve();
                }} />

            <span class="box-1"><M size="sm">p_3 =</M></span>
            <ObjectParamInput
                error={paramErrors.z}
                initialValue={params.z}
                onChange={(newVal) => {
                    params.z = newVal;
                    onUpdate();
                    updateCurve();
                }} />

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
