const quantifierRule = prefix => $ => seq(
  prefix($),
  optional(alias('?', $.lazy))
)

const SYNTAX_CHARS = [
  ...'^$\\.*+?()[]{}|'
]

const SYNTAX_CHARS_ESCAPED = SYNTAX_CHARS.map(
  char => `\\${char}`
).join('')

module.exports = grammar({
  name: 'regex',
  extras: $ => ['\n'],
  inline: $ => [$._character_escape],
  rules: {
    pattern: $ => choice(
      $.disjunction,
      $.term,
    )

    , disjunction: $ =>
      seq(optional($.term), repeat1(seq('|', optional($.term))))

    , term: $ =>
      repeat1(seq(
        choice(
          $.start_assertion,
          $.end_assertion,
          $.boundary_assertion,
          $.non_boundary_assertion,
          $.lookahead_assertion,
          $.pattern_character,
          $.character_class,
          $.any_character,
          $.decimal_escape,
          $.character_class_escape,
          $._character_escape,
          $.backreference_escape,
          $.anonymous_capturing_group,
          $.named_capturing_group,
          $.non_capturing_group,
        ),
        optional(choice(
          $.zero_or_more,
          $.one_or_more,
          $.optional,
          $.count_quantifier,
        ))
      ))

    , any_character: $ => '.'

    , start_assertion: $ => '^'
    , end_assertion: $ => '$'
    , boundary_assertion: $ => '\\b'
    , non_boundary_assertion: $ => '\\B'
    , lookahead_assertion: $ =>
      seq(
        '(?',
        choice('=', '!', '<=', '<!'),
        $.pattern,
        ')'
      )

    , pattern_character: $ =>
      // Anything not a SYNTAX_CHAR
      new RegExp(`[^${SYNTAX_CHARS_ESCAPED}\\n]`)

    , character_class: $ => seq(
      '[',
      optional('^'),
      repeat($.class_range),
      ']'
    )

    , class_range: $ => prec.right(
      seq($.class_atom, optional(seq('-', $.class_atom)))
    )

    , class_atom: $ => choice(
      '-',
      // NOT: \ ] or -
      /[^\\\]\-]/,
      choice(
        alias('\\-', $.identity_escape),
        $.character_class_escape,
        $._character_escape,
      )
    )

    , anonymous_capturing_group: $ =>
      seq('(', $.pattern, ')')

    , named_capturing_group: $ =>
      seq('(?<', $.group_name, '>', $.pattern, ')')

    , non_capturing_group: $ =>
      seq('(?:', $.pattern, ')')

    , zero_or_more: quantifierRule($ => '*')
    , one_or_more: quantifierRule($ => '+')
    , optional: quantifierRule($ => '?')
    , count_quantifier: quantifierRule($ => seq(
      '{',
      seq($.decimal_digits, optional(seq(',', $.decimal_digits))),
      '}'
    ))

    , backreference_escape: $ => seq('\\k', $.group_name)

    , decimal_escape: $ => /\\[1-9][0-9]+/

    , character_class_escape: $ => seq('\\', choice(
      /[dDsSwW]/,
      seq(/[pP]/, '{', $.unicode_property_value_expression, '}')
    ))

    , unicode_property_value_expression: $ => seq(
      optional(seq(alias($.unicode_property, $.unicode_property_name), '=')),
      alias($.unicode_property, $.unicode_property_value)
    )

    , unicode_property: $ => /[a-zA-Z_0-9]+/

    , _character_escape: $ => choice(
      $.control_escape,
      $.control_letter_escape,
      $.identity_escape
    )

    , identity_escape: $ => new RegExp(`\\\\[${SYNTAX_CHARS_ESCAPED}]`)

    // TODO: We should technically not accept \0 unless the
    // lookahead is not also a digit.
    // I think this has little bearing on the highlighting of
    // correct regexes.
    , control_escape: $ => /\\[bfnrtv0]/

    , control_letter_escape: $ => /\\c[a-zA-Z]/

    // TODO: This is an approximation of RegExpIdentifierName in the
    // formal grammar, which allows for Unicode names through
    // the following mechanism:
    //
    // RegExpIdentifierName[U]::
    //   RegExpIdentifierStart[?U]
    //   RegExpIdentifierName[?U]RegExpIdentifierPart[?U]
    //
    // RegExpIdentifierStart[U]::
    //   UnicodeIDStart
    //   $
    //   _
    //   \RegExpUnicodeEscapeSequence[?U]
    //
    // RegExpIdentifierPart[U]::
    //   UnicodeIDContinue
    //   $
    //   \RegExpUnicodeEscapeSequence[?U]
    //   <ZWNJ> <ZWJ>
    // RegExpUnicodeEscapeSequence[U]::
    //   [+U]uLeadSurrogate\uTrailSurrogate
    //   [+U]uLeadSurrogate
    //   [+U]uTrailSurrogate
    //   [+U]uNonSurrogate
    //   [~U]uHex4Digits
    //   [+U]u{CodePoint}
    , group_name: $ => /[A-Za-z0-9]+/

    , decimal_digits: $ => /\d+/
  }
})
