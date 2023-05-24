<script>
    import M from '../M.svelte';
</script>

<div>
    <h1>Flux Integrals</h1>

    <p>
        Let <M>{`\\mathbf r: D\\to \\Omega \\subset \\mathbb{R}^3`}</M> be a parametric
        surface oriented with normal <M>{`\\mathbf N`}</M> and <M>
            {`\\mathbf F`}
        </M> a vector field continuous on <M>{`\\Omega`}</M>.
    </p>

    <p>
        Then the <b>flux</b> of the vector field through the surface is given by

        <M display={true}>{`\\iint_\\Omega \\mathbf F\\cdot\\,d\\mathbf S`}</M>
        <M display={true}>{`=\\iint_\\Omega \\mathbf F\\cdot\\mathbf N\\,dS`}</M
        >
        <M display={true}>
            {`=\\iint_D \\mathbf F(\\mathbf r(u,v)) \\cdot \\mathbf r_u \\times \\mathbf r_v\\,dS.`}
        </M>
    </p>
</div>
