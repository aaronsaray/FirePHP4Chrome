/**
 * Options Processing Script
 *
 * This handles saving the options and repopulating the options html page
 *
 * @author Aaron Saray aaron@aaronsaray.com
 */

/**
 * Main options class
 * @constructor
 */
function FirePHP4Chrome_Options() {

    /**
     * Validation messages
     */
    var _messages = {
        success: 'Options saved successfully.  Reloading in 5 seconds.'
    };

    /**
     * Message types
     */
    var _messageTypes = {
        success: 'success'
    };


    /**
     * Default values
     * @type {{targetVersion: string}}
     * @private
     */
    var _defaultOptions = {
        blacklist: '*://www.yellowpages.com/*'
    };

    /**
     * Initializer function: sets options, click handler
     */
    var _init = function() {
        document.addEventListener('DOMContentLoaded', _restoreOptions);
        document.querySelector('#submit').addEventListener('click', _save);
    };

    /**
     * Used to save options to local storage
     */
    var _save = function() {
        var blacklist = document.querySelector('#blacklist').value;
        var options = {
            blacklist: blacklist
        };

        chrome.storage.sync.set({'options': options}, function () {
            _updateStatusAndReload(_messages.success, _messageTypes.success);
        });
    };

    /**
     * Used to update message / status
     *
     * Adds a transition to it too
     * Finally reloads the extension
     * @param message
     * @param type
     * @private
     */
    var _updateStatusAndReload = function(message, type) {
        var status = document.querySelector('#savemessage');
        status.innerText = message;
        status.className = type;
        setTimeout(function(){
            status.className = '';
            status.innerText = '';
            chrome.runtime.reload(); // because options are used in background page
        }, 5000);
    };

    /**
     * Used to put the retrieved options back on the screen
     * @private
     */
    var _restoreOptions = function() {
        chrome.storage.sync.get('options', function(settings) {
            if (!settings.options) {
                settings.options = _defaultOptions;
            }
            document.querySelector('#blacklist').value = settings.options.blacklist;
        });
    };

    // initialize the class
    _init();
}

new FirePHP4Chrome_Options();

