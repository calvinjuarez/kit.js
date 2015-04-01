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
	
})(window)
