/**
 * Background processor for FirePHP4Chrome
 * 
 * Handles various tasks including:
 * - adding the outgoing firephp header
 * - adding a listener for message from devtools to run console log on
 * - has the inline script
 * 
 * Special notes: This extension was inspired by Google samples and other chrome FirePHP scripts, 
 * none of them worked. :(
 * 
 * @author Aaron Saray aarone@aaronsaray.com
 */

/**
 * On header send, add in the header for FirePHP
 * note: it has to go here, not in devtools.js because devtools only gets called when you show it
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
		details.requestHeaders.push({
			name:	'X-FirePHP-Version',
			value:	'0.0.6'
		});
		return {
			requestHeaders: details.requestHeaders
		};
	}, {urls: ["<all_urls>"]}, ['blocking', 'requestHeaders']	
);

/**
 * Code used to inject inline.  into the current page to run
 */
const LOGGER = function (json) {
    var commandObject = JSON.parse(unescape(json));
    console[commandObject.type].apply(console, commandObject.params);
};

/** 
 * messages come from devtools in the form of an object with a type of console log an a message to send
 * all escaped and jsonified
 */
chrome.extension.onMessage.addListener(
	function(commandObject) {
		//inject LOGGER code and pass argument of our escaped stringified object
		chrome.tabs.executeScript(null, {
			 code: "("+ LOGGER + ")('" + commandObject + "');"
		});
	}	
);
