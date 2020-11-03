"use strict";

// var Scope = require("../src/scope");
import Scope from "../src/scope";
import _ from "lodash";


describe("Scope", () => {
  it("can be constructed and used as an object", () => {
    let scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });
  describe("digest", () => {
    let scope;
    beforeEach(() => {
      scope = new Scope();
    });
    it("calls the listener function of a watch on first $digest", () => {
      const watchFn = () => {
        return "wat";
      };
      const listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });
    it("calls the watch function with the scope as the argument.", () => {
      const watchFn = jasmine.createSpy();
      const listenerFn = () => {};
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalledWith(scope);
    });
    it("calls the listener function when the watched value changes.", () => {
      scope.someValue = "a";
      scope.counter = 0;
      scope.$watch(
        (scope) => {
          return scope.someValue;
        },
        (newValue, oldValue, scope) => {
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
    it("still calls listener on first digest() when watch value is undefined", () => {
      scope.counter = 0;
      scope.$watch(
        (scope) => {
          return scope.someValue; // undefined
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );
      scope.$digest();
      // expect digest to still call listener
      expect(scope.counter).toBe(1);
    });
    it("calls listener with new value instead of old/initial value, the first time only", () => {
      scope.someValue = 123;
      let oldValueGiven;
      scope.$watch(
        (scope) => {
          return scope.someValue;
        },
        // set oldValueGiven to be whatever oldValue was passed to listener
        (newValue, oldValue, scope) => {
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
    it("may have watchers that omit the listener function", () => {
      const watchFn = jasmine.createSpy().and.returnValue("something");
      scope.$watch(watchFn); // omitting listener
      scope.$digest();
      expect(watchFn).toHaveBeenCalled();
    });
    // todo: make this test clearer
    it("triggers chained watchers in the same digest", () => {
      scope.name = "Jane";
      scope.$watch(
        (scope) => {
          return scope.nameUpper;
        },
        (newValue, oldValue, scope) => {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + ".";
          }
        }
      );
      scope.$watch(
        (scope) => {
          return scope.name;
        },
        (newValue, oldValue, scope) => {
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
    it("gives up on watchers after 10 iterations", () => {
      scope.counterA = 0;
      scope.counterB = 0;
      scope.$watch(
        (scope) => {
          return scope.counterB;
        },
        (newValue, oldValue, scope) => {
          scope.counterA++;
        }
      );
      scope.$watch(
        (scope) => {
          return scope.counterA;
        },
        (newValue, oldValue, scope) => {
          scope.counterB++;
        }
      );
      expect(() => {
        scope.$digest();
      }).toThrow();
    });
    // logically, if the most recent dirty watch is now clean, there must not be any
    // other dirty watchers left. We should skip the rest.
    it("skips unnecessary digests and ends early when the last dirty watch is now clean", () => {
      scope.array = _.range(100);
      let watchExecutions = 0;
      _.times(100, function (i) {
        scope.$watch(
          (scope) => {
            watchExecutions++;
            return scope.array[i];
          },
          (newValue, oldValue, scope) => {}
        );
      });
      scope.$digest();
      expect(watchExecutions).toBe(200);

      scope.array[0] = 420;
      scope.$digest();
      // expect digest to short circuit once we have cleaned the last
      // dirty value.
      expect(watchExecutions).toBe(301);
    });
    it("does not end digest before watchers added mid-digest are run", () => {
      scope.aValue = "abc";
      scope.counter = 0; // incremented when the inner watch is digested.

      scope.$watch(
        (scope) => {
          return scope.aValue;
        },
        // The listenerFn adds another watch to the same value.
        (newValue, oldValue, scope) => {
          scope.$watch(
            (scope) => {
              return scope.aValue;
            },
            (newValue, oldValue, scope) => {
              scope.counter++;
            }
          );
        }
      );
      scope.$digest();
      expect(scope.counter).toBe(1);
    });
    it("compares based on value if enabled", () => {
      scope.aValue = [1, 2, 3];
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        },
        true // use value-based dirty checking
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      // Mutate the watched array.
      scope.aValue.push(4);
      scope.$digest();
      // Check that the change was noticed.
      expect(scope.counter).toBe(2);
    });
    // NaN != NaN, so we must ensure watched NaN's do not
    // remain dirty forever.
    it("correctly identifies if a NaN is clean, when using reference-based equality", () => {
      scope.number = 0 / 0; //NaN
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          return scope.number;
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);
    });
    it("catches exceptions in watch function and continues", () => {
      scope.aValue = "abc";
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          throw new Error(); // digest should not fail despite Error
        },
        (newValue, oldValue, scope) => {}
      );
      scope.$watch(
        (scope) => {
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );
      scope.$digest();
      // expect the second watch to still run and increment counter.
      expect(scope.counter).toBe(1);
    });
    it("catches exceptions in listener function and continues", () => {
      scope.aValue = "abc";
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          throw new Error('This error should not break digest');
        }
      );
      scope.$watch(
        (scope) => {
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      // expect the second watch to still run and increment counter.
      expect(scope.counter).toBe(1);
    });
    it("allows destroying a $watch with a removal function", () => {
      scope.aValue = "abc";
      scope.counter = 0;

      const destroyWatch = scope.$watch(
        // should return a removal function
        (scope) => {
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.aValue = "def";
      scope.$digest();
      expect(scope.counter).toBe(2);

      scope.aValue = "ghi";
      destroyWatch();
      scope.$digest();
      expect(scope.counter).toBe(2);
    });
    it('allows destroying a $watch during digest', () => {
      scope.aValue = 'abc';
      let watchCalls = [];

      scope.$watch(
        function(scope) {
          watchCalls.push('first');
          return scope.aValue;
        }
      );

      const destroyWatch = scope.$watch(
        function(scope) {
          watchCalls.push('second');
          destroyWatch(); // returned during assignment. Definitely check this one in debugger.
        }
      );
      
      scope.$watch(
        function(scope) {
          watchCalls.push('third');
          return scope.aValue;
        }
      );

      scope.$digest();
      expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
    });
  });
});
