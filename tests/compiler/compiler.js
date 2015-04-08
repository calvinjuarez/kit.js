(function (window) {

	// The function below is meant to follow the method `recursivelyCompileKitFile...` from
	// https://github.com/bdkjones/Kit/blob/master/LPEngineKIT.m (ln 146).  Line numbers will
	// be indicated from time to time in reference to that file (as accessed in April 2015).
	
	var Compiler = function (file, variables, previousFiles) { //! ln 146
		// file needs to be an object in format { path: 'path/or/whatever', contents: '...', error: false }
		
		var result   = {}
		var fileName = '' // TODO: figure out fileName passing, for error reporting
		
		var forbiddenImportPaths = [] //! ln 166
		var fileError = false         //! ln 192
		var inputCode = ''            //! ln 193
		var comps     = []            //! ln 203
		
		if (file.path && file.contents) {
			var pathParts = file.path.split('/')
			fileName = pathParts[pathParts.length - 1]
			inputCode = file.contents
		}
		
		var compiledCode     = ''
		var errorEncountered = false
		var lineCount        = 1
		
		//function resume() { // this is wrapped in a function to allow waiting for getting the initial file.
			
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
			if (fileError || !inputCode) { // handle file error
				result.successful = false
				result.resultMessage = 'This file does not exist or could not be opened for reading: ' + file.path
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
				var current, peek // used in the loops
				
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
									
									if (!/\r\n|\r|\n/.test(possibleSuffix))
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
				
				for (var i = 0; i < fullCommentLength; i++) { //! ln 390
					current = fullCommentBuffer[i]
					currentFullCommentIndex++
					
					if (/@|$/.test(current)) {
						// Skip everything until we get to the first $ or @ character, which is the start of the keyword. //! ln 397
						keywordStarted = true
						keyword += current
						continue
					} else if (keywordStarted) {
						if (/[\t =:]/.test(current))
							// If we hit a space, tab, equals sign or colon, stop
							break
						else if (current === '-')
							// If this is a hyphen, decide if it's part of the keyword or the beginning of the --> delimiter
							if (i + 2 < fullCommentLength) {
                        peek = fullCommentBuffer[i + 1] + fullCommentBuffer[i + 2]
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
				
				//  Now get the predicate (everything after the keyword) It may be nothing (e.g. <!--$useThisVar-->) //! ln 450
				
				for (var j = currentFullCommentIndex; j < fullCommentLength; j++) { //! ln 456
					current = fullCommentBuffer[j]
					if (/[\t \r\n=:]/.test(current) && !predicateStarted)
						// Skip all space, equals signs, tabs, colons, '\n' and '\r' until we find the first character that's NOT one of these.
						// Note: don't do "isAlphanumeric" check because some predicates will be: "../someFile.kit" (with quotes)
						continue
					else if (current === '-') {
						predicateStarted = true
						
						// If this is a hyphen, we need to see if it's part of the predicate, or part of the end-comment delimiter (-->)
						// Do we have at least 2 slots left in the string?
						if (j + 2 < fullCommentLength) {
							peek = fullCommentBuffer[j + 1] + fullCommentBuffer[j + 2]
							if (peek === '->') {
								// if the next two characters are "->", we've reached the end of the predicate.
								// if the LAST character we added to the predicate buffer was a space, delete it
								if (predicate[predicate.length - 1] === ' ')
									predicate = predicate.substring(0, predicate.length - 1 - 1)
								
								break
							} else {
								predicate += current
								continue
							}
						} else {
							// We don't have at least two slots left in the full comment. The comment is probably malformed, but we'll just roll with it.
							predicate += current
							continue
						}
					} else {
						predicateStarted = true  //! ln 509
						
						// This character is a generic one, or a space, tab, colon or equals sign found after the start of the predicate.
						predicate += current
						continue
					}
				}
				
				// The predicate may not exist (e.g. <!--$useThisVar-->), so be careful
				
				//
				//  Now that we've got a keyword and predicate (maybe), do something with them
				//
				if (keyword)
					if (/@import|@include/.test(keyword))
						// We have an import statement
						if (!predicate) {
							errorEncountered = true
							result.successful = false
							result.resultMessage = 'Line ' + lineCount + ' of ' + fileName +
								': Missing a filepath after the import/include keyword in this Kit comment: ' + specialCommentString
							break
						} else {
							// We allow comma-separated import lists: <!-- @import someFile.kit, otherFile.html -->
							var imports = predicate.split(',')
							// Idk what to do about these two lines. They're pretty CodeKit-specific.
							//NSFileManager *fm = [NSFileManager defaultManager]; //! ln 552
							//NSArray *frameworkFolders = [_rootCompiler allPossibleFoldersForImportedFrameworkFiles]; //! ln 553
							for (var k = 0; k < imports.length; k++) { //! ln 555
								//var importString = imports[k]
								//var fileFound = false
								
								// I'm actually just gonna deal with this bit later.  #asyncproblems
							}
							
							if (errorEncountered) break // out of the overall "comps" loop. //! ln 667
						}
					else //! ln 670
						// We have a variable
						if (predicate)
							// If we've got a predicate, we're assigning a value to this variable
							variables[keyword] = predicate
						else //! ln 678
							if (variables[keyword]) //! ln 682
								compiledCode += variables[keyword] //! ln 684
							else {
								errorEncountered = true
								result.successful = false
								result.resultMessage = 'Line ' + lineCount + ' of ' + fileName + ': The variable ' + keyword + ' is undefined.'
								break
							}
				else { //! ln 696
					// Keyword was nil, which is a massive error at this point.
					errorEncountered = true
					result.successful = false
					result.resultMessage = 'Line ' + lineCount + ' of ' + fileName +
						': Unable to find an appropriate keyword (either "@import"/"@include" or a variable name) in this Kit comment: ' +
						specialCommentString
					break
				}
				
				//
				//  It's possible (likely) that the special comment contained one or more newlines, which we need to account for.
				//  Otherwise, next time we use it the lineCount will be missing the newlines in this special comment and will not indicate the correct line.
				//
				for (var l = 0; l < fullCommentLength; l++) { //! ln 711
					current = fullCommentBuffer[l]
					
					if (current === '\n')
						lineCount++ //! ln 717
					else if (current === '\r')
						// if this is a '\r', count it as a newline ONLY if the very next character is not a '\n'
						if (l + 1 < fullCommentLength && fullCommentBuffer[l + 1] !== '\n')
							lineCount++ //! ln 725
				}
				
				//  If we had any text after the special comment's closing tag (e.g. "-->textHere"), add that:
				if (specialCommentSuffix)
					compiledCode += specialCommentSuffix
				
				//  Advance the 'currentComp' number to skip all components involved in the special comment we just handled.
				//  This removes the special comment from the compiled output.
				currentComp = specialCommentComp
			}
			
			//
			//  After handling all of the tokenized comps:
			//
			if (!errorEncountered) { //! ln 743
				result.compiledCode = compiledCode
				result.successful = true
				result.resultMessage = 'Compiled successfully.'
			}
			
			return result
			
		//}
	}
	
	// Helpers
	
	function tokenizeString(str) { //! ln 785
		var comps    = []
		var inputStr = str
		var buffer   = '' //! ln 794
		
		for (var i = 0; i < str.length; i++) { //! ln 804
			var currentChar = inputStr[i]
			var peekChar    = inputStr[i + 1]
			var shouldSplit =
				(currentChar === ' ' || currentChar === '\t' || currentChar === '\n')      || //! ln 810 – 814
				// split on Return (\r) only if it's NOT immediately followed by a New Line
				(currentChar === '\r' && (i + 1) < str.length && inputStr[i + 1] !== '\n') || //! ln 815 – 824
				// split between '>' and '<', in case <!-- $this sort of --><!-- $thing happens -->
				(currentChar === '>' && (i + 1) < str.length && inputStr[i + 1] === '<')      //! ln 825 – 835
			
			buffer += currentChar // we can skip the buffer conditionals, since our vars can be as big as we need. //! ln 838 – 864
			
			if (shouldSplit || i + 1 === str.length) { //! ln 866 – 880
				comps.push(buffer)
				buffer = '' // gotta reset the buffer
			}
		}
		
		// Testing Sean's Regex
		
		var compsArr = comps
			.join('§')
			.replace(/\r/g,'⏎')
			.replace(/\n/g,'¶')
			.replace(/\t/g,'⇥')
			.replace(/\s/g,'·')
			.split('§')
		
		var matchArr = inputStr.match(/(>(?!<)|[^\s>])*(\r\n|\s|>(?=<)|$)/g)
			.join('§')
			.replace(/\r/g,'⏎')
			.replace(/\n/g,'¶')
			.replace(/\t/g,'⇥')
			.replace(/\s/g,'·')
			.split('§')
		
		var matchLast = matchArr.pop()
		if (matchLast.length > 0) matchArr.push(matchLast)
		
		for (var j = 0; j < compsArr.length; j++) {
			console.log('Same? ' + (compsArr[j] == matchArr[j]))
			console.log('\tcomps: "' + compsArr[j] + '"\n\tmatch: "' + matchArr[j] + '"')
		}
		console.log('Arrays are the same? ' + (compsArr.length === matchArr.length))
		if (compsArr.length !== matchArr.length)
			console.log('lengths:', compsArr.length, matchArr.length)
		
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
	
	window.compile = Compiler
})(window)
