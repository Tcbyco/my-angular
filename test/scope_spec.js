"use strict";
import Scope from "../src/scope";
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
  });
});
