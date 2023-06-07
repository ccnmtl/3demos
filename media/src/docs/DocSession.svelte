<script>
    import Badge from './Badge.svelte';
</script>

<p>
    Sessions are used to present graphs and polls to an audience. Each session
    has a room with a unique Room ID generated on creation. The creator of the
    room is the <em>Host</em> and is given host features used to broadcast their
    object scene to the audience.
</p>
<strong><u>Host Features</u></strong>
<ul>
    <li>
        <Badge type="primary">Publish Scene</Badge>
        Found in the <Badge>Objects</Badge> window. Used to send the current scene
        to to the audience.
    </li>
    <li>
        <Badge>Polls</Badge> window. Displays the polls and poll responses.
    </li>
    <li>
        A chat section will appear in the <Badge>Info</Badge> window.
    </li>
</ul>
