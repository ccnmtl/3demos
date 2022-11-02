<script>
    export let hidden = true;

    const toggleHidden = function() {
        hidden = !hidden;
    }
    </script>

<h1 class="top-title" on:click={toggleHidden}>Introduction</h1>
<article class:hidden>
    <p>
        Welcome to 3Demos. This is a site dedicated to visualizations for
        multivariable calculus. There are essentially two ways in which one can
        interact with the site, what your might call "story mode" and "creative
        mode".
    </p>

    <p>
        In story mode, the user can select a topic from the "ToC" menu above. A mix
        of theory, examples, and exercises are presented along with relevant
        graphical objects. Some interactive elements are embedded in the text.
    </p>

    <p>
        Creative mode can be accessed via the <i class="fa fa-sliders" /> icon in the
        upper-right. Here, one can create (and destroy) as many of the objects as one
        pleases. Note that hardware limitations may affect performance.
    </p>

    <p>
        This site is an open source project released under the MIT License. See the
        github repository for more information. Much credit must go to the authors
        and contributors of the brilliant <a href="https://threejs.org/">three.js</a
                                                                                     >
        library for the graphics (and, by extension, WebGL itself) as well as
        <a href="https://mathjs.org">math.js</a> for the math parsing and processing.
    </p>
    <p>
        Finally, I must acknowledge the pioneering work of Paul Seeburger and his
        <a href="https://c3d.libretexts.org/CalcPlot3D/index.html">CalcPlot3D</a>
        project, which covers much of the functionality of this site, did it first,
        and does it better.
    </p>
</article>

<style>
    .top-title {
        color: white;
        font-size: smaller;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        user-select: none;
        cursor: pointer;
    }
    .top-title:hover {
        background-color: rgba(255, 0, 0, 0.3);
    }
</style>
