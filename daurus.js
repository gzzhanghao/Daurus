(function() {

  'use strick';

  // configuration
  var config = {
    'debug': false
  };

  // global variables for moduling
  var modules = {}, loading = [], waiting = [];

  // static variables
  // specific extension name supports
  var supportTypes = 'js json html css'.split(' '),
  // images extension names
      imageTypes = 'jpg jpeg png gif'.split(' '),
  // node to append <link> and <script> default id body
      injectNode = document.getElementsByTagName('body')[0],
  // mime type support to specific module type
      mime = {
        'js': /^(application|text)\/(x-)?javascript$/,
        'json': /^(application|text)\/(x-)?json$/,
        'html': /^text\/html$/,
        'css': /^text\/css$/,
        'png': /^image\/png$/,
        'gif': /^image\/gif$/,
        'jpeg': /^image\/p?jpeg$/,
        'img': /^image\//
      },
  // equals to location.origin, supports for ie8-
      originURL = [
          window.location.protocol,
          '//', window.location.hostname, 
          (window.location.port ? '\:' + window.location.port: '')
        ].join('');


  // Object:           console
  // Description:      patch console bug for ie
  var console = (function() {
    if ('undefined' === typeof window.console) {
      var console = {};
      console.log = console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
      return console;
    }
    return window.console;
  })();

  // Object:           browser
  // Description:      highest version number of ie or 11 for other browsers
  var browser = (function () {
    var ieVersion = navigator.userAgent.match(/MSIE(\d+)/);
    if (!ieVersion) {
      ieVersion = 11;
    } else {
      ieVersion = ieVersion[1];
    }
    return ieVersion;
  })();


  // Functions begins here

  // Function:         jsonParse
  // Description:      parse json for old browsers
  // Arguments:        json string
  // Returns:          javascript object
  // From:             https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
  var jsonParse = (function() {
    if ('undefined' !== typeof JSON && 'undefined' !== typeof JSON.parse) {
      return JSON.parse;
    }
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    return function(text, reviver) {
      var j;
      function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === "object") {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return reviver.call(holder, key, value);
      }
      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
        text = text.replace(cx, function(a) {
          return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        });
      }
      if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
        j = eval("(" + text + ")");
        return typeof reviver === "function" ? walk({
          "":j
        }, "") :j;
      }
      throw new SyntaxError("JSON.parse");
    };
  })();


  // Function:         convertToArray
  // Description:      conver an array-like object to array
  // Usage:            convertToArray.call(object)
  var convertToArray = function() {
    try {
      Array.prototype.slice.call(document.documentElement);
      convertToArray = Array.prototype.slice;
    } catch (a) {
      convertToArray = function() {
        var b = this.length, c = [];
        if (this.charAt) {
          for (var a = 0; b > a; a++) {
            c.push(this.charAt(a));
          }
        } else {
          for (var a = 0; a < this.length; a++) {
            c.push(this[a]);
          }
        }
        return c;
      };
    }
    return convertToArray.call(this);
  };


  // Function:         indexOf
  // Description:      patch indexOf in ie8-
  // Usage:            indexOf.call(array, needle);
  var indexOf = function(needle) {
    if ('function' === typeof Array.prototype.indexOf) {
      indexOf = Array.prototype.indexOf;
    } else {
      indexOf = function(needle) {
        for (var i = 0; i < this.length; i++) {
          if (this[i] === needle) {
            return i;
          }
        }
        return -1;
      };
    }
    return indexOf.call(this, needle);
  };


  // Function:         parseModuleString
  // Description:      parse module with specific method
  // Arguments:        module's id, module's type, module's definition
  //                   asynchronous flag (default true)
  var parseModuleString = function(id, type, string, async) {
    var carrier, nodeList;

    // deal with data return from ajax in multiple methods
    switch (type) {
      case 'js':
        if (false === async) {
        try {
          Function([], string).call();
        } catch (e) {
          console.error('In module \'' + id + '\':\n' + e.stack);
        }
        return modules[id];
      } else {
        carrier = document.createElement('script');
        carrier.setAttribute('type', 'text/javascript');
        document.getElementsByTagName('body')[0].appendChild(carrier);
        if (!config.debug) {
          carrier.innerHTML = '\n' + string + '\n';
        } else {
          carrier.setAttribute('src', id);
        }
      }
      return carrier;

      case 'css':
      carrier = document.createElement('style');
      carrier.setAttribute('type', 'text/css');
      carrier.innerHTML = string;
      define(id, carrier);
      return carrier;

      case 'html':
      carrier = document.createElement('div');
      carrier.innerHTML = string;
      nodeList = convertToArray.call(carrier.childNodes);
      carrier.innerHTML = '';
      define(id, nodeList);
      return nodeList;

      case 'jpeg': case 'png': case 'gif':
        if (browser >= 8) {
        // data uri scheme, for ie8+
        string = ['data:image/', type, ',', string].join('');
        carrier = document.createElement('img');
        carrier.setAttribute('src', string);
        define(id, carrier);
        return carrier;
      } else {
        carrier = document.createElement('img');
        carrier.onload = function() {
          define(id, carrier);
          carrier.onload = void 0;
        };
        carrier.setAttribute('src', id)
        return carrier;
      }

      case 'json':
      try {
        string = jsonParse(string);
      } catch (e) {
        console.warn('Unable to parse json data from \'' + id + '\'');
      }

      default:
      define(id, string);
      return string;
    }
  };


  // Function:         loadModule
  // Description:      load module with specific methods
  // Arguments:        module to load, async flag (sync when async === false)
  var loadModule = function(module, async) {

    // validate module's name
    if ('string' !== typeof module) {
      throw new Error('Unexpected module url: ' + module);
    }

    // variables to use
    var carrier, request, onloadHack, contentType,

    // module's url extension name
        extension = module.replace(/[#\?][\w\W]*/, '').split('.').pop();

    // if the module to be load is an image
    if (indexOf.call(imageTypes, extension) >= 0) {
      carrier = document.createElement('img');
      carrier.onload = function() {
        define(module, carrier);
        carrier.onload = void 0;
      };
      carrier.setAttribute('src', module)
      return carrier;
    }

    // if module's extension is not supported
    if (indexOf.call(supportTypes, extension) < 0) {
      extension = void 0;
    }

    // initial ajax request object
    if (window.XMLHttpRequest) {
      request = new XMLHttpRequest();
    } else {
      request = new ActiveXObject('Microsoft.XMLHTTP');
    }

    // if not sync
    if (false !== async) {

      // load js with <script>
      if ('js' === extension) {
        carrier = document.createElement('script');
        carrier.setAttribute('type', 'text/javascript');
        carrier.setAttribute('src', module);
        injectNode.appendChild(carrier)
        return carrier;
      }
      
      // load css with <link>
      if ('css' === extension) {
        carrier = document.createElement('link');
        carrier.setAttribute('rel', 'stylesheet');
        carrier.setAttribute('type', 'text/css');
        carrier.setAttribute('href', module);
        injectNode.appendChild(carrier);

        // link.onload trick with <img>
        onloadHack = document.createElement('img');
        onloadHack.onerror = function() {
          define(module, carrier);
        };
        onloadHack.setAttribute('src', module)

        return carrier;
      }

      // neither js nor css, load with ajax
      request.onreadystatechange = function() {

        if (4 === request.readyState) {

          if ('undefined' === typeof extension) {

            // try to find content type from header
            contentType = request.getResponseHeader('Content-Type') || '';
            for (var type in mime) {
              if (mime.hasOwnProperty(type) && 
                  contentType.match(mime[type])) {
                extension = type;
                break;
              }
            }
          }
          parseModuleString(module, extension, request.responseText);
        }
      };
    }

    // load module with iframe if the module comes from external website
    if (module.match(/^\w+:\/\//) && !module.indexOf(originURL) === 0) {

      carrier = document.createElement('iframe');
      carrier.setAttribute('src', module);
      define(module, carrier);
      return carrier;
    }

    // ajax load module
    request.open('GET', module, false !== async);
    request.send();

    // if synchronous
    if (false === async) {

      if ('undefined' === typeof extension) {

        // try to get content type from header
        contentType = request.getResponseHeader('Content-Type') || '';
        for (var type in mime) {
          if (mime.hasOwnProperty(type) && contentType.match(mime[type])) {
            // mime type match
            extension = type;
            break;
          }
        }
      }
      return parseModuleString(module, extension, request.responseText, false);
    }
  };


  // Function:         urlResolve
  // Description:      get the request module's uri base on current module
  // Arguments:        target uri
  // Returns:          uri reserved
  var urlResolve = function (base, target) {

    // config.path resovle
    if (config.paths instanceof Object) {
      if (config.paths.hasOwnProperty(target)) {
        base = '';
        target = config.paths[target];
      }
    }

    // url parse:  proto:   //   domain       /path      ?query#hash
    var parser = /^(\w+:)?(\/\/([^\/\?#]+))?([^\?#]+)?([\?#][\w\W]*)?$/;

    // parse base url
    base = base.match(parser);
    base.protocol = base[1] || location.protocol;
    base.host = base[3] || location.host;
    base.pathname = (base[4] || location.pathname).replace(/\/+/g, '/');
    base.search = base[4] || location.search;

    // normalize base.pathname
    base.pathname = base.pathname.split('/');
    var tmp = [];
    for (var i = 0; i < base.pathname.length; i++) {
      switch (base.pathname[i]) {
        case '..':
        tmp.pop();
        case '.':
        break;
        default:
        tmp.push(base.pathname[i]);
      }
    }
    base.pathname = tmp.join('/');

    // parse target url
    target = target.match(parser);
    target.protocol = target[1];
    target.host = target[3];
    if (target[4]) {
      target.pathname = target[4].replace(/\/+/g, '/');
    } else {
      target.pathname = '';
    }
    target.search = target[5];

    // "protocol://hostname/path/name?query"
    if (target.protocol) {
      return target[0];
    }

    // "//hostname/path/name?query"
    target.protocol = base.protocol;
    if (target.host) {
      return target.protocol + target[0];
    }

    // "/path/name?query" or "path/name?query"
    target.host = base.host;
    if (target.pathname) {

      if (!target.pathname.match(/^\//)) {
        
        // "path/name?query"
        if (base.pathname) {
          base.pathname = base.pathname.split('/');
          base.pathname.pop();
          target[0] = base.pathname.join('/') + '/' + target[0];
        }
      }

      target[0] = ('/' + target[0]).replace(/\/+/g, '/')
          .replace(/[^\?#]*/, function (m) {
            m = m.split('/');
            var tmp = [];
          for (var i = 0; i < m.length; i++) {
            switch (m[i]) {
              case '..':
              tmp.pop();
              case '.':
              break;
              default:
              tmp.push(m[i]);
            }
          }
          return tmp.join('/');
          });
      
      return target.protocol + '//' + target.host + target[0];
    }

    // ""
    target.pathname = base.pathname;
    if (!target.search) {
      target.search = base.search || location.search;
    }
    return [target.protocol, '//', target.host, 
            target.pathname, target.search].join('');
  };


  // Function:         define
  // Description:      function to define a module in AMD standard
  // Arguments:        [id, ][dependencies, ]definition
  var define = function () {

    // validating arguments.length
    if (arguments.length > 3) {
      throw new Error('Unexpected length of arguments.');
    }

    // variables to use
    var id, dependencies, 

      // handling arguments
        args = convertToArray.call(arguments),
      // definition is always the last argument
        definition = args.pop();
    // get id if args[0] is a string
    if ('string' === typeof args[0]) {
      id = urlResolve('', args.shift());
    }
    // and dependencies remains
    dependencies = args.shift();

    if (args.length > 0) {
      throw new Error('Unexpected arguments\' type.');
    }

    // handling dependencies
    if (dependencies instanceof Array) {

      // record missing modules
      var miss = [], missCount = 0;

      for (var i = 0; i < dependencies.length; i++) {

        dependencies[i] = urlResolve(id || '', dependencies[i]);

        if (modules.hasOwnProperty(dependencies[i])) {
          // if dependent module exists join it to argument list
          args.push(modules[dependencies[i]]);

        } else {
          // record dependent module in miss list
          miss.push(dependencies[i]);

          // handling after dependent module defined
          waiting[dependencies[i]] = waiting[dependencies[i]] || [];
          waiting[dependencies[i]].push(function() {
            missCount--;
            if (0 === missCount) {
              // if all dependencies complete, redefine module
              if ('undefined' !== typeof id) {
                define(id, dependencies, definition);
              } else {
                define(dependencies, definition);
              }
            }
          });
        }
      }

      // handling miss list
      missCount = miss.length;
      if (missCount > 0) {
        for (var i = 0; i < miss.length; i++) {
          if (indexOf.call(loading, miss[i]) < 0) {
            loading.push(miss[i]);
            loadModule(miss[i]);
          }
        }
        return;
      }
    }

    // define module factory and record it
    if (definition instanceof Function) {
      var module = {exports: {}}, exports = module.exports;
      args = args.concat([require(id), exports, module]);
      try {
        definition = definition.apply(definition, args) || 
                     module.exports;
      } catch (h) {
        console.error(h.stack);
      }
    }
    if ('string' === typeof id) {
      modules[id] = definition;
    }

    // remove module from loading list
    i = indexOf.call(loading, id);
    if (i >= 0) {
      loading.splice(i, 1);
    }

    // handling modules waiting for this module
    if (waiting[id] instanceof Array) {
      for (var i = 0; i < waiting[id].length; i++) {
        waiting[id][i].apply();
      }
      delete waiting[id];
    }
  };


  // Function:         require
  // Description:      factory to build require function in base url of id
  // Arguments:        base url
  // Returns:          require function
  var require = function (id) {
    return function (request, callback) {
      if ('string' === typeof request) {
        request = [request];
      }
      for (var i = 0; i < request.length; i++) {
        request[i] = urlResolve(id || '', request[i]);
      }
      if (callback) {
        define(request, callback);
      } else {
        var args = [];
        for (var i = 0; i < request.length; i++) {
          if (modules.hasOwnProperty(request[i])) {
            args.push(modules[request[i]]);
          } else {
            args.push(loadModule(request[i], false));
          }
        }
        if (request.length === 1) {
          args = args[0];
        }
        return args;
      }
    };
  };


  // Function:         config
  // Description:      set / get config
  // Arugments:        new config object to be set or nothing
  // Returns:          the latest config
  define.config = function (set) {
    if (set) {
      config = set;
    }
    return config;
  };

  // identifiers
  define.amd = define.daurus = true;

  // put define as global variable
  window.define = define;

})();