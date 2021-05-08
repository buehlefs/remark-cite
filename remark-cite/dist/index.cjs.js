'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var micromarkExtensionCite = require('@benrbray/micromark-extension-cite');
var mdastUtilCite = require('@benrbray/mdast-util-cite');

var warningIssued = false;

function remarkV13Warning(context) {
  if (!warningIssued && (context.Parser && context.Parser.prototype && context.Parser.prototype.blockTokenizers || context.Compiler && context.Compiler.prototype && context.Compiler.prototype.visitors)) {
    warningIssued = true;
    console.warn('[remark-cite] Warning: please upgrade to remark 13 to use this plugin');
  }

  return warningIssued;
}

function citePlugin(options) {
  var data = this.data(); // warn for earlier versions

  remarkV13Warning(this);
  add('micromarkExtensions', micromarkExtensionCite.citeSyntax(options));
  add('fromMarkdownExtensions', mdastUtilCite.citeFromMarkdown);
  add('toMarkdownExtensions', mdastUtilCite.citeToMarkdown);

  function add(field, value) {
    if (data[field]) data[field].push(value);else data[field] = [value];
  }
}

exports.citePlugin = citePlugin;
//# sourceMappingURL=index.cjs.js.map
