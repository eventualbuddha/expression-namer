const allNamesForExpression = require('../').allNamesForExpression;
const assert = require('assert');
const b = require('ast-types').builders;
const esprima = require('esprima');

describe('ExpressionNamer', function() {
  describe('#namesForIdentifier', function() {
    it('gets a name based on the identifier', function() {
      assert.deepEqual(
        getNames('name'),
        ['name']
      );
    });
  });

  describe('#namesForMemberExpression', function() {
    it('gets names based on both the object and property', function() {
      assert.deepEqual(
        getNames('Ember.get'),
        ['get', 'EmberGet']
      );
    });

    it('works with nested member expressions', function() {
      assert.deepEqual(
        getNames('foo.bar.baz'),
        ['baz', 'barBaz', 'fooBarBaz']
      );
    });

    it('works with computed property names', function() {
      assert.deepEqual(
        getNames('foo[bar.baz]'),
        ['baz', 'barBaz', 'fooBaz', 'fooBarBaz']
      );
    });
  });

  describe('#namesForLiteral', function() {
    context('when the literal has no parent', function() {
      it('uses "number" for numbers', function() {
        assert.deepEqual(getNames('1'), ['number']);
      });

      it('uses "string" and an identifier based on the string for strings', function() {
        assert.deepEqual(getNames('"hey there!"'), ['heyThere', 'string']);
      });

      it('uses regex-type words for regexes', function() {
        assert.deepEqual(getNames('/a/'), ['regex', 'pattern']);
      });
    });

    context('when the literal has a parent', function() {
      it('uses the number itself', function() {
        assert.deepEqual(getNames('list[0]'), ['list0']);
      });

      it('uses "string" and an identifier based on the string for strings', function() {
        assert.deepEqual(
          getNames('dict["hey there!"]'),
          ['heyThere', 'string', 'dictHeyThere', 'dictString']
        );
      });

      it('uses regex-type words for regexes', function() {
        assert.deepEqual(
          getNames('s[/a/]'),
          ['regex', 'pattern', 'sRegex', 'sPattern']
        );
      });
    });

    context('when the literal is null', function() {
      it('uses common names for null', function() {
        assert.deepEqual(
          getNames('null'),
          ['null', 'none', 'nil']
        );
      });
    });
  });

  describe('#namesForFunction', function() {
    it('uses the function name followed by common names for functions', function() {
      assert.deepEqual(
        getNames('(function doFoo() {})'),
        ['doFoo', 'fn', 'func']
      );
    });
  });

  describe('#namesForCallExpression', function() {
    context('when the callee has a discernible name', function() {
      it('uses a generic name first if it cannot extract a subject', function() {
        assert.deepEqual(
          getNames('foo()'),
          ['result', 'fooResult']
        );
      });

      it('extracts a subject after a verb', function() {
        assert.deepEqual(
          getNames('getFirstPerson()'),
          ['firstPerson', 'result', 'getFirstPersonResult']
        );

        assert.deepEqual(
          getNames('fetchRecords()'),
          ['records', 'result', 'fetchRecordsResult']
        );
      });

      it('extracts a subject before a prepositional phrase', function() {
        assert.deepEqual(
          getNames('listenerWithName("onclick")'),
          ['listener', 'result', 'listenerWithNameResult']
        );

        assert.deepEqual(
          getNames('indexOf("-")'),
          ['index', 'result', 'indexOfResult']
        );

        assert.deepEqual(
          getNames('objectAtIndex(2)'),
          ['object', 'result', 'objectAtIndexResult']
        );

        assert.deepEqual(
          getNames('valueForKey("name")'),
          ['value', 'result', 'valueForKeyResult']
        );
      });

      it('works with names both with a leading verb and a prepositional phrase', function() {
        assert.deepEqual(
          getNames('getValueForKey("name")'),
          ['value', 'result', 'getValueForKeyResult']
        );
      });
    });

    context('when the callee is a member expression', function() {
      it('tries to extract a subject from the member expression names', function() {
        assert.deepEqual(
          getNames('string.indexOf(prefix)'),
          ['index', 'stringIndex', 'result', 'indexOfResult', 'stringIndexOfResult']
        );
      });
    });
  });

  describe('#namesForThisExpression', function() {
    it('uses common names for "this"', function() {
      assert.deepEqual(
        getNames('this'),
        ['this', 'self', 'that', 'me']
      );
    });
  });

  describe('#namesForObjectExpression', function() {
    it('uses common names for objects', function() {
      assert.deepEqual(
        getNames('({})'),
        ['object', 'obj']
      );
    });
  });

  describe('#namesForArrayExpression', function() {
    it('uses common names for arrays', function() {
      assert.deepEqual(
        getNames('[]'),
        ['list', 'array', 'arr']
      );
    });
  });

  describe('#namesForUnaryExpression', function() {
    context('when the operator is "!"', function() {
      it('prefixes expression names with "not"', function() {
        assert.deepEqual(
          getNames('!equal'),
          ['notEqual']
        );
      });

      it('removes the "not" prefix if it is already there', function() {
        assert.deepEqual(
          getNames('!notEqual'),
          ['equal']
        );
      });
    });

    context('when the operator is "-"', function() {
      it('prefixes expression names with "negative"', function() {
        assert.deepEqual(
          getNames('-offset'),
          ['negativeOffset']
        );
      });

      it('removes the "negative" prefix if it is already there', function() {
        assert.deepEqual(
          getNames('-negativeOffset'),
          ['offset']
        );
      });
    });

    context('when the operator is "+"', function() {
      it('prefixes expression names with "positive"', function() {
        assert.deepEqual(
          getNames('+offset'),
          ['positiveOffset']
        );
      });

      it('preserves the "positive" prefix if it is already there', function() {
        assert.deepEqual(
          getNames('+positiveOffset'),
          ['positiveOffset']
        );
      });
    });

    context('when the operator is "void"', function() {
      it('prefixes expression names with "void"', function() {
        assert.deepEqual(
          getNames('void name'),
          ['voidName']
        );
      });

      it('preserves the "void" prefix if it is already there', function() {
        assert.deepEqual(
          getNames('void voidName'),
          ['voidName']
        );
      });
    });
  });

  describe('#namesForBinaryExpression', function() {
    context('when the operator is "+"', function() {
      it('joins the names of left and right with "plus"', function() {
        assert.deepEqual(
          getNames('x + view.width'),
          ['xPlusWidth', 'xPlusViewWidth']
        );
      });
    });

    context('when the operator is "-"', function() {
      it('joins the names of left and right with "minus"', function() {
        assert.deepEqual(
          getNames('x - view.width'),
          ['xMinusWidth', 'xMinusViewWidth']
        );
      });
    });

    context('when the operator is "*"', function() {
      it('joins the names of left and right with "times"', function() {
        assert.deepEqual(
          getNames('x * view.width'),
          ['xTimesWidth', 'xTimesViewWidth']
        );
      });
    });

    context('when the operator is "/"', function() {
      it('joins the names of left and right with "over"', function() {
        assert.deepEqual(
          getNames('x / view.width'),
          ['xOverWidth', 'xOverViewWidth']
        );
      });
    });
  });

  describe('#namesForAssignmentExpression', function() {
    it('uses names from the right side first, then the left', function() {
      assert.deepEqual(
        getNames('x = view.offset'),
        ['offset', 'viewOffset', 'x']
      );
    });
  });

  describe('#namesForUpdateExpression', function() {
    it('uses names to indicate the old value for postfix', function() {
      assert.deepEqual(
        getNames('x++'),
        ['x', 'oldX', 'originalX']
      );
    });

    it('uses names to indicate the new value for prefix', function() {
      assert.deepEqual(
        getNames('++x'),
        ['nextX', 'newX', 'xIncr']
      );
    });
  });

  describe('#namesForLogicalExpression', function() {
    context('when the operator is "&&"', function() {
      it('combines the left and right sides with "and"', function() {
        assert.deepEqual(
          getNames('a && b'),
          ['aAndB']
        );
      });
    });

    context('when the operator is "||"', function() {
      it('combines the left and right sides with "or"', function() {
        assert.deepEqual(
          getNames('a || b'),
          ['aOrB']
        );
      });
    });
  });

  describe('#namesForConditionalExpression', function() {
    it('combines the consequent and alternate with "or"', function() {
      assert.deepEqual(
        getNames('a ? b : c'),
        ['bOrC', 'result']
      );
    });
  });

  describe('#namesForNewExpression', function() {
    it('uses a lower camel case version of the callee', function() {
      assert.deepEqual(
        getNames('new FieldKit.NumberFormatter()'),
        [
          'numberFormatter',
          'fieldKitNumberFormatter',
          'newNumberFormatter',
          'newFieldKitNumberFormatter'
        ]
      );
    });
  });

  /**
   * @param {string|Expression} expression
   * @returns {string[]}
   */
  function getNames(expression) {
    if (typeof expression === 'string') {
      expression = esprima.parse(expression).body[0].expression;
    }
    return allNamesForExpression(expression);
  }
});
