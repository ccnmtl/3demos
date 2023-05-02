<script>
    export let badge = function() {};
</script>

<p>
    Polling is only available in a <em>Session</em> and can only be initiated by the
    <em>Host</em>. There are several default polls available which can be quickly modified using
    the {@html badge('<i class="bi bi-pencil" /> Edit ', 'secondary')} found under the
    <em>Actions</em> column of the <em>Polls</em> table.
</p>
<strong><u>Creating a new Poll</u></strong>
<ul>
    <li>
        In the bottom left of the {@html badge('Polls', 'secondary')} window is the
        {@html badge('Make new poll', 'primary')} button.
    </li>
    <li>
        New polls are already populated with defaults for a Multiple Choice Question, but
        attributes can be changed to fit any question type.
    </li>
</ul>
<strong><u>Poll Attributes</u></strong>
<ul>
    <li>
        type
        <ul>
            <li>"multiple choice"</li>
            <li>"number"</li>
            <li>"select point"</li>
            <li>"select object"</li>
        </ul>
    </li>
    <li>
        prompt
        <ul>
            <li>"A question string"</li>
        </ul>
    </li>
    <li>
        choices -- <em>only for multiple choice</em>
        <ul>
            <li>"answer A"</li>
            <li>"answer B"</li>
            <li>"..."</li>
        </ul>
    </li>
</ul>
