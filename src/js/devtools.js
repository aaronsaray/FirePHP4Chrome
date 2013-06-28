/**
 * Devtools script
 * 
 * gets ran once development tools are opened
 * Handles watching headers, parsing them, and sending them to the listener
 * @author Aaron Saray aaron@aaronsaray.com
 */

/**
 * main class for parsing all wildfire headers and creating messaging objects
 */
function FirePHP4Chrome() {

    /**
     * Public method that is ran on network requests finishing
     *
     * This method is used to determine if there are any firePHP Headers in here, and if so, send messages to background.js
     * @param request is a HAR entry
     */
    this.processHeaders = function(request) {
        var wfHeaders = _getWildfireHeaders(request);
        if (_isProperProtocol(wfHeaders)) {
        	var sortedHeaders = _getSortedMessageHeaders(wfHeaders);

	        /**
        	 * now loop through and build objects from these results
        	 * remember to combine multi line ones
        	 */
        	var headerValue = '';
        	for (var i = 0; i < sortedHeaders.length; i++) {
        		var currentHeader = sortedHeaders[i].replace(/^\d*\|/, '');
        		var parts = currentHeader.split('|');
        		headerValue += parts[0];
        		if (parts[1] == '\\') {
        			/** its multipart so get next part **/
        			continue;
        		}
        		var commandObject = _buildCommandObject(headerValue);
        		if (commandObject) {
        			_sendCommandObject(commandObject);
        		}
        		headerValue = '';
        	}

	        /** handle truncated message **/
	        if (_isTruncatedResponse(wfHeaders)) {
		        var bytes = wfHeaders['x-wf-notify-truncated']; //note: the final format has not yet been defined for this
		        var commandObject = {
			        type: "info",
			        params: ["FirePHP has truncated headers for Chrome.  Truncated bytes: " + bytes]
		        };
		        _sendCommandObject(commandObject);
	        }

        }
    };

    /**
     * Used to alert the user that they may need to refresh the page on first devtools.js load
     */
    this.sendFirstLoadMessage = function() {
        var commandObject = {
            type: "info",
            params: ["FirePHP4Chrome logging activated.  You may need to refresh this page."]
        };
        _sendCommandObject(commandObject);
    };

    /**
     * This method is used to encode and send the commandObject using chrome's method and my serialization
     * @param commandObject
     * @private
     */
    var _sendCommandObject = function(commandObject) {
        chrome.extension.sendMessage(escape(JSON.stringify(commandObject)));
    };

    /**
     * parses through the response headers to pull out only wildfire headers
     *
     * @param HAR A HAR entry
     * @return {Object} headers that are only wildfire
     * @private
     */
    var _getWildfireHeaders = function(HAR) {
        var headers = HAR.response.headers, wfHeaders = {};

        /** go through all headers on this request **/
        for (var i = 0; i < headers.length; i++) {
            /** if it matches wildfire, add it to the object **/
            if (/^X-Wf-/i.test(headers[i].name)) {
                wfHeaders[headers[i].name.toLowerCase()] =  headers[i].value;
            }
        };

        return wfHeaders;
    };

    /**
     * This works with all known wildfire headers, and sorts all of the message headers numerically
     * 
     * @param wfHeaders an object of headers matching wildfire specifications
     * @return {array} headers in proper order to be either messaged or combined
     */
    var _getSortedMessageHeaders = function(wfHeaders) {
    	/** we can't guarantee the order of any headers, so they need to be sorted properly **/
    	var sortedHeaders = [];
    	for (var key in wfHeaders) {
    		if (/^x-wf-1-1-1-/.test(key)) {
    			/** new key is minus one because our array needs to start at 0 for JS to sort it properly **/
    			var newKey = parseInt(key.replace('x-wf-1-1-1-', '')) - 1;
    			sortedHeaders[newKey] = wfHeaders[key];
    		}
    	}
    	return sortedHeaders;
    }

    /**
     * Determines if the header that we're receiving is of the proper protocol (0.2)
     *
     * @return boolean
     * @private
     * @param headerObject
     */
    var _isProperProtocol = function(headerObject) {
        return headerObject['x-wf-protocol-1'] == 'http://meta.wildfirehq.org/Protocol/JsonStream/0.2';
    };

	/**
	 * Determines if there is a truncated alert
	 * @param wfHeaders
	 * @returns {boolean}
	 * @private
	 */
	var _isTruncatedResponse = function(wfHeaders) {
		return wfHeaders['x-wf-notify-truncated'] != undefined;
	};

    /**
     * Build the commandObject object that is sent to the messenger
     *
     * This takes a header string formatted from a request that has been either singular 
     * or combined from multiple headers and then builds the proper commandObject from them.  This method is where
     * it determines if its log, warn, table, etc.
     *
     * @param value the value of the header
     * @private
     * @return {Object} the special commandObject with properties of type, and params
     */
    var _buildCommandObject = function(value) {
        var commandObject = null;

        var parsedHeaderResponse = _parseHeaderForResponse(value);
        
        var metaObject = parsedHeaderResponse.metaObject;
        var message = parsedHeaderResponse.message;

        var headerType = metaObject.Type.toLowerCase();

        /** add in the label because its the same for all except for table **/
        var params = [];
        if (headerType != 'table' && metaObject.Label) {
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
                 * chrome supports group or collapsed group.  Headers come through as underscore, group, or group start in some versions of the library
                 */
                var consoleGroupCommand = (headerType == 'group_collapsed' ? 'groupCollapsed' : 'group');

	            /**
	             * in other libraries, it sends a collapsed = true header
	             */
	            if (metaObject.Collapsed) {
		            if (metaObject.Collapsed == 'true') {
			            consoleGroupCommand = 'groupCollapsed';
		            }
	            }

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
	             * For table, you can send a label - but that never actually is an 'option' for a table according to
	             * the documentation I found.  So, if there is a label, I'll make it an info before
	             *
	             * This is a little bit different than normal as I'm going to send another command object in the middle
	             * of building one.  In the future, might refactor to return multiple commandObjects in this case
	             */
	            if (metaObject.Label) {
		            _sendCommandObject({type:'info', params: [metaObject.Label]});
	            }

	            if (console.table) {
		            /**
		             * to get proper headers, you need to build an object to pass
		             */
		            var columns = message.shift();
		            var table = [];
		            for (var i = 0; i < message.length; i++) {
			            var row = {};
			            for (j = 0; j < message[i].length; j++) {
				            row[columns[j]] = message[i][j];
			            }
			            table.push(row);
		            }
		            params.push(table);
		            commandObject = {
			            type: "table",
			            params: params
		            };
	            }
	            else {
		            /**
		             * no built in functionality for table (not using canary?) - so this gets it pretty enough.
		             */
		            for (var i = 0; i < message.length; i++) {
			            params.push("\n");
			            params.push(message[i]);
		            }
		            commandObject = {
			            type: "info",
			            params: params
		            };
	            }
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
                params.push(_buildTraceObject(message));
                for (var i = 0; i < message.Trace.length; i++) {
                    params.push("\n");
                    params.push(_buildTraceObject(message.Trace[i]));
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
                    params.push(_buildTraceObject(message.Trace[i]));
                }

                commandObject = {
                    type: 'log',
                    params: params
                };
                break;
        }

        return commandObject;
    };

    /**
     * parses out the values from the header that are needed to build a command object.
     *
     * the x-wf-1-1-1-# headers have a proprietary format that need to be parsed and then prepped for commandObject,
     * note - this can be a combined value from multiple x-wf-1-1-1-# headers if the message was large
     *
     * @param value the value of the header
     * @private
     * @return {Object} the processed information with properties of the metaObject and the message
     */
    var _parseHeaderForResponse = function(value) {
        var logArray = JSON.parse(value);
        if (typeof logArray[0] === "undefined") {
            /**
             * on dump, you always have an object of a unknown key (which is the label) and the payload -
             * which can be any datatype - that's why the code does this
             */
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
     * This is the worker to create objects that we can interpret from stack traces
     *
     * note: rebuilding these objects instead of just slicing/parsing, so that the order of the properties is always predictable
     * fun fact: in the parent, all properties are capital, all children are lowercase. - I tried making less code-repetition
     * versions of this but they all ended up more complicated and longer in length
     *
     * @param originalTraceObject
     * @private
     * @return {Object} the object with Class, Method, File, Line properties, optionally: Parameters - of the method
     */
    var _buildTraceObject = function(originalTraceObject) {
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
};

/**
 * on each completed request, check the HAR entry for our lovely headers
 */
chrome.devtools.network.onRequestFinished.addListener(
    function(request) {
        var client = new FirePHP4Chrome();
        client.processHeaders(request);
    }
);

/**
 * On load, make sure to remind that this only works on refresh
 */
var client = new FirePHP4Chrome();
client.sendFirstLoadMessage();
