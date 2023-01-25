<script>
    import M from './M.svelte';
    import { v4 as uuidv4 } from "uuid";
    import { create, all } from "mathjs";
    import {
        ButtonDropdown,
        DropdownItem,
        DropdownMenu,
        DropdownToggle
    } from 'sveltestrap';

    const config = {};
    const math = create(all, config);

    export let objects = [];

    const texStrings = {
        r: "\\langle ?, ?, ? \\rangle",
        a: "-\\infty",
        b: "\\infty"
    };

    // eslint-disable no-useless-escape

    /**
     * Less organized, equals signs do not line up. The screen reader reads 
     * each line individually. I think it provides better pacing.
    */
    const texString1 = `\\dot{x} = \\sigma(y-x)`;
    const texString2 = `\\dot{y} = \\rho x - y - xz`;
    const texString3 = `\\dot{z} = -\\beta z + xy`;
    const texString4 = `\\( \\Large \\Delta t = \\frac{b - a}{N} \\)`;

    /**
     * Alternative structure - More organized, but the screen reader reads the
     * whole statement at once which may lead to confusion.
     * const texString3 = `
        \\eqalign{
            \\dot{x} & = \\sigma(y-x) \\cr
            \\dot{y} & = \\rho x - y - xz \\cr
            \\dot{z} & = -\\beta z + xy
        }`;
     */

    // eslint-enable

    let hidden = false;

    const toggleHidden = function() {
        hidden = !hidden;
    }

    const exampleCurveParams = [
        {
            a: "0",
            b: "2*pi",
            x: "sin(t)",
            y: "cos(t)",
            z: "cos(3t)/3 + 1/2",
            tau: 0,
            nX: 30,
        },
        {
            a: "-1.5",
            b: "1.5",
            x: "t",
            y: "t^2",
            z: "t^3",
            tau: 0,
            nX: 30,
        }
    ]

    let exTitle = null;
    let exId = null;

    const addCurve = function(selection, title) {
        exTitle = title;
        const params =  exampleCurveParams[selection];
        const [X,Y,Z,A,B] = ['x','y','z','a','b'].map((c) => 
                                math.parse(params[c]));
        texStrings.r = "\\left \\langle " + X.toTex() + ", " + Y.toTex() +
                        ", " + Z.toTex() + "\\right \\rangle";
        texStrings.a = A.toTex();
        texStrings.b = B.toTex();
        objects = objects.filter((b) => b.uuid !== exId);
        exId = uuidv4();
        objects = [...objects, {id:exId, kind: 'curve', params,}];
    }

    </script>

<button 
    class="btn btn-light"
    aria-label={(hidden ? 'Show' : 'Hide') + ' Arc Length and Curvature'}
    on:click={toggleHidden}
>
    Arc Length &amp; Curvature
</button>
<article hidden={hidden}>

    <p>
        Suppose we have a curve <M>C</M> in space parameterized by a smooth 
        function <M>r(t)</M> for <M>a \leq t \leq b</M> and we wish 
        to know how long it is. That is, we want to compute the 
        <b>arc length</b> of <M>C</M>.
    </p>

    <p class="row">
        <ButtonDropdown class="col-auto">
            <DropdownToggle 
                caret
                class="btn btn-light dropdown-toggle"
            >
                Examples
            </DropdownToggle>
            <DropdownMenu>
                <DropdownItem on:click={() => addCurve(0, "Crown")}>
                    Crown
                </DropdownItem>
                <DropdownItem on:click={() => addCurve(1, "Twist")}>
                    Twist
                </DropdownItem>
            </DropdownMenu>
        </ButtonDropdown>
        <span class="col-auto ml-2 mt-2">
            {exTitle ? "Currently viewing: " + exTitle : ""}
        </span>
    </p>

    <M display>{`r(t) =`} {texStrings.r}</M>
    <M display>{texStrings.a} {`\\leq`} {texStrings.b}</M>

    <p>
        We can estimate the length by selecting a finite number <M>N</M> of 
        positions along the curve and measuring the distance between them. To 
        wit, we select a partition of <M>[a, b]</M>:
    </p>

    <M display>{texString1}</M>
    <M display>{texString2}</M>
    <M display>{texString3}</M>

    <p>
        where {texString4}
    </p>
</article>
