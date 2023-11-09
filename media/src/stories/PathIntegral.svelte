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
    let integralValue = 0;
    let animateIntegral = false;

    // tags for animation (I for Integral animation; others for diffChoice animation)
    let raf;
    let rafI;
    let last;
    let lastI;

    const toDx = (time) => {
        cancelAnimationFrame(raf);
        if (!last) last = time;
        const dt = (time - last) / 1000;
        sau = Math.min(0.99, sau + dt);
        if (sau < 0.99) {
            last = time;
            raf = requestAnimationFrame(toDx);
        } else {
            last = undefined;
        }
    };
    const toDy = (time) => {
        cancelAnimationFrame(raf);
        if (!last) last = time;
        const dt = (time - last) / 1000;
        sau = Math.max(-0.99, sau - dt);
        if (sau > -0.99) {
            last = time;
            raf = requestAnimationFrame(toDy);
        } else {
            last = undefined;
        }
    };
    const toDs = (time) => {
        cancelAnimationFrame(raf);
        const sgn = -Math.sign(sau);
        if (!last) last = time;
        const dt = (sgn * (time - last)) / 1000;
        if (sau < 0) {
            sau = Math.min(0, sau + dt);
        } else if (sau > 0) {
            sau = Math.max(0, sau + dt);
        }
        if (sau !== 0) {
            last = time;
            raf = requestAnimationFrame(toDs);
        } else {
            last = undefined;
        }
    };

    /**
     * Animate to integral. Stick inside RAF, runs the parameter from a to b
     * @param time <Number>
     */
    const toI = (time) => {
        cancelAnimationFrame(rafI);
        const a = math.parse(curveData[pathChoice].r.a).evaluate();
        const b = math.parse(curveData[pathChoice].r.b).evaluate();
        if (!lastI) lastI = time;
        const dt = (time - lastI) / 1000;
        tau = Math.min(tau + dt / (b - a), 1);
        if (tau < 1) {
            lastI = time;
            rafI = requestAnimationFrame(toI);
        } else {
            lastI = undefined;
            animateIntegral = false;
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
    const ceiling = new THREE.Mesh(undefined, wireMaterial);
    const segs = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
    );
    wall.add(backwall);
    wall.add(ceiling);
    wall.add(segs);
    // console.log(segs.geometry);
    scene.add(wall);

    $: {
        ceiling.geometry?.dispose();
        ceiling.geometry = new ParametricGeometry(
            (u, v, vec) => {
                const x = -2 * 2 + u * (4 * 2);
                const y = -2 * 2 + v * (4 * 2);
                vec.set(x, y, funcData[funcChoice].func(x, y));
            },
            35,
            35
        );
    }

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

        const x = math.parse(curveData[pathChoice].r.x);
        const y = math.parse(curveData[pathChoice].r.y);

        const points = [];
        const X = x.evaluate({ t: T });
        const Y = y.evaluate({ t: T });
        const Z = funcData[funcChoice].func(X, Y);
        points.push(new THREE.Vector3(X, Y, 0));
        points.push(new THREE.Vector3(X, Y, Z));
        points.push(
            new THREE.Vector3(
                X * (1 + Math.min(0, sau)),
                Y * (1 - Math.max(0, sau)),
                Z
            )
        );
        // console.log(points);
        segs.geometry.setFromPoints(points);
        render();

        // Compute integral numerically
        let fn;
        const xp = math.derivative(x, 't');
        const yp = math.derivative(y, 't');
        if (diffChoice === 'ds') {
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
        } else if (diffChoice === 'dx') {
            fn = (t) =>
                funcData[funcChoice].func(
                    x.evaluate({ t }),
                    y.evaluate({ t })
                ) * xp.evaluate({ t });
        } else if (diffChoice === 'dy') {
            fn = (t) =>
                funcData[funcChoice].func(
                    x.evaluate({ t }),
                    y.evaluate({ t })
                ) * yp.evaluate({ t });
        }
        integralValue = gaussLegendre(fn, a, T, 30);
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
                x: '(1 + t/32)*cos(pi*t / 2)',
                y: 't/4 - sin(t)/2',
                a: '0',
                b: '8',
            },
            tex: '(1 + t/32)\\cos( \\frac{\\pi}{2} t), t/4 - \\sin(t)/2',
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
    <p>
        Let <M>C</M> be a path in <M>{'\\mathbb{R}^n'}</M> parametrized by <M
            >\vec r(t)</M
        > for
        <M>a \leq t \leq b</M>.
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
    <M display>
        {`${math.parse(curveData[pathChoice].r.a).toTex()} \\leq t \\leq ${math
            .parse(curveData[pathChoice].r.b)
            .toTex()} `}
    </M>
    <p>
        Let <M>f</M> be a continuous scalar field on <M>{'\\mathbb{R}^n'}</M>.
        Show graph:
        <label class="switch box box-3">
            <input
                type="checkbox"
                bind:checked={ceiling.visible}
                on:change={render}
            />
            <span class="slider round" />
        </label>
    </p>
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

    <M display>{`f(x,y) = ${funcData[funcChoice].tex}`}</M>

    <p>
        Choose "how" to integrate: with respect to arc length <M>ds</M> or one or
        another coordinates, <M>dx</M>, <M>dy</M>, etc.
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
    <p>
        We integrate (gradually using controls below) along the curve and
        compute the accumulation.
    </p>
    <M display>{`\\int_C f\\,${diffChoice} = `}</M>
    <M display
        >{`\\int_{${curveData[pathChoice].r.a}}^{${
            Math.round(100 * T) / 100
        }} \\left(${funcData[funcChoice].tex
            .replace('x', 'x(t)')
            .replace('y', 'y(t)')}\\right) \\, ${
            diffChoice === 'ds'
                ? "\\sqrt{x'(t)^2 + y'(t)^2}"
                : diffChoice === 'dx'
                ? "x'(t)"
                : "y'(t)"
        }\\,dt`}
    </M>
    <M display
        >{`
        = ${Math.round(1000 * integralValue) / 1000}
        `}
    </M>

    <input
        type="range"
        bind:value={tau}
        min="0"
        max="1"
        step="0.005"
        style="width: 80%"
    />

    <PlayButtons
        bind:animation={animateIntegral}
        on:play={() => (rafI = requestAnimationFrame(toI))}
        on:pause={() => {
            cancelAnimationFrame(rafI);
            lastI = null;
        }}
        on:rew={() => {
            cancelAnimationFrame(rafI);
            lastI = null;
            tau = 0;
            animateIntegral = false;
        }}
    />
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
