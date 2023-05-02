<script>
    import M from "../M.svelte";
    export let badge = function() {};
</script>

<ul>
    <li>
        {@html badge('Esc', 'secondary')}
        Hide/Show the MENU
    </li>
    <li>
        {@html badge('Backspace', 'secondary')}
        Hide/Show the selected object
    </li>
    <li>
        {@html badge('p', 'secondary')}
        Play/Pause animation for the selected object.
        <ul>
            <li>Requires <M size="sm">t</M> variable.</li>
            <li>Not available for <em>Solid Region</em> objects.</li>
        </ul>
    </li>
</ul>
<strong><u>Tangent Controls - Space Curve</u></strong>
<ul>
    <li>
        {@html badge('t', 'secondary')}
        Hide/Show tangent elements.
    </li>
    <li>
        {@html badge('o', 'secondary')}
        Hide/Show oscillating circle. <em>Only works when the animation is playing.</em>
    </li>
</ul>
<div style="text-indent:-2rem; margin-left:2rem;">
    <strong><u>Tangent Controls - Graph / Level Surface / Parametric Surface</u></strong>
</div>
<ul>
    <li>
        {@html badge('Hold Shift, Hover cursor over selected object', 'secondary')}
        Moves the tangent point on the object.
    </li>
    <li>
        {@html badge('c', 'secondary')}
        Sets the camera focus to the tangent point.
    </li>
    <li>
        {@html badge('t', 'secondary')}
        Hide/Show tangent elements. Makes the tangent point visible.
    </li>
    <ul>
        <li>
            {@html badge('y', 'secondary')}
            Hide/Show the tangent plane.
        </li>
        <li>
            {@html badge('n', 'secondary')}
            Hide/Show the normal to the tangent plane.
        </li>
    </ul>
</ul>
<strong><u>Additional Level Surface Controls</u></strong>
<ul>
    <li>
        {@html badge('b', 'secondary')}
        Show integration boxes.
    </li>
    <ul>
        <li>
            {@html badge('&lt;', 'secondary')}
            Decrease the number of integral divisions.
        </li>
        <li>
            {@html badge('&gt;', 'secondary')}
            Increase the number of integral divisions.
        </li>
    </ul>
    <li>
        {@html badge('l', 'secondary')}
        Turn on topography
    </li>
    <ul>
        <li>
            {@html badge('0', 'secondary')}
            Switch topographic representation between 2D and 3D.
        </li>
    </ul>
</ul>