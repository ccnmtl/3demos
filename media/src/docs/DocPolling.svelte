<script>
    import Badge from './Badge.svelte';
</script>

<p>
    Polling is only available in a <em>Session</em> and can only be initiated by
    the
    <em>Host</em>. There are several default polls available which can be
    quickly modified using the <Badge><i class="bi bi-pencil" /> Edit</Badge> found
    under the
    <em>Actions</em> column of the <em>Polls</em> table.
</p>
<p>
    Keep in mind that <Badge>Graph</Badge>,
    <Badge>Level Surface</Badge>, and
    <Badge>Parametric Surface</Badge> are the only objects that have selectable points
    for the <Badge>Select Point</Badge> poll type.
</p>
<strong><u>Creating a new Poll</u></strong>
<ul>
    <li>
        In the bottom left of the <Badge>Polls</Badge> window is the
        <Badge type="primary">Make New Polls</Badge> button.
    </li>
    <li>
        New polls are already populated with defaults for a Multiple Choice
        Question, but attributes can be changed to fit any question type.
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
