"use strict";

import Scope from "../src/scope";
import _ from "lodash";

// var Scope = require("../src/scope");
describe("Scope", function () {
  it("can be constructed and used as an object", function () {
    var scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });
  describe("digest", function () {
    var scope;
    beforeEach(function () {
      scope = new Scope();
    });
    it("calls the listener function of a watch on first $digest", function () {
      var watchFn = function () {
        return "wat";
      };
      var listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });
    it("calls the watch function with the scope as the argument.", function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () {};
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalledWith(scope);
    });
    it("calls the listener function when the watched value changes.", function () {
      scope.someValue = "a";
      scope.counter = 0;
      scope.$watch(
        function (scope) {
          return scope.someValue;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      expect(scope.counter).toBe(0);
      scope.$digest();
      // first call to digest should always run the listener function
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.someValue = "b";
      expect(scope.counter).toBe(1);
      // Now that the watch function returns a different value,
      // the listener function will run during $digest();
      scope.$digest();
      expect(scope.counter).toBe(2);
    });
    it("still calls listener on first digest() when watch value is undefined", function () {
      scope.counter = 0;
      scope.$watch(
        function (scope) {
          return scope.someValue; // undefined
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      scope.$digest();
      // still runs listener
      expect(scope.counter).toBe(1);
    });
    it("calls listener with new value instead of old/initial value, the first time only", function () {
      scope.someValue = 123;
      var oldValueGiven;
      scope.$watch(
        function (scope) {
          return scope.someValue;
        },
        // set oldValueGiven to be whatever oldValue was passed to listener
        function (newValue, oldValue, scope) {
          oldValueGiven = oldValue;
        }
      );
      scope.$digest();
      expect(oldValueGiven).toBe(123);
    });
    // Registering a watcher without a listener lets us set up a
    // watcher that notifies us whenever an angular scope is digested.
    // Usage note: remember to ensure that the watch function does not
    // return anything.
    it("may have watchers that omit the listener function", function () {
      var watchFn = jasmine.createSpy().and.returnValue("something");
      scope.$watch(watchFn); // omitting listener
      scope.$digest();
      expect(watchFn).toHaveBeenCalled();
    });
    it("triggers chained watchers in the same digest", function () {
      scope.name = "Jane";
      scope.$watch(
        function (scope) {
          return scope.nameUpper;
        },
        function (newValue, oldValue, scope) {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + ".";
          }
        }
      );
      scope.$watch(
        function (scope) {
          return scope.name;
        },
        function (newValue, oldValue, scope) {
          if (newValue) {
            scope.nameUpper = newValue.toUpperCase();
          }
        }
      );
      scope.$digest();
      expect(scope.initial).toBe("J.");
      scope.name = "Bob";
      scope.$digest();
      expect(scope.initial).toBe("B.");
    });
    it("gives up on watchers after 10 iterations", function () {
      scope.counterA = 0;
      scope.counterB = 0;
      scope.$watch(
        function (scope) {
          return scope.counterB;
        },
        function (newValue, oldValue, scope) {
          scope.counterA++;
        }
      );
      scope.$watch(
        function (scope) {
          return scope.counterA;
        },
        function (newValue, oldValue, scope) {
          scope.counterB++;
        }
      );
      expect(function () {
        scope.$digest();
      }).toThrow();
    });
    // logically, if the most recent dirty watch is now clean, there must not be any
    // other dirty watchers left. We should skip the rest.
    it("skips unnecessary digests and ends early when the last dirty watch is now clean", function () {
      scope.array = _.range(100);
      var watchExecutions = 0;
      _.times(100, function (i) {
        scope.$watch(
          function (scope) {
            watchExecutions++;
            return scope.array[i];
          },
          function (newValue, oldValue, scope) {}
        );
      });
      scope.$digest();
      expect(watchExecutions).toBe(200);

      scope.array[0] = 420;
      scope.$digest();
      expect(watchExecutions).toBe(301);
    });
    it('does not end digest before watchers added mid-digest are run', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function(scope){return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.$watch(
            function(scope){return scope.aValue;},
            function(newValue, oldValue, scope) {
              scope.counter++;
            }
          );
        }
      );
      scope.$digest();
      expect(scope.counter).toBe(1);
    });
  });
});
