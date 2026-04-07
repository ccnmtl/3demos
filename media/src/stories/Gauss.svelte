<script>
    import M from '../M.svelte';
    import * as THREE from 'three';

    let { scene } = $props();

    let ds = $state(1);
    let N = $state(1);

    function* slice3D(max = 10) {
        for (let n = 0; n <= 3 * max; n++) {
            for (let i = 0; i <= max; i++) {
                for (let j = 0; j <= max; j++) {
                    const k = n - i - j;
                    if (k >= 0 && k <= max) {
                        yield [i, j, k];
                    }
                }
            }
        }
    }

    const boxMaterial = new THREE.MeshPhongMaterial({ color: '#bbbbff' });
    const boxes = new THREE.Object3D();
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    scene.add(boxes);

    // // example
    // for (const p of slice3D(10)) {
    //   console.log(p);
    // }

    $effect(() => {
        for (const p of slice3D(N)) {
            const newbox = new THREE.Mesh(boxGeometry, boxMaterial);
            newbox.position.x = p[0];
            newbox.position.y = p[1];
            newbox.position.z = p[2];
            boxes.add(newbox);
        }
    });
</script>

<article>
    <M
        display
        s={`\\iint\\limits_{\\partial E} \\mathbf F \\cdot d\\mathbf S = \\sum_{i = 1}^{${N}}`}
    />

    <p></p>

    <input
        type="range"
        name="numBoxes"
        bind:value={N}
        min="1"
        max="100"
        step="1"
        id="numBoxes"
    /><br />

    <label
        ><input
            type="range"
            name="sideSize"
            bind:value={ds}
            min="0.1"
            max="2"
            step="0.1"
            id="sideSize"
        /><M s={`\\ ds = ${ds}`}></M></label
    >
    <!--
    <p>
        A <strong>linear function</strong>
        <M>L(x,y)</M> of two variables has the form
        <M display>L(x,y) = a + bx + cy</M>
        where {texString1} are constants. Their graphs are planes with normal vector
        <M>n = \langle -b, -c, 1 \rangle</M>.
    </p>

    <p>
        More generally, a linear function of <M>n</M> variables has the form
        <M display
            >{`L(x_1, x_2,\\ldots, x_n) = a_0 + \\sum_{i = 1}^n a_i x_i`}</M
        >
        which we can cleverly rewrite using the association.



        as <M>L(x) = m \cdot x + b</M>.
    </p>
-->
</article>
