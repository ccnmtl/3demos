<script>
    import M from '../M.svelte';
</script>

<p>Special Object Parameters exist in the body of the object card.</p>
Some features such as animation and vector incrementation are hidden by default.
To reveal hidden parameters, insert the given variable into one of the function inputs.
<ul>
    <li>Animation requires the <M size="sm" s="t" /> variable.</li>
    <li>
        <em>Vector</em> objects have an <M size="sm" s="n" /> variable, used to iterate
        across a given range.
    </li>
    <ul><li><M size="sm" s="n" /> increments by 1</li></ul>
</ul>
<p>
    Level Surface and Solid Region do <span class="text-danger">NOT</span> have animation
    features.
</p>
