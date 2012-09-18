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
            /** sort them properly  - then loop through the sorted version **/
            var keys = Object.keys(wfHeaders);
            keys.sort();
            var name = '';
            for (var i = 0; i < keys.length; i++) {
                name = keys[i];
                var commandObject = _buildCommandObject(name, wfHeaders[name]);

                /** if not null - meaning we found something to be actionable on **/
                if (commandObject) {
                    _sendCommandObject(commandObject);
                }
            }
        }
    };

    /**
     * Used to alert the user that they may need to refresh the page on first devtools.js load
     */
    this.sendFirstLoadMessage = function() {
        var commandObject = {
            type: "info",
            message: "FirePHP4Chrome logging activated.  You may need to refresh this page."
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
            if (/^X-Wf-/.test(headers[i].name)) {
                wfHeaders[headers[i].name] =  headers[i].value;
            }
        };

        return wfHeaders;
    };

    /**
     * Determines if the header that we're receiving is of the proper protocol (0.2)
     *
     * @return boolean
     * @param param
     * @private
     */
    var _isProperProtocol = function(headerObject) {
        return headerObject['X-Wf-Protocol-1'] == 'http://meta.wildfirehq.org/Protocol/JsonStream/0.2';
    };

    /**
     * Build the commandObject object that is sent to the messenger
     *
     * This takes headers that we know are wildfire headers, checks to see if they're just meta information or
     * something that we can message, and then builds the proper commandObject from them.  This method is where
     * it determines if its log, warn, table, etc.
     *
     * @param name the name of the header
     * @param value the value of the header
     * @private
     * @return {Object} the special commandObject with properties of type, and params
     */
    var _buildCommandObject = function(name, value) {
        var commandObject = null;

        /** means its an actual message-able item **/
        if (/^X-Wf-1-1-1-/.test(name)) {
            var parsedHeaderResponse = _parseHeaderForResponse(value);
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
        }

        return commandObject;
    };

    /**
     * parses out the values from the header that are needed to build a command object.
     *
     * the x-wf-1-1-1-# headers have a proprietary format that need to be parsed and then prepped for commandObject
     *
     * @param value the value of the header
     * @private
     * @return {Object} the processed information with properties of the metaObject and the message
     */
    var _parseHeaderForResponse = function(value) {
        var parts = value.split('|');
        var logArray = JSON.parse(parts[1]);

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
