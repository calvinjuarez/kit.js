(function (window) {

	// The function below is meant to follow the method `recursivelyCompileKitFile...` from
	// https://github.com/bdkjones/Kit/blob/master/LPEngineKIT.m (ln 146).  Line numbers will
	// be indicated from time to time in reference to that file (as accessed in April 2015).
	
	var Compiler = function (path, variables, previousFiles) { //! ln 146
		var result = {}
		var fileName = path.split('/')[path.split('/').length - 1] // TODO: figure out fileName passing, for error reporting
		
		var forbiddenImportPaths = [] //! ln 166
		var fileError = false         //! ln 192
		var inputCode = ''            //! ln 193
		var comps     = []            //! ln 203
		
		var getInputCode = getFile(path).then(function (response) { inputCode = response; result = resume() }, function () { fileError = true })
		
		var compiledCode = ''
		var errorEncountered = false
		var lineCount = 1
		
		function resume() { // this is wrapped in a function to allow waiting for getting the initial file.
			
			// validate
			variables = variables || {} //! ln 153
			forbiddenImportPaths = previousFiles || []
			
			if (forbiddenImportPaths.indexOf(fileName) >= 0) { // handle looped importing
				result.successful = false
				result.resultMessage = 'Error: infinite import loop detected. (e.g. File A imports File B, which imports File A.) You must fix this before the file can be compiled.'
				return result
			}
			
			forbiddenImportPaths.push(fileName)
			
			//
			//  Read the file and tokenize its contents
			//
			if (fileError || !inputCode || !getInputCode) { // handle file error
				result.successful = false
				result.resultMessage = 'This file does not exist or could not be opened for reading: ' + path
				return result
			}
			
			comps = tokenizeString(inputCode)
			
			if (!comps) { // handle comp failure
				result.successful = false
				result.resultMessage = 'Failed to tokenize ' + fileName + '. (Is the file UTF-8 encoded? Ensure it is not malformed.)'
				return result
			}
			
			//console.log(comps.join('|,|').replace(/\n/g,'\\n').split('|,|'))
			
			// Process the tokens
			for (var currentComp = 0; currentComp < comps.length; currentComp++) { //! ln 226
				var compString           = comps[currentComp]
				var commentStartIndex    = compString.indexOf('<!--')
				var specialCommentString = ''
				var specialCommentPrefix = '' // Needed below in debug log statement. 
				var specialCommentSuffix = '' // Needed at end if user does something like "<!--$var-->suffix"
				var specialCommentComp   = 0  // Tracks the component that ends the special comment so we can advance to it at the end of this loop iteration, below
				var isSpecialComment     = false
				
				var keyword           = ''
				var predicate         = ''
				var fullCommentLength = 0
				var fullCommentBuffer = ''
				// Used below to record how far we've parsed the comment
				var currentFullCommentIndex = -1
				var keywordStarted    = false
				var predicateStarted  = false
				
				//
				//  Test comp to see if it starts a special comment.
				//
				if (commentStartIndex < 0) {
					// This component is not the start of a comment, so just move it over to the compiled string
					compiledCode += compString
					
					if (compString.length > 0) {
						var lastChar = compString[compString.length - 1]
						if (lastChar === '\n' || lastChar === '\r')
							lineCount++
					}
					
					continue // stop this iteration of the for loop
				} else { //! ln 259
					// This string DOES contain "<!--", so we need to see if it's a special comment
					
					// First, if the location is NOT zero, then the user did something like "texthere<!-- comment -->"
					// So we need to pull everything ahead of the comment start delimiter and throw it into the compiled output
					if (commentStartIndex !== 0) {
						specialCommentPrefix = compString.substring(0, commentStartIndex) // `.substring()` goes from index to index (or end)
						compiledCode += specialCommentPrefix
						compString = compString.substring(commentStartIndex)
					}
					
					// Test comments with no spaces: <!--@import someFile.html-->, <!--$someVar value-->, <!--$someVar=value-->
					// Comp must have at least 6 characters: the comment start delimiter, the key symbol (@ or $) and an alphabetic character after that.
					if (compString.length >= 6) {
						var keyChar  = compString[4] // immediately after '<!--'
						var peekChar = compString[5] // the char after keyChar
						isSpecialComment = ((/@|$/.test(keyChar)) && (/a-z/i.test(peekChar)))
					}
					// Test comments WITH spaces: <!-- @import someFile.html -->, <!-- $someVar = value-->, etc.
					// Look at the first character in the NEXT comp that doesn't start with whitespace to overcome comments like this: <!--    $var=value -->
					else { //! ln 283
						var testComp = currentComp
						while (testComp + 1 < comps.length) {
							testComp++
							var testString = comps[testComp]
							
							if (testString.length > 1) {
								var firstChar = testString[0]
								
								if (/\t| /.test(firstChar))
									continue
								else if (/@|$/.test(firstChar))
									isSpecialComment = /a-z/i.test(testString[1])
								
								break
							}
						}
					}
					
					if (!isSpecialComment) { //! ln 309
						compiledCode += compString
						
						// If this component has a newline, count it. Because of how we tokenize, the newline will ALWAYS be the final character in the component, if it exists.
						if (compString.length > 0 && (/\n|\r/.test(compString[compString.length - 1])))
							lineCount++
						
						continue
					} else { //! ln 309
						// We've got a special comment. String together all the comps from the current one to the next comp that contains the "-->" substring.
						for (specialCommentComp = currentComp; specialCommentComp < comps.length; specialCommentComp++) {
							var commentCompString = comps[specialCommentComp]
							var commentEndIndex = commentCompString.indexOf('-->')
							
							specialCommentString += commentCompString
							
							if (commentEndIndex >= 0) {
								// Is there any text after the "-->" in this comp? (Other than a newline.)
								// If so, we'll need to add that text to the compiled output once we handle this special comment, so save that text for later
								if (commentEndIndex !== commentCompString.length - 3 && commentEndIndex + 3 < commentCompString.length) { //! ln 343 – 346
									var possibleSuffix = commentCompString.substring(commentEndIndex + 3)
									
									if (!/\n\r|\n|\r/.test(possibleSuffix))
										specialCommentSuffix = possibleSuffix //! ln 351
								}
								
								break
							}
						}
					}
				}
				
				if (!specialCommentString) { //! ln 362
					errorEncountered = true
					result.successful = false
					result.resultMessage = 'Line ' + lineCount + ' of ' + fileName +
						': Found a Kit comment, but could not parse it into a full string. (Ensure that the file is UTF-8 encoded and not damaged.)'
					break  // out of the overall loop that goes through tokens.
				}
				
				//
				//  Parse the special comment for keyword and predicate
				//
				fullCommentLength = specialCommentString.length
				fullCommentBuffer = specialCommentString
				
				console.log(fullCommentBuffer)
				
				for (var i = 0; i < fullCommentLength; i++) {
					var current = fullCommentBuffer[i]
					currentFullCommentIndex++
					
					if (/@|$/.test(current)) {
						// Skip everything until we get to the first $ or @ character, which is the start of the keyword.
						keywordStarted = true
						keyword += current
						continue
					} else if (keywordStarted) {
						if (/\t| |=|:/.test(current))
							// If we hit a space, tab, equals sign or colon, stop
							break
						else if (current === '-')
							// If this is a hyphen, decide if it's part of the keyword or the beginning of the --> delimiter
							if (i + 2 < fullCommentLength) {
                        var peek = fullCommentBuffer[i + 1] + fullCommentBuffer[i + 2]
                        if (peek === '->')
									// if the next two characters are "->", the hyphen is part of the comment-end delimiter.
                        	break
                        else {
									keyword += current
									continue
                        }
							} else {
								// We don't have at least two slots left in the full comment. The comment is probably malformed, but we'll just roll with it.
								keyword += current
								continue
							}
						else {
							keyword += current
							continue
						}
					}
				}
				
				//  Now get the predicate (everything after the keyword) It may be nothing (e.g. <!--$useThisVar-->)
				
				for (i = currentFullCommentIndex; i < fullCommentLength; i++) {}
			}
			
			
			
			
		}
	}
	
	// Helpers
	
	function tokenizeString(str) { //! ln 785
		var comps    = []
		var inputStr = str
		var buffer   = '' //! ln 794
		
		for (var i = 0; i < str.length; i++) { //! ln 804
			var currentChar = inputStr[i]
			var shouldSplit =
				// always split on Space, Tab, and New Line (\n) characters
				(currentChar === ' ' || currentChar === '\t' || currentChar === '\n')    || //! ln 810 – 814
				// split on Return (\r) only if it's NOT immediately followed by a New Line
				(currentChar === '\r' && i + 1 < str.length && inputStr[i + 1] !== '\n') || //! ln 815 – 824
				// split between '>' and '<', in case <!-- $this sort of --><!-- $thing happens -->
				(currentChar === '>' && i + 1 < str.length && inputStr[i + 1] === '<')      //! ln 825 – 835
			
			buffer += currentChar // we can skip the buffer conditionals, since our vars can be as big as we need. //! ln 838 – 864
			
			if (shouldSplit || i + 1 === str.length) { //! ln 866 – 880
				comps.push(buffer)
				buffer = '' // gotta reset the buffer
			}
		}
		
		return comps
	}
	
	function getFile(path) {
		return new Promise(function (resolve, reject) {
			var request = new XMLHttpRequest()
			request.open('GET', path)
			request.onload = function() {
				if (request.response)
					resolve(request.response)
				else
					reject('Request goofed.')
			}
			request.onerror = function() {
				reject(Error('Network Error'))
			}
			request.send()
		})
	}
	
/*
	var srcPromise = getFile($input.value).then(
		  function (response) {
			src = response
		}
		, function (error) {
			console.error('Request goofed.')
		}
	)
*/
	
	window.compile = Compiler
})(window)
