<script>
    export let badge = function() {};
</script>

<p>
    The {@html badge('Objects', 'secondary')} window is used to create, modify, hide, and
    destroy objects.
</p>
New objects are created using {@html badge('Add Object', 'primary')}. Clicking on an
object type will add a new instance of that object to the scene. A card will be visible in
the {@html badge('Objects', 'secondary')} window. The header will contain a color swatch
corresponding to the color of that object, the object type, and three buttons.
<ul>
    <li>
        {@html badge('<i class="fa fa-eye"></i> / <i class="fa fa-eye-slash"></i>', 'secondary')}
        hides/reveals the object.
    </li>
    <li>
        {@html badge('<i class="fa fa-window-minimize"></i>', 'secondary')}
        collapses/expands the object card.
    </li>
    <li>
        {@html badge('<i class="fa fa-window-close"></i>', 'secondary')}
        destroys the object.
    </li>
</ul>
<p>
    {@html badge('Clear Objects', 'danger')} destroys all the objects in the scene.
</p>
You can <em>SELECT</em> an object by
<ol>
    <li>Clicking on the object title in the card header.</li>
    <li>Double-clicking on the object in the scene.</li>
</ol>
<div class="p-2 border border-2 rounded-2">
    Object selection is indicated by a white border around the selected object card and a
    visual change to the object in the scene.
</div>