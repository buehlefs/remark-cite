////////////////////////////////////////////////////////////

/**
 * Converts a token stream produced by the syntax extension
 * directly to HTML, with no intermediate AST.  For example,
 *
 * These functions rely on some unknown global state, so
 * if the input token stream is invalid, this function will
 * likely produce mysterious, difficult-to-diagnose errors.
 */
function html() {

  // ---- inlineCite ---------------------------------- //
  function enterInlineCite() {
    var stack = this.getData('inlineCiteStack');
    if (!stack) this.setData('inlineCiteStack', stack = []);
    stack.push({
      items: []
    });
  }

  function exitInlineCite(token) {
    var inlineCite = this.getData('inlineCiteStack').pop(); // gather citation data

    var classNames = "citation";
    var citeItems = (inlineCite === null || inlineCite === void 0 ? void 0 : inlineCite.items) || [];
    var citeKeys = citeItems.map(function (item) {
      return item.key;
    }).join(" ");
    var citeText = this.sliceSerialize(token); // html output

    this.tag("<span class=\"".concat(classNames, "\" data-cites=\"").concat(citeKeys, "\">"));
    this.raw(citeText);
    this.tag('</span>');
  } // ---- citeItemKey --------------------------------- //


  function exitCiteItemKey(token) {
    var citeKey = this.sliceSerialize(token);
    var stack = this.getData('inlineCiteStack');
    var current = top(stack);
    current.items.push({
      key: citeKey
    });
  }

  function top(stack) {
    return stack[stack.length - 1];
  } // -------------------------------------------------- //


  return {
    enter: {
      inlineCite: enterInlineCite
    },
    exit: {
      inlineCite: exitInlineCite,
      citeItemKey: exitCiteItemKey
    }
  };
}

// html converts token stream directly to html
/**
 * Adds support for [`pandoc`-style citations](https://pandoc.org/MANUAL.html#citations-in-note-styles)
 * to `micromark`.  Here are some examples of valid citations:
 *
 *    ```txt
 *    [@wadler1990:comprehending-monads]          --> (Wadler 1990)
 *    [-@wadler1990]                              --> (1990)
 *    [@hughes1989, sec 3.4]                      --> (Hughes 1989, sec 3.4)
 *    [see @wadler1990; and @hughes1989, pp. 4]   --> (see Wadler 1990 and Hughes 1989, pp. 4)
 *    ```
 *
 * This extension introduces a new `unist` node type.
 *
 *     interface CitationInfo {
 *         prefix?: string;
 *         key: string;
 *         suffix?: string;
 *     }
 *
 *     interface Citation <: Literal {
 *         type: "citation"
 *         data: {
 *             citeItems: CitationInfo[]
 *         }
 *     }
 */

var citeExtension = function citeExtension(options) {
  // handle user configuration
  var settings = Object.assign({
    enableAltSyntax: false,
    enablePandocSyntax: true
  }, options); // starting point for both pandoc-style and alternative syntax

  var citeStart = {
    tokenize: citeTokenize
  }; // hooks

  var text = {}; // activate pandoc-style syntax

  if (settings.enablePandocSyntax) {
    text[91] = citeStart;
  } // activate alternative syntax


  if (settings.enableAltSyntax) {
    text[64] = citeStart;
  } // assemble extension


  return {
    text: text
  };
}; ////////////////////////////////////////////////////////////

/**
 * Entry-point for the citation tokenizer.
 *
 */

var citeTokenize = function citeTokenize(effects, ok, nok) {
  // variables to keep track of parser state
  var parseState = {
    /** helps detect empty citation keys */
    nonEmptyKey: false,

    /** note that this variable is only updated when we are looking
      * for a prefix->key transition, when need to know whether the
      * most recently consumed character was a space.               */
    lastWasSpace: false
  };
  return start;

  function start(code) {
    // match left square bracket `[`
    if (code === 91) {
      effects.enter("inlineCite");
      effects.enter("inlineCiteMarker");
      effects.consume(code);
      effects.exit("inlineCiteMarker"); // start looking for a citeItem

      return consumeCiteItem;
    } // match at symbol `@`
    else if (code === 64) {
        effects.enter("inlineCite");
        effects.enter("inlineCiteMarker_alt");
        effects.consume(code); // start looking for a citeItem

        return alt_consumeLeftBracket;
      } // invalid starting character
      else {
          return nok(code);
        }
  }
  /*
   * (Alternative Syntax) See `enableAltSyntax` option.
   */


  function alt_consumeLeftBracket(code) {
    // match left square bracket `[`
    if (code === 91) {
      // consume bracket
      effects.consume(code);
      effects.exit("inlineCiteMarker_alt"); // skip prefix, start looking for cite key

      effects.enter("citeItem");
      effects.enter("citeItemKey");
      return consumeCiteItemKey;
    } // if we see a different character, this is not a citation


    return nok(code);
  }

  function consumeCiteItem(code) {
    // we haven't found any content yet
    parseState.nonEmptyKey = false;
    effects.enter("citeItem"); // match at symbol `@`, beginning the citation key

    if (code === 64) {
      // consume at symbol, which is not considered part of the key
      effects.enter("citeItemSymbol");
      effects.consume(code);
      effects.exit("citeItemSymbol"); // next, get the text of the key

      effects.enter("citeItemKey");
      return consumeCiteItemKey;
    } // otherwise, we have a non-empty prefix


    parseState.lastWasSpace = false;
    effects.enter("citeItemPrefix");
    return consumeCiteItemPrefix(code);
  }

  function consumeCiteItemPrefix(code) {
    // match at symbol `@`, indicating end of prefix
    if (code === 64) {
      // the prefix end with a space character
      if (!parseState.lastWasSpace) {
        return nok(code);
      } // indicate end of prefix, start of data


      effects.exit("citeItemPrefix"); // consume at symbol, which is not considered part of the key

      effects.enter("citeItemSymbol");
      effects.consume(code);
      effects.exit("citeItemSymbol"); // next, get the text of the key

      effects.enter("citeItemKey");
      return consumeCiteItemKey;
    }
    // at symbol, then this is not actually a citation token, so we stop

    if (code === 93 || code === null) {
      return nok(code);
    } // otherwise, consume the next character of the prefix


    parseState.lastWasSpace = code === 32;
    effects.consume(code);
    return consumeCiteItemPrefix;
  }

  function consumeCiteItemKey(code) {
    // pandoc is specific about which characters are allowed
    // in a citation key, but since javascript has no multi-
    // lingual way to test for alphanumeric characters, we
    // allow any characters EXCEPT whitespace and `];`
    // match right square bracket `]` or item sep `;` to handle empty keys
    if (code === 93 || code == 59) {
      // handle empty key like `[prefix @]`
      if (!parseState.nonEmptyKey) {
        return nok(code);
      }

      effects.exit("citeItemKey"); // this item had no suffix

      effects.exit("citeItem"); // match right square bracket `]`, indicating end of inlineCite node

      if (code === 93) {
        // continue without consuming the closing bracket `]`
        return consumeCiteEnd(code);
      } // match semicolon `;`, indicating, the end of the current citeItem


      if (code === 59) {
        // consume item separator `;`
        effects.enter("citeItemSep");
        effects.consume(code);
        effects.exit("citeItemSep"); // continue to the next item

        return consumeCiteItem;
      }
    } // match space or comma, indicating start of suffix


    if (code === 32 || code === 44) {
      // handle empty key like `[prefix @, suffix]`
      if (!parseState.nonEmptyKey) {
        return nok(code);
      }

      effects.exit("citeItemKey"); // continue to suffix, without consuming character
      // (this character belongs to the suffix, so suffix is non-empty)

      effects.enter("citeItemSuffix");
      return consumeCiteItemSuffix(code);
    } // CR, LF, CRLF, HT, VS (whitespace, EOLs, EOF)


    if (code === null || code < 0) {
      return nok(code);
    }

    parseState.nonEmptyKey = true; // otherwise, continue consuming characters

    effects.consume(code);
    return consumeCiteItemKey;
  }

  function consumeCiteItemSuffix(code) {
    // fail on eof
    if (code === null) {
      return nok(code);
    } // match right square bracket `]`, indicating end of inlineCite node


    if (code === 93) {
      // we're done!  close this item and finish up
      effects.exit("citeItemSuffix");
      effects.exit("citeItem"); // continue without consuming the closing bracket `]`

      return consumeCiteEnd(code);
    } // match semicolon `;`, indicating, the end of the current citeItem


    if (code === 59) {
      effects.exit("citeItemSuffix");
      effects.exit("citeItem"); // consume item separator `;`

      effects.enter("citeItemSep");
      effects.consume(code);
      effects.exit("citeItemSep"); // continue to the next item

      return consumeCiteItem;
    } // otherwise, continue consuming characters


    effects.consume(code);
    return consumeCiteItemSuffix;
  }

  function consumeCiteEnd(code) {
    // match right square bracket `]`
    if (code !== 93) {
      return nok(code);
    } // consume closing bracket `]`


    effects.enter("inlineCiteMarker");
    effects.consume(code);
    effects.exit("inlineCiteMarker");
    effects.exit("inlineCite"); // we're all done!

    return ok;
  }
};

export { citeExtension, html };
//# sourceMappingURL=index.umd.js.map
