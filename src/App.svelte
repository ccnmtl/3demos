<script>
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
    import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
    import { v4 as uuidv4 } from "uuid";
    // import katex from "katex";

    // import components
    import M from "./M.svelte";
    import Box from "./Box.svelte";
    import ParSurf from "./ParSurf.svelte";
    import Level from "./Level.svelte";
    import Curve from "./Curve.svelte";
    import Field from "./Field.svelte";
    import Function from "./Function.svelte";
    import Vector from "./Vector.svelte";
    import Settings from "./Settings.svelte";
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import Stats from "stats.js";

    import Linear from "./Linear.svelte";
    import Chapter from "./Chapter.svelte";
    import Intro from "./Intro.svelte";
    import PollRoom from "./PollRoom.svelte";

    import {
        drawAxes,
        drawGrid,
        labelAxes,
        makeHSLColor,
    } from "./utils";

    let debug = false,
        stats;
    // stats window for debugging
    if (debug) {
        stats = new Stats();
        stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(stats.dom);
    }

    let flipInfo = false,
        shadeUp = false;
    let scaleAnimation = false,
        scaleUpdate;

    let canvas;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.001,
        1000
    );

    const camera2 = new THREE.OrthographicCamera(
        -2,
        2,
        (window.innerHeight / window.innerWidth) * 2,
        (-window.innerHeight / window.innerWidth) * 2,
        0,
        100 * 2
    );

    let orthoCamera = false;

    //    const camera = new THREE.O(75, canvas.clientWidth/canvas.clientHeight, 0.1, 1000);

    let gridMax = 1,
        gridStep = 1 / 5;
    const pi = Math.PI;

    // Make z the default up
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    camera.position.x = (gridMax * 2) / 2;
    camera.position.y = (-gridMax * 3) / 2;
    camera.position.z = (gridMax * 4.5) / 2;
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    camera2.position.x = (gridMax * 2) / 2;
    camera2.position.y = (-gridMax * 3) / 2;
    camera2.position.z = (gridMax * 4.5) / 2;
    camera2.up.set(0, 0, 1);
    camera2.lookAt(0, 0, 0);

    $: currentCamera = orthoCamera ? camera2 : camera;

    scene.background = new THREE.Color(0xddddef);
    // for greenscreen
    // scene.background = new THREE.Color(0x88ff88);

    // soft white light
    scene.add(new THREE.AmbientLight(0xa0a0a0));

    //something to make shiny things shine - a chandelier
    const chandelier = new THREE.Object3D();
    const candles = 3;
    for (let i = 0; i < candles; i++) {
        for (let j = 0; j < 2; j++) {
            const light = new THREE.PointLight(0xffffff, 0.5, 1000);
            light.position.set(
                20 * Math.cos((i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2),
                20 * Math.sin((i * 2 * pi) / candles + (Math.pow(-1, j) * 1) / 2),
                Math.pow(-1, j) * 10
            );
            chandelier.add(light);
        }
    }
    scene.add(chandelier);

    let controls, controls2;

    // const geometry = new THREE.BoxGeometry();
    // const material = new THREE.MeshBasicMaterial({ color });
    // const cube = new THREE.Mesh(geometry, material);
    let renderer;
    // scene.add(cube);

    // Grid

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x551122,
        transparent: true,
        opacity: 1,
        depthTest: true,
    });

    let gridMeshes = drawGrid({ lineMaterial });
    gridMeshes.renderDepth = -1;
    scene.add(gridMeshes);

    // Axes
    const axesMaterial = new THREE.MeshLambertMaterial({ color: 0x320032 });
    let axesHolder = drawAxes({ gridMax, gridStep, axesMaterial });
    scene.add(axesHolder);

    // Fonts
    const fontLoader = new FontLoader();
    let [axesText] = labelAxes({
        scene,
        render: requestFrameIfNotRequested,
    }, fontLoader, TextGeometry);

    // from https://threejsfundamentals.org
    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    let myReq,
        last,
        frameRequested = false,
        animating = false;

    function requestFrameIfNotRequested() {
        if (!frameRequested) {
            frameRequested = true;
            myReq = requestAnimationFrame(render);
        }
    }

    function animateIfNotAnimating() {
        if (!animating) {
            cancelAnimationFrame(myReq);
            frameRequested = true;
            myReq = requestAnimationFrame(animate);
            animating = true;
        }
    }

    const animate = (time = 0) => {
        if (debug) {
            stats.begin();
        }

        if (!last) last = time;

        const dt = (time - last) / 1000;
        last = time;

        for (const b of boxes.filter((b) => b.animation)) {
            b.update(dt);
        }

        if (scaleAnimation) {
            scaleUpdate(dt);
        }
        // camera.position.y = (camera.position.y + 0.01) % 4;
        // camera.position.x = Math.sin(camera.position.y * (Math.PI / 2));

        controls.update();
        //   console.log(camera.position.x)
        renderer.render(scene, camera);
        if (debug) {
            stats.end();
        }
        if (scaleAnimation || boxes.some((b) => b.animation)) {
            myReq = requestAnimationFrame(animate);
            frameRequested = true;
            animating = true;
        } else {
            cancelAnimationFrame(myReq);
            frameRequested = false;
            animating = false;
            last = false;
            console.log("Anime stopped.");
        }
    };

    function render() {
        frameRequested = false;

        for (let index = 0; index < axesText.length; index++) {
            const element = axesText[index];
            element.lookAt(camera.position);
        }

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera2.top = canvas.clientHeight / 2;
            camera2.bottom = canvas.clientHeight / -2;
            camera2.right = canvas.clientWidth / 2;
            camera2.left = canvas.clientWidth / -2;
            camera.updateProjectionMatrix();
            camera2.updateProjectionMatrix();
        }

        controls.update();
        if (orthoCamera) {
            renderer.render(scene, camera2);
        } else {
            renderer.render(scene, camera);
        }
    }

    const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };

    const createScene = (el) => {
        renderer = new THREE.WebGLRenderer({ antialias: true, canvas: el });
        controls = new OrbitControls(camera, canvas);
        controls2 = new OrbitControls(camera2, canvas);

        controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
        controls.dampingFactor = 0.05;

        controls.screenSpacePanning = false;

        // controls.minDistance = 100;
        // controls.maxDistance = 500;

        controls.maxPolarAngle = Math.PI;

        controls.addEventListener("change", requestFrameIfNotRequested);
        controls2.addEventListener("change", requestFrameIfNotRequested);

        resize();
        requestFrameIfNotRequested();
    };

    let boxes = [];

    const upBox = (thing = "box", params = null) => {
        boxes = [...boxes, { id: uuidv4(), kind: thing, params: params }];
    };

    const downBox = (id) => {
        boxes = boxes.filter((b) => b.id !== id);
    };

    const blowUpBoxes = () => {
        boxes = [];
    };

    window.addEventListener("resize", () => {
        resize();
        requestFrameIfNotRequested();
    });

    function makeQueryStringObject() {
        const flattenedBoxes = {
            currentChapter,
            shadeUp,
            flipInfo,
            grid: gridMeshes.visible,
        };
        boxes.forEach((box, index) => {
            const prefix = `obj${index}_`;
            flattenedBoxes[prefix + "kind"] = box.kind;
            if (box.params) {
                for (const [key, value] of Object.entries(box.params)) {
                    flattenedBoxes[prefix + "params_" + key] = value;
                }
            }
        });
        const urlParams = new URLSearchParams(flattenedBoxes);
        console.log("boxes", boxes, "paramstring: ", urlParams.toString());
        window.location.search = urlParams.toString();
    }

    onMount(() => {
        createScene(canvas);
        const urlParams = new URLSearchParams(location.search);
        // console.log(urlParams.keys() ? true : false);
        if (urlParams.keys()) {
            const boxHolder = {};
            urlParams.forEach((val, key) => {
                // console.log(key, val);
                // This is bad and stupid, and hopefully it will be done better.
                // make a viewStatus object, maybe?
                if (key === "currentChapter") {
                    currentChapter = val;
                }
                if (key === "shadeUp") {
                    shadeUp = val;
                }
                if (key === "grid") {
                    gridMeshes.visible = val === "true";
                    // console.log(gridMeshes, "grid", val);
                }
                if (key === "flipInfo") {
                    flipInfo = val;
                }
                if (key.slice(0, 3) === "obj") {
                    // console.log(key.split("_"));
                    const keyParts = key.split("_");
                    if (keyParts[1] === "kind") {
                        boxHolder[keyParts[0]] = { kind: val, params: {} };
                    } else {
                        boxHolder[keyParts[0]].params[keyParts[2]] = val;
                    }
                }
            });

            for (const val of Object.values(boxHolder)) {
                upBox(val.kind, val.params);
            }
        }
    });

    // $: cube.material.color = new THREE.Color(color);

    // const changeColor = () => {
    //   cube.material.color = new THREE.Color(color);
    // };

    // changeColor(color);

    let currentChapter = "Intro";

    const router = {};
    const pollRoom = location.pathname.match(/\/polls\/\d+\//);
    if (pollRoom) {
        router.poll = true;
    }
</script>

<canvas bind:this={canvas} id="c" />

<div class="info" class:flipInfo>
    <div class="info-inner">
        <div class="chapterBox">
            {#if router.poll}
                <PollRoom />
            {:else}
                <div class="collapse-info" class:hidden={shadeUp}>
                    <div class="object-box-title">
                        <div class="dropdown">
                            <button class="dropbtn titlefont">3Demos.xyz (βeta)</button>

                            <div class="dropdown-content">
                                <span on:click={() => (currentChapter = "Intro")} hidden={false}
                                    >Intro</span>
                                <span on:click={() => (currentChapter = "Chapter")}
                                    >Arc Length & Curvature</span>
                                <span on:click={() => (currentChapter = "Linear")}
                                    >Linearization</span>
                            </div>
                        </div>
                        <span
                            on:click={() => {
                            flipInfo = !flipInfo;
                            }}><i class="fa fa-sliders" /></span>
                    </div>

                    {#if currentChapter == "Chapter"}
                        <Chapter bind:boxes />
                    {:else if currentChapter == "Linear"}
                        <Linear bind:boxes />
                    {:else if currentChapter === "Intro"}
                        <Intro />
                    {/if}
                </div>
                <div
                    class="raise-lower-bar"
                    on:click={() => {
                    shadeUp = !shadeUp;
                    }}
                    >
                    <span class="raise-lower-button" />
                </div>
            {/if}
        </div>

        <div class="objectBoxOuter">
            <div class="collapse-info" class:hidden={shadeUp}>
                <div class="object-box-title">
                    <span>3D Objects</span>
                    <span
                        on:click={() => {
                        flipInfo = !flipInfo;
                        }}><i class="fa fa-book" /></span>
                </div>
                <!-- <input type="number" bind:value={color} /> -->

                <!-- <button on:click={blowUpBoxes}> Clear all </button> -->

                <br />
                <div class="dropdown">
                    <button class="dropbtn"><i class="fa fa-plus" /></button>
                    <div class="dropdown-content">
                        <span on:click={() =>
                            upBox("vector", {
                            a: "0.2",
                            b: "-0.3",
                            c: "0",
                            x: "0",
                            y: "0",
                            z: "0",
                            show: true,
                            })}>
                            vector <M>\mathbf v = \langle a, b, c \rangle</M>
                        </span>

                        <span on:click={() =>
                            upBox("curve", {
                            a: "0",
                            b: "2*pi",
                            x: "cos(t)",
                            y: "sin(t)",
                            z: `cos(${Math.ceil(10 * Math.random()).toString()}*t)`,
                            tau: 0,
                            color: `#${makeHSLColor(Math.random()).getHexString()}`,
                            })}>space curve <M>\mathbf r(t)</M></span>
                        <span on:click={() =>
                            upBox("graph", {
                            a: "-2",
                            b: "2",
                            c: "-2",
                            d: "2",
                            z: `cos(${Math.ceil(
                            3 * Math.random()
                            ).toString()}*x + ${Math.ceil(
                            2 * Math.random()
                            ).toString()}*y)/(1 + x^2 + y^2)`,
                            tau: 0,
                            // color: "#3232ff",
                            })}>graph <M>z = f(x,y)</M></span>
                        <span on:click={() =>
                            upBox("level", {
                            g: "x^2 + 2 y^2 - z^2",
                            k: "1",
                            a: "-2",
                            b: "2",
                            c: "-2",
                            d: "2",
                            e: "-2",
                            f: "2",
                            })}>level surface <M>g(x,y,z) = k</M></span>
                        <span on:click={() =>
                            upBox("parsurf", {
                            a: "0",
                            b: "2*pi",
                            c: "0",
                            d: "2*pi",
                            x: "cos(u)*(1 + sin(v)/3)",
                            y: "sin(u)*(1 + sin(v)/3)",
                            z: "cos(v)/3",
                            })}>parametric surface <M>\mathbf r(u,v)</M></span>
                        <span on:click={() =>
                            upBox("field", {
                            p: "x",
                            q: "y",
                            r: "-z",
                            nVec: 6,
                            })}>vector field<M>\mathbf F(x,y,z)</M></span>
                        <span on:click={() => upBox("box")}>random box</span>
                    </div>
                </div>
                <button class="btn" on:click={blowUpBoxes}>
                    <i class="fa fa-trash" />
                </button>

                <div class="objectBoxInner">
                    <!-- <input type="number" bind:value={color} on:change="{changeColor}"> -->
                    {#each boxes as b, i (b.id)}
                        <div
                            transition:slide={{ delay: 0, duration: 300, easing: quintOut }}
                            >
                            <!-- <p>Number {b.id}.</p> -->
                            {#if b.kind === "parsurf"}
                                <ParSurf
                                    {scene}
                                    render={requestFrameIfNotRequested}
                                    params={b.params}
                                    onClose={() => downBox(b.id)}
                                    bind:update={b.update}
                                    bind:animation={b.animation}
                                    />
                                {:else if b.kind === "graph"}
                                    <Function
                                        {scene}
                                        camera={currentCamera}
                                        {controls}
                                        render={requestFrameIfNotRequested}
                                        params={b.params}
                                        onClose={() => downBox(b.id)}
                                        bind:shadeUp
                                        bind:update={b.update}
                                        bind:animation={b.animation}
                                        on:animate={animateIfNotAnimating}
                                        {gridStep}
                                        />
                                    {:else if b.kind === "level"}
                                        <Level
                                            {scene}
                                            camera={currentCamera}
                                            {controls}
                                            render={requestFrameIfNotRequested}
                                            onClose={() => downBox(b.id)}
                                            params={b.params}
                                            bind:shadeUp
                                            bind:update={b.update}
                                            bind:animation={b.animation}
                                            on:animate={animateIfNotAnimating}
                                            {gridStep}
                                            />
                                        {:else if b.kind === "box"}
                                            <Box
                                                {scene}
                                                render={requestFrameIfNotRequested}
                                                onClose={() => downBox(b.id)}
                                                bind:update={b.update}
                                                bind:animation={b.animation}
                                                on:animate={animateIfNotAnimating}
                                                />
                                            {:else if b.kind === "curve"}
                                                <Curve
                                                    {scene}
                                                    render={requestFrameIfNotRequested}
                                                    onClose={() => downBox(b.id)}
                                                    params={b.params}
                                                    bind:update={b.update}
                                                    bind:animation={b.animation}
                                                    on:animate={animateIfNotAnimating}
                                                    {gridStep}
                                                    />
                                                {:else if b.kind === "field"}
                                                    <Field
                                                        {scene}
                                                        render={requestFrameIfNotRequested}
                                                        onClose={() => downBox(b.id)}
                                                        bind:update={b.update}
                                                        bind:animation={b.animation}
                                                        on:animate={animateIfNotAnimating}
                                                        params={b.params}
                                                        {gridStep}
                                                        {gridMax}
                                                        />
                                                    {:else if b.kind === "vector"}
                                                        <Vector
                                                            {scene}
                                                            render={requestFrameIfNotRequested}
                                                            onClose={() => downBox(b.id)}
                                                            params={b.params}
                                                            {gridStep}
                                                            {gridMax}
                                                            />
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
            </div>
            <div
                class="raise-lower-bar"
                on:click={() => {
                shadeUp = !shadeUp;
                }}
                >
                <span class="raise-lower-button" />
            </div>
        </div>
    </div>
</div>

<div class="settings-tray">
    <Settings
        {scene}
        {camera}
        {controls}
        {controls2}
        bind:gridMax
        bind:gridStep
        {gridMeshes}
        {axesText}
        {axesHolder}
        {lineMaterial}
        {axesMaterial}
        encode={makeQueryStringObject}
        render={requestFrameIfNotRequested}
        bind:update={scaleUpdate}
        bind:animation={scaleAnimation}
        bind:orthoCamera
        on:animate={animateIfNotAnimating}
        />
</div>

<style>
    canvas {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin: 0;
    }

    .info {
        /* display: block; */
        position: absolute;
        left: 3%;
        top: 0%;
        width: clamp(23ch, 50%, 75ch);
        background-color: transparent;
        perspective: 1000px; /* Remove this if you don't want the 3D effect */
        }

         .info-inner {
             position: relative;
             width: 100%;
             height: 100%;
             /* text-align: center; */
             transition: transform 0.8s, opacity 0.8s;
             transform-style: preserve-3d;
         }

         .info.flipInfo .info-inner {
             transform: rotateY(180deg);
         }

         .chapterBox,
         .objectBoxOuter {
             position: absolute;
             width: 100%;
             height: fit-content;
             background-color: rgba(100, 100, 100, 0.5);
             color: white;
             /* overflow-x: hidden; */
             border-radius: 0.5em;
             border-top-left-radius: 0rem;
             border-top-right-radius: 0rem;
             /* box-shadow: 1 1 black, 2 2 yellow; */
             border: 1px solid black;
             padding: 5px;
             /* max-height: 94%; */
             transition: opacity 0.8s;
             box-sizing: border-box;

             -webkit-backface-visibility: hidden;
             backface-visibility: hidden;
         }

         .chapterBox {
             text-align: unset;
         }

         .objectBoxOuter {
             transform: rotateY(180deg);
             opacity: 0;
         }

         .info.flipInfo .chapterBox {
             opacity: 0;
         }

         .info.flipInfo .objectBoxOuter {
             opacity: 1;
         }

         .objectBoxInner {
             display: flex;
             flex-direction: column-reverse;
             max-height: 75vh;
             overflow-y: auto;
             gap: 0.25em;
         }

         .dropbtn,
         .btn {
             background-color: #aaa;
             color: white;
             padding: 3px 10px;
             font-size: 1em;
             border: none;
         }

         .dropdown {
             position: relative;
             display: inline-block;
         }

         .dropdown-content {
             display: none;
             position: absolute;
             background-color: #f1f1f1;
             min-width: 160px;
             box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
             z-index: 1;
         }

         /* .dropdown-content a {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
} */
         .dropdown-content span {
             color: black;
             padding: 12px 16px;
             text-decoration: none;
             display: block;
         }

         /* .dropdown-content a:hover {background-color: #ddd;} */
         .dropdown-content span:hover {
             background-color: #f77;
         }

         .dropdown:hover .dropdown-content {
             display: block;
         }

         .dropdown:hover .dropbtn {
             background-color: #3e8e41;
         }

         .object-box-title {
             display: flex;
             font-size: 1.5em;
             justify-content: space-between;
         }

         :global(.boxItem) {
             flex: auto;
             /* background-color: yellow; */
             background-color: rgba(33, 33, 33, 0.8);
             border: 1px solid black;
             border-radius: 1rem;
             /* margin: 5px; */
             /* padding-left: 5%; */
         }

         :global(.hidden) {
             display: none;
         }

         .settings-tray {
             position: fixed;
             left: 3px;
             bottom: 0;
             display: flex;
             justify-content: flex-start;
             width: clamp(23ch, 30%, 45ch);
         }
         .raise-lower-bar {
             height: 0.4rem;
             display: grid;
             place-items: center;
         }

         .raise-lower-button {
             height: 0.2rem;
             background-color: rgba(33, 33, 33, 0.8);
             width: clamp(50px, 20%, 200px);
         }

         .raise-lower-bar:hover > .raise-lower-button {
             background-color: white;
         }
         .raise-lower-bar:active > .raise-lower-button {
             background-color: blue;
         }

         .titlefont {
             /* font-size: 1.5em; */
             font-family: Cambria, Cochin, Georgia, Times, "Times New Roman", serif;
         }

         :global(article) {
             color: white;
             background-color: rgba(0.5, 0.5, 0.5, 0.3);
             padding: 5px;
             font-family: Cambria, Cochin, Georgia, Times, "Times New Roman", serif;
         }
</style>