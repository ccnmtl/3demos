import { cmToGLSLfunc } from '../js-colormaps';
import { parse } from 'mathjs';


/**
     * Convert expression string to GLSL format via math.js
     * @param {string} expression
     * @returns string
     */
function mathToGLSL(expression) {
  let glslCode = parse(expression).toString({
    handler: (mathnode, options) => {
      // console.log(mathnode);
      if (mathnode.type == 'OperatorNode' && mathnode.fn == 'pow') {
        let [x, y] = mathnode.args;
        if (x.type == 'SymbolNode' && x.name === 'e') {
          return `exp(${y.toString(options)}) `;
        } else {
          return `pow(${x.toString(options)}, ${y.toString(options)}) `;
        }
      } else if (mathnode.type == 'ConstantNode') {
        return Number.isInteger(mathnode.value)
          ? `${mathnode.value}.0`
          : `${mathnode.value}`;
      } else if (mathnode.type == 'FunctionNode') {
        return `${mathnode.fn.name == 'atan2' ? 'atan' : mathnode.fn.name}(${mathnode.args.map((a) => a.toString(options)).join(', ')})`;
      } else if (mathnode.type == 'OperatorNode') {
        if (mathnode.args.length === 2) {
          return `${mathnode.args[0].toString(options)} ${mathnode.op} ${mathnode.args[1].toString(options)}`;
        } else if (mathnode.args.length === 1) {
          return `${mathnode.op} ${mathnode.args[0].toString(options)}`;
        }
      } else if (mathnode.type == 'SymbolNode') {
        return mathnode.name;
      } else if (mathnode.type == 'ConditionalNode') {
        return `${mathnode.condition.toString(options)} ? ${mathnode.trueExpr.toString(options)} : ${mathnode.falseExpr.toString(options)}`;
      } else if (mathnode.type == 'ParenthesisNode') {
        return `(${mathnode.content.toString(options)})`;
      } else {
        return mathnode.type;
      }
    },
    parenthesis: 'keep',
    implicit: 'show',
  });

  // Replace `pi` with its GLSL equivalent
  glslCode = glslCode.replace(/\bpi\b/g, '3.14159265359');

  console.log(glslCode.slice(-80));
  return glslCode;
}

const plainVertexShader = `
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
vUv = uv;
vPosition = position;
vNormal = normal;

gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
}
`;
const heatmapFragmentShader = (formula, colormap = 'plasma', v0 = 0, v1 = 1) => `
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormal;

${cmToGLSLfunc(colormap)}

float dens(float x, float y, float z) {
return ${mathToGLSL(formula)};
}


void main() {
float t = (clamp(dens(vPosition.x, vPosition.y, vPosition.z), float(${v0}), float(${v1})) - float(${v0})) / (float(${v1 - v0}));
gl_FragColor = vec4(color(t), 1.);
}
`;

export {
  mathToGLSL,
  plainVertexShader,
  heatmapFragmentShader,
};