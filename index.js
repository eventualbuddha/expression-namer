const extractSubject = require('./lib/speech').extractSubject;
const g = require('generator-utils');

/**
 * Gets a generator yielding possible names for the given expression.
 *
 * @param {Expression} expression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
function namesForExpression(expression) {
  return new ExpressionNamer().namesForExpression(expression);
}
exports.namesForExpression = namesForExpression;

/**
 * Gets all the possible names for the given expression.
 *
 * @param {Expression} expression
 * @returns {string[]}
 */
function allNamesForExpression(expression) {
  return g.toArray(namesForExpression(expression));
}
exports.allNamesForExpression = allNamesForExpression;

/**
 * Provides plausible names for various types of expressions.
 *
 * @constructor
 */
function ExpressionNamer() {}

/**
 * @param {Expression} expression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForExpression = function(expression) {
  return this['namesFor' + expression.type](expression);
};

/**
 * @param {Identifier} identifier
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForIdentifier = function(identifier) {
  return g.fromArray([identifier.name]);
};

/**
 * @param {Literal} literal
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForLiteral = function(literal) {
  switch (typeof literal.value) {
    case 'number':
      return g.fromArray(['' + literal.value, '_' + literal.value]);

    case 'string':
      const words = literal.value.replace(/[^\sa-z]/gi, '').split(/\s+/);
      return g.fromArray([joinNames(words)]);

    case 'object':
      if (literal.value === null) {
        return g.fromArray(['null', 'none', 'nil']);
      } else if (literal.value === undefined) {

      } else if (literal.value instanceof RegExp) {
        return g.fromArray(['regex', 'pattern']);
      }
      break;
  }
};

/**
 * @param {MemberExpression} memberExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForMemberExpression = function(memberExpression) {
  return g.concat([
    // First just names based on the property.
    this.namesForExpression(memberExpression.property),

    // Then permute the object and property names together.
    g.map(
      g.combine([
        this.namesForExpression(memberExpression.object),
        this.namesForExpression(memberExpression.property)
      ]),
      joinNames
    )
  ]);
};

/**
 * @param {FunctionExpression} fn
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunctionExpression = function(fn) {
  return this.namesForFunction(fn);
};

/**
 * @param {FunctionDeclaration} fn
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunctionDeclaration = function(fn) {
  return this.namesForFunction(fn);
};

/**
 * @param {FunctionExpression|FunctionDeclaration} fn
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunction = function(fn) {
  const candidates = ['fn', 'func'];

  if (fn.id) {
    candidates.unshift(fn.id.name);
  }

  return g.fromArray(candidates);
};

/**
 * @param {CallExpression} call
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForCallExpression = function(call) {
  return g.concat([
    // First, get any subjects from callee names, e.g. "index" from "indexOf".
    g.filterMap(
      this.namesForExpression(call.callee),
      function(name, skip) {
        const subject = extractSubject(name);
        if (name === subject) {
          skip();
        }
        return subject;
      }
    ),

    // Then just use "result".
    g.fromArray(['result']),

    // Next, try longer result names, e.g. "indexOfResult".
    g.map(
      this.namesForExpression(call.callee),
      function(name) {
        return joinNames([name, 'result']);
      }
    )
  ]);
};

/**
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForThisExpression = function() {
  return g.fromArray(['this', 'self', 'that', 'me']);
};

/**
 * @param {ObjectExpression} objectExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForObjectExpression = function(objectExpression) {
  return g.fromArray(['object', 'obj']);
};

/**
 * @param {ArrayExpression} arrayExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForArrayExpression = function(arrayExpression) {
  return g.fromArray(['list', 'array', 'arr']);
};

/**
 * @param {UnaryExpression} unaryExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForUnaryExpression = function(unaryExpression) {
  const expressionNames = this.namesForExpression(unaryExpression.argument);
  var prefix;
  var removablePrefix;

  switch (unaryExpression.operator) {
    case '!':
      prefix = removablePrefix = 'not';
      break;

    case '-':
      prefix = removablePrefix = 'negative';
      break;

    case '+':
      prefix = 'positive';
      break;

    case 'void':
      prefix = 'void';
      break;

    default:
      prefix = removablePrefix = '';
      break;
  }

  return g.map(expressionNames, function(value) {
    if (removablePrefix && hasCamelCasePrefix(removablePrefix, value)) {
      value = value.slice(removablePrefix.length);
      value = value[0].toLowerCase() + value.slice(1);
      return value;
    } else if (prefix && hasCamelCasePrefix(prefix, value)) {
      return value;
    } else {
      return joinNames([prefix, value]);
    }
  });
};

/**
 * @param {BinaryExpression} binaryExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForBinaryExpression = function(binaryExpression) {
  const leftNames = this.namesForExpression(binaryExpression.left);
  const rightNames = this.namesForExpression(binaryExpression.right);
  var middle;

  switch (binaryExpression.operator) {
    case '+':
      middle = 'plus';
      break;

    case '-':
      middle = 'minus';
      break;

    case '*':
      middle = 'times';
      break;

    case '/':
      middle = 'over';
      break;

    default:
      middle = '';
      break;
  }

  return g.map(
    g.combine([leftNames, rightNames]),
    namePairJoinerWithMiddle(middle)
  );
};

/**
 * @param {AssignmentExpression} assignment
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForAssignmentExpression = function(assignment) {
  return g.concat([
    this.namesForExpression(assignment.right),
    this.namesForExpression(assignment.left)
  ]);
};

/**
 * @param {UpdateExpression} update
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForUpdateExpression = function(update) {
  var rules;

  if (!update.prefix) {
    rules = [
      { prefix: '' },
      { prefix: 'old' },
      { prefix: 'original' }
    ];
  } else {
    rules = [
      { prefix: 'next' },
      { prefix: 'new' },
      { suffix: 'incr' }
    ];
  }

  return g.map(
    g.combine([
      g.fromArray(rules),
      this.namesForExpression(update.argument)
    ]),
    function(pair) {
      var left = pair[0];
      var right = pair[1];

      if (left.prefix) {
        left = left.prefix;
      } else {
        var tmp = left.suffix;
        left = right;
        right = tmp;
      }

      return joinNames([left, right]);
    }
  );
};

/**
 * @param {LogicalExpression} logical
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForLogicalExpression = function(logical) {
  var middle;

  switch (logical.operator) {
    case '&&':
      middle = 'and';
      break;

    case '||':
      middle = 'or';
      break;

    default:
      middle = '';
      break;
  }

  return g.map(
    g.combine([
      this.namesForExpression(logical.left),
      this.namesForExpression(logical.right)
    ]),
    namePairJoinerWithMiddle(middle)
  );
};

/**
 * @param {ConditionalExpression} conditional
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForConditionalExpression = function(conditional) {
  return g.concat([
    g.map(
      g.combine([
        this.namesForExpression(conditional.consequent),
        this.namesForExpression(conditional.alternate)
      ]),
      namePairJoinerWithMiddle('or')
    ),
    g.fromArray(['result'])
  ]);
};

/**
 * @param {NewExpression} newExpression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForNewExpression = function(newExpression) {
  return g.concat([
    g.map(
      this.namesForExpression(newExpression.callee),
      function(name) {
        return name[0].toLowerCase() + name.slice(1);
      }
    ),

    g.map(
      this.namesForExpression(newExpression.callee),
      function(name) {
        return joinNames(['new', name]);
      }
    )
  ]);
};

/**
 * @param {string[]} names
 * @returns {string}
 * @private
 */
function joinNames(names) {
  names = names.filter(function(name) { return name; });

  var result = names[0];

  for (var i = 1, len = names.length; i < len; i++) {
    result += names[i].slice(0, 1).toUpperCase() + names[i].slice(1);
  }

  return result;
}

/**
 * @param {string} middle
 * @returns {function(string[]): string}
 */
function namePairJoinerWithMiddle(middle) {
  return function(names) {
    var left = names[0];
    var right = names[1];
    return joinNames([left, middle, right]);
  };
}

/**
 * @param {string} prefix
 * @param {string} identifier
 * @returns {boolean}
 */
function hasCamelCasePrefix(prefix, identifier) {
  if (identifier.slice(0, prefix.length) !== prefix) {
    return false;
  }

  if (identifier[prefix.length].toUpperCase() !== identifier[prefix.length]) {
    return false;
  }

  return true;
}

exports.ExpressionNamer = ExpressionNamer;
