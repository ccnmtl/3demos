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
        <strong>Standard Controls</strong> are active when the main menu is collapsed. 
        <strong>Alt/Option Controls</strong> can be triggered at any time by holding down the 
        Alt/Option key.To collapse the main menu click the up arrow beneath 
        this text box. Standard Features are currently implemented on the 
        following objects:
    </p>
    <ul style="columns: 3; -webkit-columns: 3; -moz-columns: 3;">
        <li>Graph</li>
        <li>Level Surface</li>
    </ul>

    <strong><u>Standard Controls</u></strong>
    <ul>
        <li>
            <em>(Hold Shift, Hover cursor over object)</em> Moves focus to a 
            point on the object. In the event of overlapping forms focus is set 
            to the nearest point to the viewer.
        </li>
        <li>
            <em>(c)</em> Locks camera to focus point.
        </li>
        <li><em>(t)</em> Shows tangent elements. Makes the focus point visible.</li>
        <ul>
            <li><em>(y)</em> Shows the tangent plane.</li>
            <li><em>(n)</em> Shows the normal to the tangent plane.</li>
        </ul>
    </ul>
    <p>
        
    </p>
    <strong><u>Alt/Option Controls</u></strong> - Hold Alt/Option
        <ul>
            <li><em>(Spacebar)</em> Hide/Reveal Main Menu</li>
        </ul>
    <strong><u>Additional Level Surface Controls</u></strong>
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