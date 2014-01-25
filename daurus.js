/**
 * @preserve Daurus.js 1.0.0 | @zh | WTFPL
 */
;(function () {

  'use strick';

  /** version */
  var version = '1.0.0';

  /** Used to configuring paths and other configurations */
  var config = {};

  /** Storaging modules defined */
  var modules = {};

  /** Records modules in loading state */
  var loading = [];

  /** Modules dependent on modules loading */
  var waiting = [];

  /** Extensions that daurus.js can handle with besides images type */
  var supportTypes = 'js json html css'.split(' ');

  /** Images extensions */
  var imageTypes = 'jpg jpeg png gif'.split(' ');

  /** Node to append <link> and <script> */
  var injectNode = document.getElementsByTagName('head')[0];

  /** Mime types supports to specific module type */
  var mime = {
      'js': /^(application|text)\/(x-)?javascript$/,
      'json': /^(application|text)\/(x-)?json$/,
      'html': /^text\/html$/,
      'css': /^text\/css$/,
      'png': /^image\/png$/,
      'gif': /^image\/gif$/,
      'jpeg': /^image\/p?jpeg$/,
      'img': /^image\//
    };

  /** Location.origin supports for ie8- */
  var originURL = location.origin || [window.location.protocol, '//', window.location.hostname, (window.location.port ? '\:' + window.location.port: '')].join('');

  /** Console object patch for low version of ie */
  var console;

  /** Browsers' supports level, version for ie and 11 for others */
  var browser;

  (function () {
    if (typeof window.console == 'undefined') {
      // create a console with empty methods if window.console not defined
      console = {};
      console.log = console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function () {};
    } else {
      console = window.console;
    }

    // get ie's version from UA.
    var ieVersion = navigator.userAgent.match(/MSIE(\d+)/);
    browsers = ieVersion ? ieVersion[1] : 11;

  })();

  /*--------------------------------------------------------------------------*/

  /**
   * Parse a JSON string to Object as JSON.parse does
   * @private
   * @parm {String} JSONString String to be parsed
   * @returns {Object} The object parsed from the string
   */
  var jsonParse = (function () {
    // From: https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
    if (typeof JSON != 'undefined') {
      return JSON.parse;
    }
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    return function (text, reviver) {
      var j;
      function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value == "object") {
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
        text = text.replace(cx, function (a) {
          return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        });
      }
      if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
        j = eval("(" + text + ")");
        return typeof reviver == "function" ? walk({
          "":j
        }, "") :j;
      }
      throw new SyntaxError("JSON.parse");
    };
  })();

  /**
   * Convert an array-like object to an Array object
   * @private
   * @usage convertToArray.call(object)
   * @returns {Array} Array object convert from input
   */
  var convertToArray = function (object) {
    try {
      Array.prototype.slice.call(object);
      convertToArray = Array.prototype.slice;
    } catch (a) {
      convertToArray = function () {
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

  /**
   * Get the index of a value in an Array
   * @private
   * @usage indexOf.call(array, value)
   * @returns {Integer} index of the value in the Array
   */
  var indexOf = function (value) {
    if ('function' == typeof Array.prototype.indexOf) {
      indexOf = Array.prototype.indexOf;
    } else {
      indexOf = function (value) {
        for (var i = 0; i < this.length; i++) {
          if (this[i] === value) {
            return i;
          }
        }
        return -1;
      };
    }
    return indexOf.call(this, value);
  };

  /**
   * Parse a string to a module with specific type
   * @private
   * @parm {String} id Module's identifier
   * @parm {String} type Module's extension name
   * @parm {String} string Module's definition string
   * @parm {Boolean} async Whether the string should be parsed synchronously
   * @return {Object} Module parsed from the string
   */
  var parseModuleString = function (id, type, string, async) {

    // HTMLElement to carry the module's definition string
    var carrier;

    // handle different type of modules in specific method
    switch (type) {
      case 'js':
        if (false === async) {
          try {
            Function ([], string).call();
          } catch (e) {
            console.error('In module \'' + id + '\':\n' + e.stack);
          }
          return modules[id];
        } else {
          carrier = document.createElement('script');
          carrier.setAttribute('type', 'text/javascript');
          document.getElementsByTagName('body')[0].appendChild(carrier);
          carrier.innerHTML = '\n' + string + '\n';
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
        // TODO: deal with html5 tags here
        carrier.innerHTML = string;
        nodeList = convertToArray.call(carrier.childNodes);
        for (var i = 0; i < nodeList.length; i++) {
          carrier.removeChild(nodeList[i]);
        }
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
          carrier.onload = function () {
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

  /**
   * Get the extension name from mime type
   * @private
   * @parm {String} type Mime type to search the extension name
   * @returns {String} Extension name for the mime type
   */
  var extFromMime = function (type) {
    for (var i in mime) {
      if (mime.hasOwnProperty(i) && type.match(mime[i])) {
        return i;
      }
    }
    return '';
  };

  /**
   * Load a module from remote
   * @private
   * @parm {String} url Remote URL to load the module
   * @parm {Boolean} async Whether to load the module asynchronously
   * @return {Object} Module loaded from the URL or null if async
   */
  var loadModule = function (module, async) {

    // module's extension name
    var extension = module.replace(/[#\?][\w\W]*/, '').split('.').pop(),
        carrier;

    // if the module to be load is an image
    if (indexOf.call(imageTypes, extension) >= 0) {
      carrier = document.createElement('img');
      carrier.onload = function () {
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
    var request;
    if (window.XMLHttpRequest) {
      request = new XMLHttpRequest();
    } else {
      request = new ActiveXObject('Microsoft.XMLHTTP');
    }

    // if not sync
    if (false !== async) {

      // load js with <script>
      if ('js' == extension) {
        carrier = document.createElement('script');
        carrier.setAttribute('type', 'text/javascript');
        carrier.setAttribute('src', module);
        injectNode.appendChild(carrier)
        return carrier;
      }
      
      // load css with <link>
      if ('css' == extension) {
        carrier = document.createElement('link');
        carrier.setAttribute('rel', 'stylesheet');
        carrier.setAttribute('type', 'text/css');
        carrier.setAttribute('href', module);
        injectNode.appendChild(carrier);

        // TODO: I hate warnings
        /*
        // link.onload trick with <img>
        var onloadHack = document.createElement('img');
        onloadHack.onerror = function () {
          define(module, carrier);
        };
        onloadHack.setAttribute('src', module)
        */

        define(module, carrier);
        return carrier;
      }

      // neither js nor css, load with ajax
      request.onreadystatechange = function () {
        if (4 == request.readyState) {
          extension = extension || extFromMime(request.getResponseHeader('Content-Type') || '');
          parseModuleString(module, extension, request.responseText);
        }
      };
    }

    // load module with iframe if the module comes from external website
    if (module.match(/^\w+:\/\//) && !module.indexOf(originURL) == 0) {
      carrier = document.createElement('iframe');
      carrier.setAttribute('src', module);
      define(module, carrier);
      return carrier;
    }

    // ajax load module
    request.open('GET', module, false !== async);
    request.send();

    // if synchronously
    if (false === async) {
      extension = extension || extFromMime(request.getResponseHeader('Content-Type') || '');
      return parseModuleString(module, extension, request.responseText, false);
    }
  };

  /**
   * Resolve the target URL from base, returns an absolute URL
   * @private
   * @parm {String} base The base URL
   * @parm {String} target Target URL to be resolved
   * @returns {String} The absolute URL resolved from base and target
   */
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
    target.pathname = target[4] ? target[4].replace(/\/+/g, '/') : '';
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

      // normalize url
      target[0] = ('/' + target[0]).replace(/\/+/g, '/').replace(/[^\?#]*/, function (m) {
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
    target.search = target.search || base.search || location.search;
    return [target.protocol, '//', target.host, target.pathname, target.search].join('');
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Define a module as AMD defined
   * @exposed
   * @parm {String} id The identifier of the module
   * @parm {Array} dependencies Modules this module dependent on
   * @parm {Object} definition Modules definition
   */
  var define = function () {
    // validating arguments.length
    if (arguments.length > 3) {
      throw new Error('Unexpected length of arguments.');
    }

    var id, dependencies, 
    // handling arguments
        args = convertToArray.call(arguments),
    // definition is always the last argument
        definition = args.pop();
    // get id if args[0] is a string
    if (typeof args[0] == 'string') {
      // every modules here is identified with an absolute url
      id = urlResolve('', args.shift());
    }
    // and dependencies remains
    dependencies = args.shift();

    if (args.length > 0) {
      throw new Error('Unexpected arguments\' type.');
    }

    // handling dependencies
    if (dependencies instanceof Array) {
      // missing modules
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
          waiting[dependencies[i]].push(function () {
            missCount--;
            if (0 == missCount) {
              // if all dependencies load, redefine module
              if (typeof id != 'undefined') {
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
      definition = definition.apply(definition, args.concat([require(id), exports, module])) || module.exports;
    }
    if ('string' == typeof id) {
      modules[id] = definition;
    }

    // remove module from loading list
    i = indexOf.call(loading, id);
    if (i >= 0) {
      loading.splice(i, 1);
    }

    // redefine modules waiting for this module
    if (waiting[id] instanceof Array) {
      for (var i = 0; i < waiting[id].length; i++) {
        waiting[id][i].apply();
      }
      delete waiting[id];
    }
  };

  /**
   * build the require function as AMD defined
   * @private
   * @parm {String} id Require's base url
   * @returns {Function} The require function for current module
   */
  var require = function (id) {

    /**
     * Require function as AMD defined
     * @exposed as module
     * @parm {String | Array} request Request modules' id
     * @parm {Function} callback Callback function when module is load
     * @returns {Object} Modules loaded or void 0 with callback
     */
    return function (request, callback) {
      if ('string' == typeof request) {
        request = [request];
      }
      for (var i = 0; i < request.length; i++) {
        request[i] = urlResolve(id || '', request[i]);
      }
      if (typeof callback != 'undefined') {
        define(request, callback);
      }
      var args = [];
      for (var i = 0; i < request.length; i++) {
        if (modules.hasOwnProperty(request[i])) {
          args.push(modules[request[i]]);
        } else if (typeof callback == 'undefined') {
          args.push(loadModule(request[i], false));
        } else {
          args.push(void 0);
        }
      }
      if (request.length == 1) {
        args = args[0];
      }
      return args;
    };
  };

  /**
   * Configure define function
   * @parm {Object} configuration Configuration to be set
   * @returns {Object} The newest configuration
   */
  define.config = function (configuration) {
    if (configuration) {
      config = configuration;
    }
    if (config.path instanceof Array) {
      for (var i = 0; i < config.paths.length; i++) {
        config.paths[i] = urlResolve('', config.paths[i]);
      }
    }
    return config;
  };

  /*--------------------------------------------------------------------------*/

  // identifiers
  define.amd = define.daurus = true;

  // expose define
  window.define = define;

})();