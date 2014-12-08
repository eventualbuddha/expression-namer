const extractSubject = require('./lib/speech').extractSubject;
const g = require('generator-utils');

const IDENTIFIER_PATTERN = /^[$_a-zA-Z][$_a-zA-Z0-9]*$/;

/**
 * Gets a generator yielding possible names for the given expression.
 *
 * @param {Expression} expression
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
function namesForExpression(expression) {
  return g.filter(
    new ExpressionNamer().namesForExpression(expression),
    function(name) { return IDENTIFIER_PATTERN.test(name); }
  );
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
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForExpression = function(expression, parent) {
  return this['namesFor' + expression.type](expression, parent);
};

/**
 * @param {Identifier} identifier
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForIdentifier = function(identifier, parent) {
  return g.fromArray([identifier.name]);
};

/**
 * @param {Literal} literal
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForLiteral = function(literal, parent) {
  switch (typeof literal.value) {
    case 'number':
      if (parent) {
        return g.fromArray(['' + literal.value]);
      } else {
        return g.fromArray(['number']);
      }

    case 'string':
      const words = literal.value.replace(/[^\sa-z]/gi, '').split(/\s+/);
      return g.fromArray([joinNames(words), 'string']);

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
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForMemberExpression = function(memberExpression, parent) {
  return g.concat([
    // First just names based on the property.
    this.namesForExpression(memberExpression.property, memberExpression),

    // Then permute the object and property names together.
    g.map(
      g.combine([
        this.namesForExpression(memberExpression.object, memberExpression),
        this.namesForExpression(memberExpression.property, memberExpression)
      ]),
      joinNames
    )
  ]);
};

/**
 * @param {FunctionExpression} fn
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunctionExpression = function(fn, parent) {
  return this.namesForFunction(fn, parent);
};

/**
 * @param {FunctionDeclaration} fn
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunctionDeclaration = function(fn, parent) {
  return this.namesForFunction(fn, parent);
};

/**
 * @param {FunctionExpression|FunctionDeclaration} fn
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForFunction = function(fn, parent) {
  const candidates = ['fn', 'func'];

  if (fn.id) {
    candidates.unshift(fn.id.name);
  }

  return g.fromArray(candidates);
};

/**
 * @param {CallExpression} call
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForCallExpression = function(call, parent) {
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
 * @param {ThisExpression} expression
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForThisExpression = function(expression, parent) {
  return g.fromArray(['this', 'self', 'that', 'me']);
};

/**
 * @param {ObjectExpression} objectExpression
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForObjectExpression = function(objectExpression, parent) {
  return g.fromArray(['object', 'obj']);
};

/**
 * @param {ArrayExpression} arrayExpression
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForArrayExpression = function(arrayExpression, parent) {
  return g.fromArray(['list', 'array', 'arr']);
};

/**
 * @param {UnaryExpression} unaryExpression
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForUnaryExpression = function(unaryExpression, parent) {
  const expressionNames = this.namesForExpression(unaryExpression.argument, unaryExpression);
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
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForBinaryExpression = function(binaryExpression, parent) {
  const leftNames = this.namesForExpression(binaryExpression.left, binaryExpression);
  const rightNames = this.namesForExpression(binaryExpression.right, binaryExpression);
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
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForAssignmentExpression = function(assignment, parent) {
  return g.concat([
    this.namesForExpression(assignment.right, assignment),
    this.namesForExpression(assignment.left, assignment)
  ]);
};

/**
 * @param {UpdateExpression} update
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForUpdateExpression = function(update, parent) {
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
      this.namesForExpression(update.argument, update)
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
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForLogicalExpression = function(logical, parent) {
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
      this.namesForExpression(logical.left, logical),
      this.namesForExpression(logical.right, logical)
    ]),
    namePairJoinerWithMiddle(middle)
  );
};

/**
 * @param {ConditionalExpression} conditional
 * @param {?Node=} parent
 * @returns {{next: (function(): {value: ?string, done: boolean})}}
 */
ExpressionNamer.prototype.namesForConditionalExpression = function(conditional, parent) {
  return g.concat([
    g.map(
      g.combine([
        this.namesForExpression(conditional.consequent, conditional),
        this.namesForExpression(conditional.alternate, conditional)
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
ExpressionNamer.prototype.namesForNewExpression = function(newExpression, parent) {
  return g.concat([
    g.map(
      this.namesForExpression(newExpression.callee, newExpression),
      function(name) {
        return name[0].toLowerCase() + name.slice(1);
      }
    ),

    g.map(
      this.namesForExpression(newExpression.callee, newExpression),
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
