<script>
    import M from '../M.svelte';

    let pathChoice = 'circle';
</script>

<div>
    <h1>Path Integrals</h1>

    <p>
        Let $C$ be a path in $\RR^n$ parametrized by $\vec r(t)$ for $a \leq t
        \leq b$.
    </p>
    <div id="path-selection">
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
    <M display>{`\\int_C f\\,ds`}</M>

    <p>Coming soon...</p>
</div>

<style>
    div#path-selection {
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
