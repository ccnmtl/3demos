<script>
    export let badge = function() {};
</script>
<p>
    Sessions are used to present graphs and polls to an audience. Each session has a room with a
    unique Room ID generated on creation. The creator of the room is the <em>Host</em> and is given
    host features used to broadcast their object scene to the audience.
</p>
<strong><u>Host Features</u></strong>
<ul>
    <li>
        {@html badge('Publish Scene', 'primary')}
        Found in the {@html badge('Objects', 'secondary')} window. Used to send the current scene
        to to the audience.
    </li>
    <li>
        {@html badge('Polls', 'secondary')} window.
        Displays the polls and poll responses.
    </li>
    <li>A chat section will appear in the {@html badge('Info', 'secondary')} window.</li>
</ul>