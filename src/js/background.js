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
 * @author Aaron Saray aaron@aaronsaray.com
 */

/**
* set up a quick namespace as not to pollute
*/
var FirePHP4Chrome_NS = FirePHP4Chrome_NS || {};

/**
 * Define to send headers
 */
FirePHP4Chrome_NS.addHeaders = true;

/**
 * get options, then add a listener once i've got them
 */
chrome.storage.sync.get('options', function(settings) {
    if (settings.options) {
        if (settings.options.blacklist) {
            var blacklist = settings.options.blacklist.replace(/\s+/, '').split(',');
            chrome.webRequest.onBeforeRequest.addListener(
                function() {
                    FirePHP4Chrome_NS.addHeaders = false;
                }, {urls: blacklist}, ['blocking']
            );
        }
    }
});

/**
 * On header send, add in the header for FirePHP and 256k limit for chrome header size
 * note: it has to go here, not in devtools.js because devtools only gets called when you show it
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
        if (FirePHP4Chrome_NS.addHeaders) {
            for (var i = 0; i < details.requestHeaders.length; i++) {
                if (details.requestHeaders[i].name == 'User-Agent') {
                    details.requestHeaders[i].value += ' FirePHP/4Chrome'; // required for old ZF and other libs (matches the regex)
                }
            }
            details.requestHeaders.push({
                    name:	'X-FirePHP-Version',
                    value:	'0.0.6'
                },
                {
                    name:   'X-Wf-Max-Combined-Size',
                    value:  '262144'
                });
        }

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
