daurus.js
============================================

A front-end framework implements the [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) API. For convenience of building native-like webapp. Maybe it's just reinventing the wheel but I hope you enjoy it:)

Installing
--------------------------------------------

Just add the script to your index page:
  
    <script type="text/javascript" src="daurus.js"></script>

And there suppose to be a basic static files web server providing modules files for the app.

Using
--------------------------------------------

Use as [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) defined. But there are serval differences.

Differences
--------------------------------------------

### Data parsing

daurus.js will parse some types of data besides javascript files automatically. It treats different types of files in specific ways according to the external name of the module required or the content-type of the response header.

* js

** Asynchronously: Add the required url to a \<script\> element.

** Synchronously: Load with sync AJAX, add the response text to a \<script\> tag.

* css

** Asynchronously: Add the required url to a \<link\> element, using an inner \<img\> tag to implement onload callback.

** Synchronously: Load with sync AJAX, add the response text to a \<style\> tag.

* HTML

** Nothing but load the html with ajax, the html will be parse to an Array of HTMLElement before it pass to the request function.

* JSON

** Same as HTML but parse the JSON this time.

* external

** Sure you can require an external url as a module but daurus.js just put it into an \<iframe\> element. NOT SUPPOSED TO USED

### Url resolves

daurus.js will resolve ANY modules' id to an absolute url, it will treats modules' identifiers as a relative path.

### Configs

Reference to [RequireJs](http://requirejs.org), we just provides paths to set modules' alias (maybe something else in future). The modules' id in paths will be resolved on the base of location.href

You can easily set the paths as follow:

    define.config({
        paths: {
            // paths goes here
        }
    });

Example
--------------------------------------------

### Basic modular

In modules/bar.json

    // modules/bar.json
    {"foo": "bar"}

So you can require bar.json as:

    // modules/foo.js
    // the id must be added in the web server
    define('modules/foo.js', ['bar.json'], function (bar, require) {
        // the most normal way
        console.log(bar);
        // using require async
        require('bar.json', function (bar) {
            console.log(bar);
        });
        // require sync
        console.log(require('bar.json'));
    });

### Paths

Assume that jquery.js is in library/jquery.js, we can set paths as:

    define.config({
        paths: {
            jquery: 'library/jquery.js'
        }
    });

So we can access jquery easily as follow:

    var $ = require('jquery');

For more examples, sorry but I'm just writting... :-(

Anything else?
--------------------------------------------

Sure! I'm a freshman of github so I really need your suggestions, no matter what!

Contact me if you need help or have any advice :)