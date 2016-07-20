const LEADING_VERB = /^(get|fetch|retrieve|call)([A-Z].*)$/;
const PREPOSITION = /(?:^|[a-z])(About|Above|Across|After|Against|Along|Among|Around|At|Before|Behind|Below|Beneath|Beside|Besides|Between|Beyond|But|By|Down|During|Except|For|From|In|Inside|Into|Like|Near|Of|Off|On|Onto|Opposite|Out|Outside|Over|Past|Since|Through|To|Toward|Under|Underneath|Until|Up|Upon|With|Within|Without)(?:[A-Z]|$)/;

/**
 * @param {string} name
 * @returns {string}
 */
export function extractSubject(name) {
  var subject = name;

  const verbMatch = subject.match(LEADING_VERB);

  if (verbMatch) {
    subject = verbMatch[2][0].toLowerCase() + verbMatch[2].slice(1);
  }

  const prepMatch = subject.match(PREPOSITION);

  if (prepMatch) {
    subject = subject.slice(0, prepMatch.index + 1);
  }

  return subject;
}
