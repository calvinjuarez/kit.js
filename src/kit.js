/*!
 * kit.js
 *
 * @author: Calvin Juárez http://calvinjuarez.com
 * @license: MIT http://www.opensource.org/licenses/mit-license.php/
 *
 * Copyright (c) 2015 Calvin Juárez
 */


var LPEngineKIT = function (src, options) { this.init(src, options) }

LPEngineKIT.prototype = {
	
	  constructor: LPEngineKIT
	
	, init: function(src, options) {
		this.src = src
		this.options = options
		return this
	}
}
