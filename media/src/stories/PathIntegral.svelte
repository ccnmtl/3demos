<script>
    import PlayButtons from '../form-components/PlayButtons.svelte';
    import * as THREE from 'three';

    import { all, create } from 'mathjs';
    import { ParametricGeometry, gaussLegendre } from '../utils';
    import { onDestroy } from 'svelte';
    import M from '../M.svelte';

    const math = create(all, {});

    export let objects;
    export let scene;
    export let render;
    let tau = 0;
    let sau = 0;

    let raf;
    let last;

    const toDx = (time) => {
        cancelAnimationFrame(raf);
        if (!last) last = time;
        const dt = (time - last) / 10000;
        sau = Math.min(0.99, sau + dt);
        if (sau < 0.99) {
            raf = requestAnimationFrame(toDx);
        } else {
            last = undefined;
        }
    };
    const toDy = (time) => {
        cancelAnimationFrame(raf);
        if (!last) last = time;
        const dt = (time - last) / 10000;
        sau = Math.max(-0.99, sau - dt);
        if (sau > -0.99) {
            raf = requestAnimationFrame(toDy);
        } else {
            last = undefined;
        }
    };
    const toDs = (time) => {
        cancelAnimationFrame(raf);
        const sgn = -Math.sign(sau);
        if (!last) last = time;
        const dt = (sgn * (time - last)) / 10000;
        // console.log(sau, dt);
        if (sau < 0) {
            sau = Math.min(0, sau + dt);
        } else if (sau > 0) {
            sau = Math.max(0, sau + dt);
        }
        if (sau !== 0) {
            raf = requestAnimationFrame(toDs);
        } else {
            last = undefined;
        }
    };

    const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        wireframe: true,
    });
    const minusMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3232,
        shininess: 80,
        side: THREE.BackSide,
        vertexColors: false,
        transparent: true,
        opacity: 0.4,
    });

    const plusMaterial = new THREE.MeshPhongMaterial({
        color: 0x3232ff,
        shininess: 80,
        side: THREE.FrontSide,
        vertexColors: false,
        transparent: true,
        opacity: 0.4,
    });

    $: T =
        math.parse(curveData[pathChoice].r.b).evaluate() * tau +
        (1 - tau) * math.parse(curveData[pathChoice].r.a).evaluate();

    const wall = new THREE.Mesh(undefined, minusMaterial);
    const backwall = new THREE.Mesh(undefined, plusMaterial);
    wall.add(backwall);
    scene.add(wall);

    $: {
        wall.geometry.dispose();
        const a = math.parse(curveData[pathChoice].r.a).evaluate();
        wall.geometry = new ParametricGeometry(
            (u, v, vec) => {
                const x = math
                    .parse(curveData[pathChoice].r.x)
                    .evaluate({ t: a + v * (T - a) });
                const y = math
                    .parse(curveData[pathChoice].r.y)
                    .evaluate({ t: a + v * (T - a) });
                vec.set(
                    x * (1 + Math.min(0, sau)),
                    y * (1 - Math.max(0, sau)),
                    u * funcData[funcChoice].func(x, y)
                );
            },
            2,
            35
        );
        backwall.geometry = wall.geometry;
        render();

        // Compute integral numerically
        let fn;
        const x = math.parse(curveData[pathChoice].r.x);
        const y = math.parse(curveData[pathChoice].r.y);
        const xp = math.derivative(x, 't');
        const yp = math.derivative(y, 't');
        if ((diffChoice = 'ds')) {
            console.log('im in ds');
            fn = (t) =>
                funcData[funcChoice].func(
                    x.evaluate({ t }),
                    y.evaluate({ t })
                ) *
                Math.sqrt(
                    Math.pow(xp.evaluate({ t }), 2) +
                        Math.pow(yp.evaluate({ t }), 2)
                );
        }
        console.log('int', gaussLegendre(fn, a, T, 30));
    }

    const curveId = crypto.randomUUID();

    const curveData = {
        circle: {
            r: {
                x: 'cos(t)',
                y: 'sin(t)',
                a: '0',
                b: '2 pi',
            },
            tex: '\\cos t, \\sin t',
        },
        parabola: {
            r: {
                x: 't',
                y: 't^2',
                a: '-1',
                b: '2',
            },
            tex: 't, t^2',
        },
        other: {
            r: {
                x: '(1 + t/4)*cos(4*pi*t)',
                y: '2*t - sin(8*t)/2',
                a: '0',
                b: '1',
            },
            tex: '(1 + t/4)\\cos(4 \\pi t), 2t - \\sin(8 t)/2',
        },
    };

    const funcData = {
        periodic: {
            func: (x, y) => 1 + Math.sin((x + y) * 2) / 3,
            tex: '1 + \\sin(2(x+y))/3',
        },
        quadratic: {
            func: (x, y) => (x * x) / 2 + (y * y) / 2,
            tex: 'x^2/2 + y^2/2',
        },
        linear: {
            func: (x, y) => x / 10 + y / 7 + 1,
            tex: 'x/10 + y/7 + 1',
        },
    };

    const backupObjects = structuredClone(objects);

    let pathChoice = 'circle';

    let funcChoice = 'linear';

    let diffChoice = 'ds';

    onDestroy(() => {
        objects = backupObjects;
        scene.remove(wall);
    });

    $: objects = [
        ...objects.filter((k) => k.uuid !== curveId),
        {
            uuid: curveId,
            kind: 'curve',
            params: {
                x: curveData[pathChoice].r.x,
                y: curveData[pathChoice].r.y,
                z: '0',
                a: curveData[pathChoice].r.a,
                b: curveData[pathChoice].r.b,
            },
            color: '#AA1243',
        },
    ];
</script>

<div>
    <h1>Path Integrals</h1>

    <p>
        Let $C$ be a path in $\RR^n$ parametrized by $\vec r(t)$ for $a \leq t
        \leq b$.
    </p>
    <div id="path-selection" class="selectables">
        <button
            class="btn-choice"
            class:active={pathChoice === 'circle'}
            on:click={() => (pathChoice = 'circle')}>circle</button
        >
        <button
            class="btn-choice"
            class:active={pathChoice === 'parabola'}
            on:click={() => (pathChoice = 'parabola')}>parabola</button
        >
        <button
            class="btn-choice"
            class:active={pathChoice === 'other'}
            on:click={() => (pathChoice = 'other')}>other</button
        >
    </div>
    <M display>
        {`\\langle x(t), y(t) \\rangle = \\langle  ${curveData[pathChoice].tex}  \\rangle`}
    </M>
    <p>Let $f$ be a continuous scalar field on $\RR^n$.</p>
    <div id="func-selection" class="selectables">
        <button
            class="btn-choice"
            class:active={funcChoice === 'linear'}
            on:click={() => (funcChoice = 'linear')}>linear</button
        >
        <button
            class="btn-choice"
            class:active={funcChoice === 'quadratic'}
            on:click={() => (funcChoice = 'quadratic')}>quadratic</button
        >
        <button
            class="btn-choice"
            class:active={funcChoice === 'periodic'}
            on:click={() => (funcChoice = 'periodic')}>periodic</button
        >
    </div>

    <p>
        We can integrate $f$ over $C$ with respect to arc length $ds$ or one or
        another coordinates, $dx$, $dy$, etc.
    </p>
    <div id="diff-selection" class="selectables">
        <button
            class="btn-choice"
            class:active={diffChoice === 'ds'}
            on:click={() => {
                diffChoice = 'ds';
                requestAnimationFrame(toDs);
            }}><M>ds</M></button
        >
        <button
            class="btn-choice"
            class:active={diffChoice === 'dx'}
            on:click={() => {
                diffChoice = 'dx';
                requestAnimationFrame(toDx);
            }}><M>dx</M></button
        >
        <button
            class="btn-choice"
            class:active={diffChoice === 'dy'}
            on:click={() => {
                diffChoice = 'dy';
                requestAnimationFrame(toDy);
            }}><M>dy</M></button
        >
    </div>
    <M display>{`\\int_C f\\,${diffChoice} `}</M>

    <input type="range" bind:value={tau} min="0" max="1" step="0.005" />

    <PlayButtons />
    sau: <input type="range" bind:value={sau} min="-1" max="1" step="0.005" />
</div>

<style>
    div.selectables {
        display: flex;
        justify-content: space-around;
    }
    .btn-choice {
        background-color: transparent;
        color: white;
        border: none;
        border-radius: 5px;
    }
    .btn-choice.active {
        font-style: bold;
        border: solid 1px white;
    }
</style>
