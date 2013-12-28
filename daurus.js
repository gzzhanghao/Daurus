/*
 * daurus.js
 * @author				Jason
 * @description		A simple one-shot data binding javascript function
 */

 /*
  * @Function				daurus
  * @description		binding data with filters
  * @parameter			node to be bound, data, filters
  */
(function (window, document) {

	var daurus = function (data, node, filter) {

		/*
		 * whether a value is null or undefined
		 */
		var isEmpty = function (value) {
			return null == value || void 0 == value;
		};


		/*
		 * for ie supporting
		 */
		var trim = function (string) {
			if (!isEmpty(string.trim)) {
				return string.trim();
			}
			return string.replace(/^\s*|\s*$/g, '');
		};


		/*
		 * clone an object
		 */
		var shallowClone = function (target, processed) {
			// check whether the target is an object
			if (!target instanceof Object) {
				return target;
			}
			// initialize the new object
			var newObject = {};
			// check whether the target is an array
			if (target instanceof Array) {
				newObject = [];
			}
			// copy values from the object
			for (var key in target) {
				if (target.hasOwnProperty(key)) {
					newObject[key] = target[key];
				}
			}
			return newObject;
		};


		/*
		 * find the target scope in current scope
		 */
		var findScope = function (target, scope) {
			if (isEmpty(scope)) {
				scope = data;
			}
			// initialize scope and target
			scope = shallowClone(scope);
			// find the redirection markers
			var redirects = [], brackets = 0, begin = null;
			target = target.replace(/\(([^\)]+)\)/g, function (i, m) {
				redirects.push(m);
				return '()';
			});
			// split target with '.'
			target = target.split('.');
			// initialize result scope
			var resultScope = scope;
			for (var i = 0; i < target.length; i++) {
				// split the filters
				var filterList = target[i].split(':');
				var base = trim(filterList[0]);
				// deal with redirect marker
				if (!isEmpty(base.match(/\(\)/))) {
					base = base.replace(/\(\)/, '');
					var directValue = findValue(redirects.shift(), resultScope);
					scope[base] = directValue;
					resultScope[base] = directValue;
				}
				// get value
				if (resultScope.hasOwnProperty(base)) {
					resultScope = resultScope[base];
					// apply filters
					for (var j = 1; j < filterList.length; j++) {
						var filter = filter[trim(filterList[j])];
						if (filter instanceof Function && filter.apply) {
							resultScope = filter.apply(filter, [resultScope]);
						}
					}
				} else {
					return null;
				}
			}
			// copy value of result into scope
			for (var i in resultScope) {
				if (resultScope.hasOwnProperty(i)) {
					scope[i] = resultScope[i];
				}
			}
			return scope;
		};


		/*
		 * find out a value in scope
		 */
		var findValue = function (target, scope) {
			if (isEmpty(scope)) scope = data;
			var possibleValue = target.split('||');
			for (var i = 0; i < possibleValue.length; i++) {
				target = possibleValue[i].split('.');
				// initialize scope
				var result = scope;
				for (var j = 0; j < target.length; j++) {
					// split out the filters
					var value = target[j].split(':');
					// get value
					value[0] = trim(value[0]);
					if (result.hasOwnProperty(value[0])) {
						result = result[value[0]];
						// apply filters
						for (var k = 1; k < value.length; k++) {
							value[k] = trim(value[k]);
							var filter = filter[value[k]];
							if (!isEmpty(filter) && filter.apply) {
								result = filter.apply(filter, [result]);
							}
						}
					} else {
						result = null;
						break;
					}
				}
				if (!isEmpty(result)) {
					return result;
				}
			}
			return null;
		};


		/*
		 * build up a node's value
		 */
		var buildNode = function (node, scope) {
			var originValue = node.nodeValue;
			// binding value
			node.nodeValue = originValue.replace(/\{\{([^\}]*)\}\}/g,
				function (i, m) {
					var value = findValue(m, scope);
					// get true value of the node
					if (value instanceof Function && value.apply) {
						return value.apply(value);
					} else if (isEmpty(value)) {
						return '';
					}
					return value;
				});
			if ("#text" === node.nodeName) {
				var wrapper = document.createElement('div');
				wrapper.innerHTML = node.nodeValue;
				while (wrapper.childNodes.length > 0) {
					node.parentNode.insertBefore(wrapper.childNodes[0], node);
				}
				node.parentNode.removeChild(node);
			}
		};


		/*
		 * find the scope of the node
		 */
		var findScopeOf = function (node) {
			// if the node is empty, return the base scope
			if (isEmpty(node)) {
				return data;
			}
			var scope = {};
			// find the previous scope
			if (!isEmpty(node.previousSibling)) {
				scope = findScopeOf(node.previousSibling);
			} else {
				scope = findScopeOf(node.parentNode);
			}
			// if the node has scope meaning
			if ('#comment' !== node ||
					'-' === node.nodeValue.charAt(0) ||
					!isEmpty(node.nodeValue.match(/ in /))) {
				return scope;
			}
			return findScope(node.nodeValue, scope);
		};


		/*
		 * insert a node before a pointer or append to parent if pointer is null
		 */
		var insertAppend = function (node, pointer, parent) {
			if (!isEmpty(pointer)) {
				pointer.parentNode.insertBefore(node, pointer);
			} else {
				parent.appendChild(node);
			}
		}


		/*
		 * parse a loop
		 */
		var parseLoop = function (requests, node, scope) {
			// initialize variables
			var parent = node.parentNode;
			var target = trim(requests.pop());
			var targetValue = findValue(target, scope);
			var trueScope = trim(requests.pop());
			var receiver = trueScope.split(/\.:/)[0];
			var redirectScope, template;
			// find the template
			template = node.nextSibling;
			while ('#text' === template.nodeName && 
				(isEmpty(template.nodeValue) || 
					'' === trim(template.nodeValue))) {
				template = template.nextSibling;
			}
			// remove template from parent node
			if (!isEmpty(template.parentNode)) {
				template.parentNode.removeChild(template);
			}
			// initialize inser pointer
			var insertPointer = node.nextSibling;
			// binding data
			for (var i in targetValue) {
				// if the key has been bounded
				if (targetValue.hasOwnProperty(i)) {
					// redirection scope
					redirectScope = document.createComment([
						receiver,'(', target, '.', i, ')'].join(''));
					insertAppend(redirectScope, insertPointer, parent);
					// child scope
					if (requests.length > 0) {
						childScope = document.createComment(
							[requests.join(' in '), trueScope].join(''));
						insertAppend(document.createComment(
							[requests.join(' in '), trueScope].join('')),
						insertPointer, parent);
					} else {
						redirectScope.nodeValue += trueScope.replace(/[^\.:]+/, '');
					}
					// template
					insertAppend(template.cloneNode(true), insertPointer, parent);
				}
			}
		}


		/*
		 * parse a node and it's children
		 */
		var parseNode = function (node, scope) {
			// initialize scope
			if (isEmpty(scope)) {
				scope = findScopeOf(node);
			}
			// if the node is a comment
			if ('#comment' === node.nodeName) {
				// if the node is a common comment node
				if ('-' === node.nodeValue[0]) return scope;
				var requests = node.nodeValue.split(' in ');
				// if the node is not a loop
				if (1 === requests.length) {
					return findScope(requests[0], scope);
				}
				parseLoop(requests, node, scope);
				// end for comment process
				return scope;
			}
			// if the node contains attriubtes
			if (!isEmpty(node.attributes)) {
				for (var i = 0; i < node.attributes.length; i++) {
					var attribute = node.attributes[i];
					if (!isEmpty(attribute.nodeValue) 
						&& 'string' === typeof attribute.nodeValue 
						&& '' !== trim(attribute.nodeValue)) {
						buildNode(attribute, scope);
					}
				}
			}
			// if the node has node value
			if (!isEmpty(node.nodeValue) && "" !== trim(node.nodeValue)) {
				buildNode(node, scope);
			}
			// walk through child nodes
			var children = node.childNodes;
			if (!isEmpty(children)) {
				// children's scope will be inherited in children's level
				var childScope = shallowClone(scope);
				for (var i = 0; i < children.length; i++) {
					childScope = parseNode(children[i], childScope);
				}
			}
			return scope;
		};
		if (isEmpty(filter)) {
			filter = {};
		}
		if (isEmpty(node)) {
			node = document;
		}
		parseNode(node || document);
	};

	window.daurus = daurus;

})(window, document);