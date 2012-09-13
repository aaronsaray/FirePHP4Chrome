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
		var parts = value.split('|');
		var logArray = JSON.parse(parts[1]);
		var metaObject = logArray[0];
		var headerType = metaObject.Type.toLowerCase();
		
		/**
		 * only log,info, warn, error and table are implmented, others will result in commandObject remaining null
		 */
		switch (headerType) {
			case 'log':
			case 'info':
			case 'warn':
			case 'error':
				/**
				 * add in the file/line to make it easier to reference where this error came from
				 */
				commandObject = {
						type: headerType,
						message: logArray[1],
						fileAndLine: metaObject.File + ":" + metaObject.Line
				};
				break;
			case 'table':
				/**
				 * need to build a pretty table - first line is normal, all the rest are indented one spot
				 * and its not fully justified
				 */
				var table = ["Table:"];
				for (var i = 0; i < logArray[1].length; i++) {
					table.push("\n");
					table.push(logArray[1][i]);
				}
				commandObject = {
					type: "table",
					table: table
				};
				break;
		}
	}
	
	return commandObject;
};

/**
 * on each completed request, check the HAR entry for our lovely headers
 */
chrome.devtools.network.onRequestFinished.addListener(
	function(request) {
		var wfHeaders = FirePHP4Chrome.getWildfireHeaders(request);
		if (FirePHP4Chrome.isProperProtocol(wfHeaders)) {
			for (var name in wfHeaders) {
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