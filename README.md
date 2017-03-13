# FirePHP4Chrome - FirePHP Extension for Google Chrome

[![Project Status](https://stillmaintained.com/aaronsaray/FirePHP4Chrome.png)](https://stillmaintained.com/aaronsaray/FirePHP4Chrome)

The Developer Tools for Google Chrome are pretty great - but something was missing: FirePHP.  Now, instead of shifting back and forth between Firefox and Chrome for FirePHP messages, you can stay in one place.  

I was inspired by a lot of previous extensions that all were out of date.  This even includes Google's own sample extension!  This extension is all fresh code using the most recent Google APIs - and doesn't require experimental mode to be activated!

One last thing: you should know that the formatting options for Google Chrome Developer Tool's Console are still in development.  I've done my best to format information nicely, but it's not perfect.  Please don't expect an exact copy of FirePHP from Firefox.

Sick of reading and just want to install this? Go get it from the Chrome Webstore: https://chrome.google.com/webstore/detail/firephp4chrome/gpgbmonepdpnacijbbdijfbecmgoojma

**Please Note:** This extension and myself are not associated with or endorsed by Google in any way.

# Changelog

#### 0.13
Fixed bug for missing index of headers.  (Thanks https://github.com/Basster).

#### 0.12
Updated logo and wording in response to a trademark notice from Google.

#### 0.11
Fixed bug that even when it was disabled, if the Wildfire headers were sent, it would display them anyway.  Technically the WF should not be sent by the server because the plugin was not requesting them - but I've modified it not to display them anyway.

#### 0.10
Merged in PR to add setting for max header size to be sent dynamically (Thanks https://github.com/GodLesZ).
Fixed issue where a logged command had a pipe in it - would cause json parse to fail.
Added a browser action icon to enable/disable firePHP4Chrome dynamic like.
Some performance increases.

#### 0.9
Added a blacklist url pattern match.  You can now go in options and use google's pattern matching syntax to blacklist domains.  I added www.yellowpages.com as that was the reason for the issue. (Thanks https://github.com/davidcroda for your report.)

#### 0.8
Adding in table label - using info() if label is sent because console.table() does not support label.

#### 0.7
Support for planned header size limit in FirePHP (to handle the Chrome issue of too large headers - with hopes it comes out and magically works.)

#### 0.6
Support for console.table() (in canary or better - still backwards compatible for older versions). (Thanks https://github.com/niutech for the heads up)

#### 0.5
Support for mixed case header names (from pull request).

#### 0.4
Fixed bugs regarding random orders.  Validated information on FirePHP limitations. Added user agent modification to deal with old frameworks.

#### 0.3
Added multi-header messages (Thanks https://github.com/kuebk for the suggestions and the permission to refactor)

#### 0.2
Added support for dump, trace, exception, groups
Some code refactoring - smaller footprint when code is inserted directly to the page

