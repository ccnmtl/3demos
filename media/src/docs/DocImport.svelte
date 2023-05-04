<p>
    Imported files must be in JSON format. There is a 32 object limit for import files. Following the structure:
</p>
<pre>
[<!--Never mind the tab structure below, it's for the <pre> tag-->
    {`{`}
        "kind": "the object type",
        "params": {`{`}
            "a": "the object parameters",
            "q": "in no particular order",
            "t": "see Object Parameters for more details",
        {`}`}
    {`}`},
    {`{`}
        "kind": "the pattern repeats for each object",
        "params": {`{`}
            "x": "default parameters are provided",
            "y": "so you don't need to input everything"
        {`}`}
    {`}`},
]
</pre>
<a href='https://github.com/ccnmtl/3demos/tree/main/objectExamples'>
    Some example files are provided in the github repository.
</a>