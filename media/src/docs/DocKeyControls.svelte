<script>
    import M from '../M.svelte';
    import Badge from './Badge.svelte';
</script>

<ul>
    <li>
        <Badge>h</Badge>
        Hide/Show the MENU.
    </li>
    <li>
        <Badge>{`[ / ]`}</Badge>
        Shift selection to the object just before the first or after the last selected
        object.
    </li>
    <li>
        <Badge>{`{ / }`}</Badge>
        Add the object just above or below the respective objects to the selection.
    </li>
    <li>
        <Badge>Esc</Badge>
        Deselect all objects.
    </li>
    <li>
        <Badge>Backspace</Badge>
        Hide/Show the selected objects.
    </li>
    <li>
        <Badge>p</Badge>
        Play/Pause animation for the selected objects.
        <ul>
            <li>Requires <M size="sm" s="t" /> variable.</li>
            <li>Not available for <em>Solid Region</em> objects.</li>
        </ul>
    </li>
</ul>
<strong><u>Tangent Controls - Space Curve</u></strong>
<ul>
    <li>
        <Badge>t</Badge>
        Hide/Show tangent elements.
    </li>
    <li>
        <Badge>o</Badge>
        Hide/Show oscillating circle.
        <em>Only works when the animation is playing.</em>
    </li>
</ul>
<div style="text-indent:-2rem; margin-left:2rem;">
    <strong
        ><u>Tangent Controls - Graph / Level Surface / Parametric Surface</u
        ></strong
    >
</div>
<ul>
    <li>
        <Badge><kbd>Shift</kbd> + <em>hover</em></Badge>
        Moves the tangent point on the object.
    </li>
    <li>
        <Badge>c</Badge>
        Sets the camera focus to the tangent point.
    </li>
    <li>
        <Badge>t</Badge>
        Hide/Show tangent elements. Makes the tangent point visible.
    </li>
    <ul>
        <li>
            <Badge>y</Badge>
            Hide/Show the tangent plane.
        </li>
        <li>
            <Badge>n</Badge>
            Hide/Show the normal to the tangent plane.
        </li>
    </ul>
</ul>
<strong><u>Additional Level Surface Controls</u></strong>
<ul>
    <li>
        <Badge>b</Badge>
        Show integration boxes.
    </li>
    <ul>
        <li>
            <Badge>&lt; / &gt;</Badge>
            Decrease/increase the number of integral divisions.
        </li>
    </ul>
    <li>
        <Badge>l</Badge>
        Display/hide level curves.
    </li>
    <ul>
        <li>
            <Badge>0</Badge>
            Toggle level sets displayed on graph <M size="sm" s="z = f(x,y)" /> vs.
            in plane <M size="sm" s="z = 0" />.
        </li>
    </ul>
</ul>
