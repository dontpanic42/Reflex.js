(function() {
	"use strict";

	var getClass = {}.toString;

	var regex = {
		stripFunctionComments: /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
		functionParameterNames: /([^\s,]+)/g
	};

	/**
	 * Merge two or more object. Existing destination properties will be
	 * overwritten by subsequent src properties!
	 * @param  {[type]} dst The object to copy the src objects into
	 * @return {[type]}     The dst object
	 */
	var merge = function(dst) {
		var args = Array.prototype.slice.call(arguments);
		dst = args.shift() || {};
		args.forEach(function(src) {
			src = src || {};
			Object.keys(src).forEach(function(key) {
				dst[key] = src[key];
			});
		});
		return dst;
	}

	/**
	 * General utility functions
	 * @type {Object}
	 */
	var utils = {
		/**
		 * Returns wether an object is a function (as defined with function()) or not.
		 * This is required since typeof returns function even for date objects
		 * @param  {[type]}  object The object to test
		 * @return {Boolean}        True, when the object is a function
		 */
		isFunction: function(object) {
			return object && getClass.call(object) === "[object Function]";
		},

		/**
		 * Returns wether or not this object is an actual object
		 * @param  {[type]}  object The object to test
		 * @return {Boolean}        True, when the object is an actual object
		 */
		isObject: function(object) {
			return object && object === Object(object);
		},

		/**
		 * Throws an error if object is not a function
		 * @param  {[type]}  object The object to test
		 */
		isFunctionOrThrow: function(object) {
			if(!this.isFunction(fn)) {
				throw new Error("Not a function: " + object);
			}
		},

		/**
		 * Count the number of parameters a function takes
		 * @param  {[type]} object The function to count the arguments of
		 * @return {Integer}       The number of named arguments the function takes
		 */
		countParameters: function(object, options) {
			return (Array.isArray(object.paramsList))? options.paramsList.length : object.length;
		},

		/**
		 * Returns the list of parameter names the supplied function takes
		 * @param  {[type]} object  The function to get the parameters for
		 * @param  {[type]} options Options-object. 'paramList' overwrites the output
		 * @return {[type]}         The list of parameters
		 */
		listParameters: function(object, options) {
			options = options || {};
			return options.paramsList || this.parseListParameters(object);
		},

		/**
		 * Returns a list of parameters from the function definition
		 *
		 * Adapted from Stackoverflow-User Jack Allan,
		 * https://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
		 *
		 * TODO: ES-6 Support
		 * 
		 * @param  {Function} object 	The function to parse
		 * @return {Array}        		A list of parameters
		 */
		parseListParameters: function(object) {
  			var fnStr = object.toString().replace(regex.stripFunctionComments, '');
  			var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(regex.functionParameterNames);
  			return result || [];
		},

		/**
		 * Returns a function that is bound to the values supplied
		 * @param  {[type]} object       the function to be called
		 * @param  {[type]} options   	 the options that contain the values to be bound to
		 * @return {[type]}              return value of the function
		 */
		getBoundFunction: function(object, options) {
			var self = this;
			return (function () {
				var paramList = self.listParameters(object, options) || [];
				var paramValuesList = options.paramValues || [];
				// Copy the array of bound value objects and insert an empty object
				// at the beginning
				var valuesList = paramValuesList.slice();
				valuesList.unshift({});
				// Merge all value objects in the array copied before into the
				// first object in the array (the one inserted via unshift())
				var values = merge.apply(undefined, valuesList);

				// Create the list of parameters that will be supplied when
				// actually calling the function
				var paramsForCall = paramList.map(function(param) {
					// Check wehter we have a value for the parameter or not
					if(!values.hasOwnProperty(param)) {
						// We have no value but we might have a binding function
						if(options.onBindParam) {
							return options.onBindParam(object. param, options.paramValues);
						}
						// When no binding function was found, return undefined
						return undefined;
					}
					// return the value from the values object
					return values[param];
				});

				// Actually call the function
				return object.apply(options.context, paramsForCall);
			}); 
		},

		/**
		 * Bind an object to the parameters of a function.
		 * @param  {[type]} object The function to be bound
		 * @param  {[type]} params an object with key:value parameters
		 * @return {[type]}        a new reflex object with the bound function
		 */
		bindParameters: function(object, params, options) {
			options.paramValues = options.paramValues || [];
			if(options.paramValues.indexOf(params) == -1) {
				options.paramValues.push(params);
			}

			return reflex(object, options.context, options);
		}
	}

	/**
	 * Main etnrypoint
	 * @param  {[type]} object  the function
	 * @param  {[type]} context the context of the function to be called (this arg)
	 * @param  {[type]} options options
	 * @return {[type]}         the public api
	 */
	function reflex(object, context, options) {
		options = options || {};
		options.context = context;

		// Public api
		return {
			identity: object,

			get fn() {
				return utils.getBoundFunction(object, options);
			},

			isFunction: function() {
				return utils.isFunction(object);
			},

			params: {
				count: function() {
					return utils.countParameters(object, options);
				},

				list: function() {
					return utils.listParameters(object, options);
				},

				bind: function(params) {
					return utils.bindParameters(object, params, options);
				}
			}
		}
	}

	// If we are in browser context, attach the r-function
	// to the window. If we are in node-context, return the 
	// r function as module export.
	var module = module || null;
	if(!module && window) {
		window.reflex = reflex;
	} else if(module) {
		module.exports = reflex;
	}

})();

