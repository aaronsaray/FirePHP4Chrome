/**
 * Devtools script
 * 
 * gets ran once development tools are opened
 * Handles watching headers, parsing them, and sending them to the listener
 */

/**
 * main class for parsing all wildfire headers and creating messaging objects
 */
function FirePHP4Chrome() {};

/**
 * get Wildfire headers
 */
FirePHP4Chrome.getWildfireHeaders = function(HAR) {
	var headers = HAR.response.headers, wfHeaders = {};
	
	/** go through all headers on this request **/
	for (var i = 0; i < headers.length; i++) {
		/** if it matches wildfire, add it to the object **/
		if (/^X-Wf-/.test(headers[i].name)) {
			wfHeaders[headers[i].name] =  headers[i].value;
		}
	};
	
	return wfHeaders;
};

/**
 * Determines from the object of headers whether we support this version (0.2)
 */
FirePHP4Chrome.isProperProtocol = function(headerObject) {
	return headerObject['X-Wf-Protocol-1'] == 'http://meta.wildfirehq.org/Protocol/JsonStream/0.2';
};

/**
 * Parse out the command object from a header name/value
 */
FirePHP4Chrome.buildCommandObject = function(name, value) {
	var commandObject = null;
	
	/** means its an actual message-able item **/
	if (/^X-Wf-1-1-1-/.test(name)) {
		var parsedHeaderResponse = FirePHP4Chrome.parseHeaderForResponse(value);
		var metaObject = parsedHeaderResponse.metaObject;
		var message = parsedHeaderResponse.message;
		
		var headerType = metaObject.Type.toLowerCase();
		
		/** add in the label because its the same for all - table will add 'table' in if this is blank **/
		var params = [];
		if (metaObject.Label) {
			params.push(metaObject.Label);
		}
		
		/**
		 * here we either log the plain item, or fake it to be an info
		 */
		switch (headerType) {
			case 'debug':
			case 'log':
			case 'info':
			case 'warn':
			case 'error':
				params.push(message);
				commandObject = {
						type: headerType,
						params: params
				};
				if (metaObject.File) {
					commandObject.params.push(metaObject.File + ":" + metaObject.Line);
				}
				break;
		
			case 'group_start':
			case 'group':
			case 'group_collapsed':
				/**
				 * chrome supports group or collapsed group.  Headers come through as underscore, group, or group start
				 */
				var consoleGroupCommand = (headerType == 'group_collapsed' ? 'groupCollapsed' : 'group');
				params.push(message); 
				commandObject = {
						type: consoleGroupCommand,
						params: params
				}
				break;
			
			case 'groupend':
			case 'group_end':
				/**
				 * ending is either with a camel case (strtolowere'd here) or underscore
				 */
				params.push(message); 
				commandObject = {
						type: 'groupEnd',
						params: params
				}
				break;				
				
			case 'table':
				/**
				 * no built in functionality for table - so this gets it pretty enough.
				 * tables probably have a label mostly, so use that as the first row, otherwise just call it a table
				 */
				if (params.length == 0) {
					params.push('Table'); // add the label if there was no label
				}
				for (var i = 0; i < message.length; i++) {
					params.push("\n");
					params.push(message[i]);
				}
				commandObject = {
					type: "info",
					params: params
				};
				break;
				
			case 'trace':
				/**
				 * trace is much more complex of an object - get the top level item, then loop through it's traces and add to the array
				 */
				if (message.Message) {
					params.push(message.Message); //this was from the trace when it was executed
				}
				if (params.length == 0) {
					params.push('Stack Trace'); // rarely should this happen, but in case there is a trace with no message or label
				}

				params.push("\n"); //formatting makes it clearer to understand the order in the console
				params.push(FirePHP4Chrome.buildTraceObject(message));
				for (var i = 0; i < message.Trace.length; i++) {
					params.push("\n");
					params.push(FirePHP4Chrome.buildTraceObject(message.Trace[i]));
				}
				
				commandObject = {
						type: 'log',
						params: params
				};
				break;
				
			case 'exception':
				/**
				 * exception is very similar to trace - because it contains a trace in it. but note that the topmost
				 * object isn't matching of a trace - like how the main stack trace one does - this object is slightly different
				 * and so it has to be created properly. (like the Message is part of this first object instead of being a label/message)
				 */
				var exceptionObject = {
						Message: message.Message,
						Class: message.Class,
						File: message.File,
						Line: message.Line
				};
				params.push("Exception:\n");
				params.push(exceptionObject);
				params.push("\nStack trace:\n");
				for (var i = 0; i < message.Trace.length; i++) {
					params.push("\n");
					params.push(FirePHP4Chrome.buildTraceObject(message.Trace[i]));
				}

				commandObject = {
					type: 'log',
					params: params
				};
				break;
		}
	}
	
	return commandObject;
};

/**
 * This method parses out the values from the header that was matched as a wildfire header and a 1-1-1 property
 * It will send back an object with message and metaObject keys.
 * 
 */
FirePHP4Chrome.parseHeaderForResponse = function(value) {
	var parts = value.split('|');
	var logArray = JSON.parse(parts[1]);
	
	if (typeof logArray[0] === "undefined") {
		//note: on dump, you always have an object of a unknown key (which is hte label) and the payload - which can be any datatype
		// that's why this code is like this.
		var label = Object.keys(logArray).pop();
		var message = logArray[label];
		var metaObject = {
				Type: "log",
				Label: label
		};
	}
	else {
		var metaObject = logArray[0];
		var message = logArray[1];	
	}

	return {
		metaObject: metaObject,
		message: message
	}
};

/**
 * create an object from the header that can be easily logged for traces
 * note: rebuilding these objects instead of just slicing/parsing, so that the order of the properties is always predictable
 * fun fact: in the parent, all properties are capital, all children are lowercase. - I tried making less code-repetition
 * versions of this but they all ended up more complicated and longer in length
 */
FirePHP4Chrome.buildTraceObject = function(originalTraceObject) {
	var traceObject = {
			Class: (originalTraceObject.Class ? originalTraceObject.Class : originalTraceObject.class),
			Method: (originalTraceObject.Function ? originalTraceObject.Function : originalTraceObject.function),
			File: (originalTraceObject.File ? originalTraceObject.File : originalTraceObject.file),
			Line: (originalTraceObject.Line ? originalTraceObject.Line : originalTraceObject.line)
	};
	
	/** sometimes parameter is empty, depending on your code **/
	var parameters = (originalTraceObject.Args ? originalTraceObject.Args : originalTraceObject.args);
	if (parameters.length) {
		traceObject.Parameters = parameters;
	}

	return traceObject;
};

/**
 * on each completed request, check the HAR entry for our lovely headers
 */
chrome.devtools.network.onRequestFinished.addListener(
	function(request) {
		var wfHeaders = FirePHP4Chrome.getWildfireHeaders(request);
		if (FirePHP4Chrome.isProperProtocol(wfHeaders)) {
			
			/** sort them properly  - then loop through the sorted version **/
			var keys = Object.keys(wfHeaders);
			keys.sort();
			var name = '';
			for (var i = 0; i < keys.length; i++) {
				name = keys[i];
				var commandObject = FirePHP4Chrome.buildCommandObject(name, wfHeaders[name]);
				
				/** escape and then json encode the command to be sent to the other scripts **/
				if (commandObject) {
					chrome.extension.sendMessage(escape(JSON.stringify(commandObject)));
				}
				
			}
		}
	}	
);

/**
 * On load, make sure to remind that this only works on refresh
 */
var commandObject = {
	type: "info",
	message: "FirePHP4Chrome logging activated.  You may need to refresh this page."
};
chrome.extension.sendMessage(escape(JSON.stringify(commandObject)));