<script>
    import Badge from './Badge.svelte';
</script>

<p>
    The <Badge>Objects</Badge> window is used to create, modify, hide, and destroy
    objects.
</p>
New objects are created using <Badge type="primary">Add Object</Badge>. Clicking
on an object type will add a new instance of that object to the scene. A card
will be visible in the <Badge>Objects</Badge> window. The header will contain a color
swatch corresponding to the color of that object, the object type, and three buttons.
<ul>
    <li>
        <Badge><i class="fa fa-eye" /> / <i class="fa fa-eye-slash" /></Badge>
        hides/reveals the object.
    </li>
    <li>
        <Badge><i class="fa fa-window-minimize" /></Badge>
        collapses/expands the object card.
    </li>
    <li>
        <Badge><i class="fa fa-window-close" /></Badge>
        destroys the object.
    </li>
</ul>
<p>
    <Badge type="danger">Clear Objects</Badge> destroys all the objects in the scene.
</p>
You can<em>SELECT</em> an object by
<ol>
    <li>Clicking on the object title in the card header.</li>
    <li>Double-clicking on the object in the scene.</li>
</ol>
<div class="p-2 border border-2 rounded-2">
    Object selection is indicated by a white border around the selected object
    card and a visual change to the object in the scene.
</div>
