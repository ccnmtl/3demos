<script>
    /**
     * Here is the list of keyboard controlss and what they do. 
     * Provided for users in the Chapters section.
    */

   let hidden = false;

   const toggleHidden = function() {
        hidden = !hidden;
    }
</script>
<button
    class="btn btn-light"
    aria-label={(hidden ? 'Show' : 'Hide') + ' Keyboard Controls'}
    on:click={toggleHidden}
>
    Keyboard Controls
</button>
<article hidden={hidden}>

    <p>
        Keyboard Controls are active when the main menu is collapsed. To collapse the 
        main menu click the up arrow beneath this text box. Keyboard Controls are 
        currently implemented on the following objects:
    </p>
    <ul style="columns: 3; -webkit-columns: 3; -moz-columns: 3;">
        <li>Graph</li>
        <li>Level Surface</li>
    </ul>

    <strong><u>Standard Features</u></strong>
    <ul>
        <li>
            <em>(Hold Shift, Hover cursor over object)</em> Move focus to a 
            point on the object. In the event overlap focus is set to the 
            nearest point to the viewer.
        </li>
        <li>
            <em>(c)</em> Lock camera to focus point.
        </li>
        <li><em>(t)</em> Show tangent elements. Make focus point visible.</li>
        <ul>
            <li><em>(y)</em> Show tangent plane.</li>
            <li><em>(n)</em> Show normal to the tangent plane.</li>
        </ul>
        <strong><u>Alt/Option Functions</u></strong> - Hold Alt/Option
        <ul>
            <li><em>(Spacebar)</em> Hide/Reveal Main Menu</li>
        </ul>
    </ul>
    <strong><u>Additional Level Surface Features</u></strong>
    <ul>
        <li>
            <em>(p)</em> Play animation. Requires <strong>t</strong> variable.
        </li>
        <li><em>(b)</em> Show integration boxes.</li>
        <ul>
            <li>
                <em>(&lt;)</em> Decrease the number of intagral divisions.
            </li>
            <li>
                <em>(&gt;)</em> Increase the number of intagral divisions.
            </li>
        </ul>
        <li><em>(l)</em> Turn on topography</li>
        <ul>
            <li>
                <em>(0)</em> Switch topographic representation between 2D and 3D.
            </li>
        </ul>
    </ul>
</article>