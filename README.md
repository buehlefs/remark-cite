# `remark-cite`

Following [convention](https://github.com/micromark/micromark/discussions/56), this repository contains **three separate `npm` packages** related to support for [Pandoc-style](https://pandoc.org/MANUAL.html#extension-citations) citation syntax for the `remark` Markdown parser.

* `micromark-extension-cite` defines a new [syntax extension](https://github.com/micromark/micromark#syntaxextension) for `micromark`, which is responsible for converting markdown syntax to a token stream
* `mdast-util-cite` describes how to convert tokens output by `micromark-extension-cite` into either an HTML string or `mdast` syntax tree.
* `remark-cite` encapsulates the above functionality into a `remark` plugin.

For more information, see the individual folders for each package.

## Not Yet Implemented

The following features have not yet been implemented, but may be in the future.  Pull requests are most welcome!

* integration with rehype
* the plugin currently does not distinguish between 

## Contributing

Pull requests for bugfixes or new features / options are welcome.  Be aware that changes to the syntax extension `micromark-extension-cite` may also have an impact on the other two packages, and you will need to test all three.