<script>
    import { derived } from 'svelte/store';
    import { demoObjects } from '../stores';
    import { randomInt } from 'mathjs';

    //shortcut registry
    // register keyboard shortcuts when present

    const defaultShortcuts = {
        '?': 'Show this message',
        BkSp: 'Show/hide selected',
        h: 'Show/hide panel',
        m: 'Toggle mobile view',
        Esc: 'Deselect all',
        '[/]': 'Select previous/next object',
        '{/}': 'Group  previous/next object',
    };

    const kbdShortcuts = [
        {
            kind: 'curve',
            name: 'Space Curve',
            shortcuts: {
                Shift: 'Select point with mouse',
                c: 'Center camera on selected point',
                o: 'Show/hide osculating circle',
                p: 'Play/pause animation',
                r: 'Reset animation',
                s: 'Toggle parametrize by arc length',
                t: 'Show/hide position/tangent/2nd deriv',
            },
        },
        {
            kind: 'graph',
            name: 'Function Graph',
            shortcuts: {
                Shift: 'Select point with mouse',
                c: 'Center camera on selected point',
                i: 'Show/hide Riemann sum boxes',
                l: 'Show/hide level curves',
                n: 'Show/hide normal vector',
                p: 'Play/pause animation',
                r: 'Reset animation',
                s: 'Toggle parametrize by arc length',
                t: 'Show/hide tangent frame',
                y: 'Show/hide tangent plane',
                '0': 'Toggle level curves between plane and graph',
                '</>': 'Decrease/increase precision in Riemann sum',
            },
        },
        {
            kind: 'level',
            name: 'Level Surface',
            shortcuts: {
                Shift: 'Select point with mouse',
                c: 'Center camera on selected point',
                n: 'Show/hide normal vector',
                t: 'Show/hide tangent frame',
                y: 'Show/hide tangent plane',
            },
        },
        {
            kind: 'solid',
            name: 'Solid Region',
            shortcuts: {
                d: 'Toggle coloring by density',
            },
        },
        {
            kind: 'point',
            name: 'Point',
            shortcuts: {
                p: 'Play/pause animation',
                r: 'Reset animation',
            },
        },
        {
            kind: 'vector',
            name: 'Vector',
            shortcuts: {
                p: 'Play/pause animation',
                r: 'Reset animation',
            },
        },
        {
            kind: 'field',
            name: 'Vector Field',
            shortcuts: {
                p: 'Play/pause flow animation',
                r: 'Reset animation',
                t: 'Show/hide flow trails',
            },
        },
        {
            kind: 'surface',
            name: 'Parametric Surface',
            shortcuts: {
                Shift: 'Select point with mouse',
                c: 'Center camera on selected point',
                n: 'Show/hide normal vector',
                p: 'Play/pause animation',
                r: 'Reset animation',
                t: 'Show/hide tangent frame',
                y: 'Show/hide tangent plane',
            },
        },
    ];

    (entry) => $demoObjects.some((obj) => obj.kind === entry.type);

    const kbdItems = derived(demoObjects, (d) =>
        kbdShortcuts.filter((entry) =>
            d.some((obj) => obj.kind === entry.kind),
        ),
    );
</script>

<div class="container">
    <h5>General</h5>

    {#each Object.entries(defaultShortcuts) as [k, v]}
        <div class="kbdContainer">
            <div class="keyEntry">
                {#each k.split('/') as key}
                    <kbd>{key}</kbd>
                {/each}
            </div>
            <div class="keyUse">{v}</div>
        </div>
    {/each}
    <hr />
    {#each $kbdItems as { name, shortcuts }}
        <h5>{name}</h5>

        {#each Object.entries(shortcuts) as [k, v]}
            <div class="kbdContainer">
                <div class="keyEntry">
                    {#each k.split('/') as key}
                        <kbd>{key}</kbd>
                    {/each}
                </div>
                <div class="keyUse">{v}</div>
            </div>
        {/each}
        <hr />
    {/each}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
    }
    .keyEntry {
        text-align: right;
        flex: 1 1 0;
    }
    .keyUse {
        flex: 5 5 0;
        font-size: x-small;
    }
    .kbdContainer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 5px;
        width: 100%;
    }
    .container > h5 {
        color: rgba(255, 255, 255, 0.5);
    }

    kbd {
        background-color: #eee;
        border-radius: 3px;
        border: 1px solid #b4b4b4;
        box-shadow:
            0 1px 1px rgba(0, 0, 0, 0.2),
            0 2px 0 0 rgba(255, 255, 255, 0.7) inset;
        color: #333;
        display: inline-block;
        font-size: 0.85em;
        font-weight: 700;
        line-height: 1;
        padding: 2px 4px;
        white-space: nowrap;
    }
</style>
