/*!
 * kit.js
 *
 * @author: Calvin Juárez http://calvinjuarez.com
 * @license: MIT http://www.opensource.org/licenses/mit-license.php/
 *
 * Copyright (c) 2015 Calvin Juárez
 */


(function (window, undefined) {
	
	var defaults = {
		debug: false
	}
	
	
	//! Constructor
	
	var LPEngineKIT = function (src, options) {
		
		// set properties
		this.options = prepareOptions(options)
		this.src     = prepareSrc(src)
		this.path    = src !== this.src ? src : null  // save `src` to `this.path` if the original src is different to the prepared src
		
		// init
		return this.init()
	}
	
	
	//! Public Methods
	
	LPEngineKIT.prototype = {
		
		  constructor: LPEngineKIT
		
		, init: function() {
			return this
		}
	}
	
	
	//! Private Methods
	
	//! -- Utilities
	
	function prepareOptions(options) {
		if (!options) return defaults // JIC, really.  Might should error instead.
		
		var option
		
		// cleanse options of useless properties
		for (option in options)                                                                           // for each passed option,
			if (Object.prototype.hasOwnProperty.call(options, option) && !defaults.hasOwnProperty(option)) //    if it exists in `options` but _not_ in `defaults`,
				delete options[option]                                                                      //    dump it.
		
		// merge defaults into options, favoring options
		for (option in defaults)                                                                          // for each available option,
			if (defaults.hasOwnProperty(option) && !Object.prototype.hasOwnProperty.call(options, option)) //    if it exists in `defaults` but _not_ in `options`,
				options[option] = defaults[option]                                                          //    let `options` have the default option.
		
		return options
	}
	
	function prepareSrc(src) {
		if (!src) return false // replace with error
		
		if (src.indexOf('\n') >= 0) // no chance that src is a valid path
			return src
		else {
			var contents = ''
			
			getFile(src).then(
				  function (response) {
					contents = response // or something
				}
				, function (error) {
					var noFile = false
					
					// decide whether the error was that the file doesn't exist, because then it may be that `src` was a single-line source, so we'll want to use that
					
					if (noFile)
						contents = src
					else
						console.error(error)
				}
			)
			
			return contents
		}
	}
	
	function getFile(path) {
		// this was pretty much copied from http://www.html5rocks.com/en/tutorials/es6/promises/
		return new Promise(function (resolve, reject) {
			var request = new XMLHttpRequest()
			
			request.open('GET', path)
			
			request.onload = function() {
				// This is called even on 404 etc
				// so check the status
				if (request.status == 200)
					// Resolve the promise with the response text
					resolve(request.response)
				else
					// Otherwise reject with the status text
					// which will hopefully be a meaningful error
					reject(Error(request.statusText))
			}
			
			// Handle network errors
			request.onerror = function() {
				reject(Error("Network Error"))
			}
			
			// Make the request
			request.send()
		})
	}
	
})(window)
