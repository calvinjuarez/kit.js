_**Note:** Kit.js is currently in **very early** development and is not ready for use anywhere. If you'd like to contribute, hit me up [on Twitter][@calvinjuarez] or something._

# Kit.js

Kit.js is a JavaScript port of [@bdkjones]'s awesome [Kit] language.


## About the Kit Language

Kit adds two things to standard HTML: include statements and variables. You can read about how to use it at [incident57.com/codekit/help.html#kit][Kit]. A _*.kit_ file is HTML with special comments. Kit compiles to HTML, so the Kit language is great for building static sites.

The original Kit compiler (as implemented in [CodeKit]) is open source, and is available at [github.com/bdkjones/Kit][Kit repo].


## About This Project

Kit.js is intended to adhere fairly closely to the original implementation of the Kit compiler in CodeKit. As such, it'll follow the [design] outlined by Bryan Jones. He explains it best, so head there if you have questions about that.

Because Kit is pretty well spec'd out on CodeKit's [Kit Language][Kit] help page, and because I'm pretty happy using Kit as it is now, I don't plan to fold in a ton of features here. If you feel like something's missing from the language, I suggest submitting a [feature request][issues] over on the original Kit repo.


## License

The Kit Compiler was originally written by Bryan D K Jones in the fall of 2012. Kit.js was written by Calvin Juárez in 2015. Like the [original][license], the code in this repository is released under an MIT license.


[@calvinjuarez]: https://twitter.com/calvinjuarez
[@bdkjones]:     https://github.com/bdkjones
[Kit]:           http://incident57.com/codekit/help.html#kit "CodeKit — Help : Languages — Kit"
[CodeKit]:       http://incident57.com/codekit/ "CodeKit: THE Mac App For Web Developers"
[Kit repo]:      https://github.com/bdkjones/Kit "bdkjones/Kit"
[design]:        https://github.com/bdkjones/Kit#design- "bdkjones/Kit#design-"
[license]:       https://github.com/bdkjones/Kit#license "bdkjones/Kit#license"
[issues]:        https://github.com/bdkjones/Kit/issues "bdkjones/Kit/issues"
