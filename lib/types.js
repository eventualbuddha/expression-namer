/** @typedef {{type: string}} */
var Expression;

/** @typedef {{type: string, name: string}} */
var Identifier;

/** @typedef {{type: string, value: (null|string|number|RegExp)}} */
var Literal;

/** @typedef {{type: string, object: Expression, property: Expression, computed: boolean}} */
var MemberExpression;

/** @typedef {{type: string, expression: Expression}} */
var ExpressionStatement;

/** @typedef {ExpressionStatement} */
var Statement;

/** @typedef {{type: string, body: Statement[]}} */
var BlockStatement;

/** @typedef {{type: string, id: Identifier, params: Identifier[], body: (BlockStatement|Expression)}} */
var FunctionExpression;

/** @typedef {{type: string, id: Identifier, params: Identifier[], body: (BlockStatement|Expression)}} */
var FunctionDeclaration;

/** @typedef {{type: string, callee: Expression, arguments: Expression[]}} */
var CallExpression;

/** @typedef {{type: string, properties: {key: Expression, value: Expression}}} */
var ObjectExpression;

/** @typedef {{type: string, elements: Expression[]}} */
var ArrayExpression;

/** @typedef {{type: string, operator: string, argument: Expression}} */
var UnaryExpression;

/** @typedef {{type: string, operator: string, left: Expression, right: Expression}} */
var BinaryExpression;

/** @typedef {{type: string, operator: string, left: Expression, right: Expression}} */
var AssignmentExpression;

/** @typedef {{type: string, operator: string, argument: Expression, prefix: boolean}} */
var UpdateExpression;

/** @typedef {{type: string, operator: string, argument: Expression, prefix: boolean}} */
var LogicalExpression;

/** @typedef {{type: string, test: Expression, consequent: Expression, alternate: Expression}} */
var ConditionalExpression;

/** @typedef {{type: string, callee: Expression, arguments: Expression[]}} */
var NewExpression;
