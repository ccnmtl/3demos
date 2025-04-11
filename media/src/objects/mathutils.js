import {
  parse,
  simplifyConstant,
  OperatorNode,
  FunctionNode,
  SymbolNode,
  ConditionalNode,
} from 'mathjs';

const allowedMathFns = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sqrt', 'pow', 'exp', 'log', 'abs',
  'min', 'max', 'round', 'floor', 'ceil', 'sign', 'hypot',
]);

const disallowedSymbols = new Set([
  '__proto__', 'constructor', 'prototype',
  'Function', 'window', 'document', 'globalThis',
]);

const constantMap = {
  pi: 'Math.PI',
  e: 'Math.E',
  LOG2E: 'Math.LOG2E',
  LOG10E: 'Math.LOG10E',
  LN2: 'Math.LN2',
  LN10: 'Math.LN10',
  SQRT2: 'Math.SQRT2',
  SQRT1_2: 'Math.SQRT1_2',
};

/**
 * Checks if a math.js AST contains a ConditionalNode
 * @param {*} node 
 * @returns boolean
 */
function containsConditional(node) {
  let found = false;
  node.traverse((child) => {
    if (child.type === 'ConditionalNode') {
      found = true;
    }
  });
  return found;
}


// 🔁 Transform e^x → exp(x)
function rewriteEToExp(ast) {
  return ast.transform((node) => {
    if (
      node.type === 'OperatorNode' &&
      node.fn === 'pow' &&
      node.args.length === 2 &&
      node.args[0].type === 'SymbolNode' &&
      node.args[0].name === 'e'
    ) {
      return new FunctionNode('exp', [node.args[1]]);
    }
    return node;
  });
}

function mathToJSFunction(expression, variableNames = null) {
  const rawAST = parse(expression);
  const rewrittenAST = rewriteEToExp(rawAST);
  const ast = containsConditional(rewrittenAST) ? rewrittenAST : simplifyConstant(rewrittenAST);

  // Infer variables if not given
  const inferredVars = new Set();
  ast.traverse((node) => {
    if (node.isSymbolNode) {
      const name = node.name;
      if (disallowedSymbols.has(name)) {
        throw new Error(`Disallowed symbol: ${name}`);
      }
      if (!allowedMathFns.has(name) && !constantMap[name] && !/^[0-9.]+$/.test(name)) {
        inferredVars.add(name);
      }
    }
  });

  const vars = variableNames ?? Array.from(inferredVars);

  // Compile AST to JS expression string
  const jsExpr = ast.toString({
    handler: (node, options) => {
      switch (node.type) {
        case 'OperatorNode':
          if (node.fn === 'pow') {
            return `Math.pow(${node.args[0].toString(options)}, ${node.args[1].toString(options)})`;
          }
          if (node.args.length === 2) {
            return `(${node.args[0].toString(options)} ${node.op} ${node.args[1].toString(options)})`;
          } else if (node.args.length === 1) {
            return `(${node.op}${node.args[0].toString(options)})`;
          }
          break;

        case 'FunctionNode':
          const fnName = node.fn.name;
          if (fnName === 'mod') {
            const [a, b] = node.args;
            return `(((${a.toString(options)} % ${b.toString(options)}) + ${b.toString(options)}) % ${b.toString(options)})`;
          }

          if (!allowedMathFns.has(fnName)) {
            throw new Error(`Unsupported function: ${fnName}`);
          }
          const jsFn = fnName === 'atan2' ? 'Math.atan2' : `Math.${fnName}`;
          return `${jsFn}(${node.args.map(arg => arg.toString(options)).join(', ')})`;

        case 'ConstantNode':
          return `${node.value}`;

        case 'SymbolNode':
          return constantMap[node.name] || node.name;

        case 'ParenthesisNode':
          return `(${node.content.toString(options)})`;

        case 'ConditionalNode':
          return `(${node.condition.toString(options)} ? ${node.trueExpr.toString(options)} : ${node.falseExpr.toString(options)})`;

        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }
    },
    parenthesis: 'keep',
    implicit: 'show',
  });

  const argList = vars.join(', ');
  return new Function(argList, `return ${jsExpr};`);
}


export { mathToJSFunction };