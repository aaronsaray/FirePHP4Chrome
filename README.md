FirePHP4Chrome - FirePHP Extension for Google Chrome
 
The Developer Tools for Google Chrome are pretty great - but something was missing: FirePHP.  Now, instead of shifting back and forth between Firefox and Chrome for FirePHP messages, you can stay in one place.  

I was inspired by a lot of previous extensions that all were out of date.  This even includes Google's own sample extension!  This extension is all fresh code using the most recent Google APIs - and doesn't require experimental mode to be activated!

One last thing: you should know that the formatting options for Google Chrome Developer Tool's Console are very few.  I've done my best to format information nicely, but it's not perfect.  Please don't expect an exact copy of FirePHP from Firefox.  (For example, Chrome doesn't support console.table() output, so I have to make my own - and logging array's with non numeric keys get sent as objects from FirePHP).

Changelog:

0.4
Fixed bugs regarding random orders.  Validated information on FirePHP limitations. Added user agent modification to deal with old frameworks.

0.3
Added multi-header messages (Thanks https://github.com/kuebk for the suggestions and the permission to refactor)

0.2
Added support for dump, trace, exception, groups
Some code refactoring - smaller footprint when code is inserted directly to the page

