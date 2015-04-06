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
		  dev : false
		, env : 'file' // 'file' || 'browser' // (planned) || 'node'
	}
	var expected = {
		  env : ['file', 'browser']
	}
	
	
	//! Constructor
	
	var LPEngineKIT = function (src, options) {
		if (options.dev || this.options.dev) console.log('New `LPEngineKIT` created.')
		
		// process arguments
		this.setOptions(options) // sets `this.options`
		this.setSrc(src)         // sets `this.src`
		
		// set (or set up) other properties
		this.srcID  = null // `this.setSrc()` will set this property *if* it would be different to `this.src`
		this.result = ''   // set by `process()` (private method)
		this.events = {}   // an object for collecting custom events
		this.handlers = []
		
		// init
		this.init()
	}
	
	
	//! Public Methods
	
	LPEngineKIT.prototype = {
		
		  constructor: LPEngineKIT
		
		, init: function () {
			// create custom events
			this.events.init = new CustomEvent('init', { detail: null }) // see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
			
			// add event listeners
			this.addEventListener('init', function () { console.log('Works!') })
			
			this.dispatchEvent(this.events.init)
			
			return this
		}
	
		, setOptions: function (options) {
			if (options.dev || this.options.dev) console.log('> Begin `setOptions()`')
			
			// validate
			if (!options || Object.prototype.toString.call(options) !== '[object Object]')
				return (this.options = this.options || defaults) && true
			
			// execute
			var option
			
			// -- cleanse options of useless properties
			for (option in options)                                                                           // for each passed option,
				if (Object.prototype.hasOwnProperty.call(options, option) && !defaults.hasOwnProperty(option)) //    if it exists in `options` but _not_ in `defaults`,
					delete options[option]                                                                      //    dump it.
			
			// -- merge defaults into options, favoring options
			for (option in defaults)                                                                          // for each available option,
				if (defaults.hasOwnProperty(option) && !Object.prototype.hasOwnProperty.call(options, option)) //    if it exists in `defaults` but _not_ in `options`,
					options[option] = defaults[option]                                                          //    let `options` have the default option.
			
			// -- set this.options
			this.options = options
			
			// -- warn when specific options have unexpected values
			// -- -- `options.env`
			if (expected.env.indexOf(this.options.env) < 0)
				console.warn('FYI: The `env` option wasn\'t one of the expected values ("' + expected.env.join('", "') + '").'
					, '\n     The code will fall back on the "file" environment. If you intended to use'
					, '\n     a different environment, double-check that the `env` option you specified'
					, '\n     is spelled correctly.')
			
			if (this.options.dev) console.log('> End   `setOptions()`')
			
			// -- success
			return true
		}
		
		, getSrc: function () {
			return this.src
		}
		
		, setSrc: function (src) {
			if (this.options.dev) console.log('> Begin `setSrc()`')
			
			// validate
			// -- validate argument(s)
			if (!src)
				src = this.src || ''
			
			// -- avoid the file request if there's no chance `this.src` is a path
			if (src.indexOf('\n') >= 0 && src.indexOf('\r') >= 0) // the presence of '\n' or '\r' means the `src` cannot be a valid path
				// -- success
				return (this.src = src) && true // we'll assume what was passed was a kit string, rather than a src id
			
			// execute
			this.srcID = src // we save the previous `src` to `srcID`
			
			var err = null
			
			switch (this.options.env) { // —> `if ... else if` ?
				
				// -- in-browser use case, via textareas
				case 'browser':
					if (this.options.dev) console.log('  > `setSrc()` used "browser" case')
					
					// -- -- set this.src
					this.src = getSrcFromElement(this.src)
					
					break
				
				// -- basic use case, where we compile actual files (also the default)
				default:
				case 'file':
					if (this.options.dev && this.options.env !== 'file') console.log('  > `options.env` was invalid (somehow)')
					if (this.options.dev) console.log('  > `setSrc()` used "file" case')
					
					var self = this
					
					getSrcFromFile(src).then( // this is a Promise; it'll set `this.src` in it's own good time
						// resolve()
						  function (response) {
							if (self.options.dev) console.log('    > Request `getSrcFromFile()` succeeded with the following response:\n\n' + response + '\n')
							self.srcID = self.src 
							self.src   = response
							process.call(self)
						}
						// reject()
						, function (error) {
							if (self.options.dev) console.log('    > Request `getSrcFromFile(' + self.src + ')` failed.')
							
							var noFile = true
							
							// decide whether the error was that the file doesn't exist, because then it may be
							// that `src` was a single-line source, so we'll want to use that otherwise, we'll
							// maybe want to error properly. "This src sux, pick a better one."
							
							if (noFile)
								self.src = src
							else
								console.error(error)
						}
					)
					
					break
				
			}
			
			if (this.options.dev) console.log('> End   `setSrc()`')
			
			if (err !== null) // then there's an error
				return console.error(err) && false // returning false to signify error
			
			// -- success
			return true
		}
		
		, getResult: function () {
			if (!this.result)
				process.call(this)
			return this.result
		}
		
		// Event Handling
		
		, on: function(event, handler) {
			var self = this
			
			// add event to the list of events and handlers or something
			
			return { self: self, event: event, handler: handler }
		}
		
		, trigger: function(event) {
			return event
		}
		
		/*
		var addEventListener=function(type, listener) {
			var self=this;
			var wrapper=function(e) {
				e.target=e.srcElement;
				e.currentTarget=self;
				if (listener.handleEvent) {
					listener.handleEvent(e);
				} else {
					listener.call(self,e);
				}
			};
			if (type=="DOMContentLoaded") {
				var wrapper2=function(e) {
					if (document.readyState=="complete") {
						wrapper(e);
					}
				};
				document.attachEvent("onreadystatechange",wrapper2);
				eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper2});
				
				if (document.readyState=="complete") {
					var e=new Event();
					e.srcElement=window;
					wrapper2(e);
				}
			} else {
				this.attachEvent("on"+type,wrapper);
				eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper});
			}
		};
		var removeEventListener=function(type, listener) {
			var counter=0;
			while (counter<eventListeners.length) {
				var eventListener=eventListeners[counter];
				if (eventListener.object==this && eventListener.type==type && eventListener.listener==listener) {
					if (type=="DOMContentLoaded") {
						this.detachEvent("onreadystatechange",eventListener.wrapper);
					} else {
						this.detachEvent("on"+type,eventListener.wrapper);
					}
					eventListeners.splice(counter, 1);
					break;
				}
				++counter;
			}
		};
		*/
	}
	
	
	//! Private Methods
	
	//! -- Process
	
	function process() {
		if (!this.src)
			console.error('Sorry, there\'s no source, somehow.')
		
		var result = this.src
		
		// process src here
		
		this.result = result
		
	}
	
	//! -- Utilities
	
	function getSrcFromFile(path) {
		return new Promise(function (resolve, reject) { // TODO: consider polyfilling Promise
			var request = new XMLHttpRequest()
			
			request.open('GET', path)
			
			// handle a valid response (even if that's 404 or some other request error)
			request.onload = function() {
				if (request.response) // resolve the promise with the response text
					resolve(request.response)
				else // otherwise reject with the status text which will hopefully be a meaningful error
					reject(request)
			}
			
			// handle network errors
			request.onerror = function() {
				reject(Error('Network Error'))
			}
			
			// make the request
			request.send()
		})
	}
	
	function getSrcFromElement(id) {
		this.srcID = id
		this.src   = document.getElementById(id).innerHTML
	}
	
	
	//! Ghetto Export
	
	window.LPEngineKIT = LPEngineKIT
	
})(window)
