"use strict";

import _ from "lodash";

export default class Scope {
  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
  }
  // Equality checker. Has option to enable value-based checking.
  // Defaults to reference-based (===) equality.
  static areEqual(newValue, oldValue, valueBasedEquality) {
    if (valueBasedEquality) {
      return _.isEqual(newValue, oldValue);
    } else {
      return (
        newValue === oldValue ||
        (Number.isNaN(newValue) && Number.isNaN(oldValue))
      );
      // For reasoning behind Number.isNan() instead of isNan(),
      // see 'confusing special case behavior' at:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN#Description
    }
  }
  /* $watch(watchFn[, listenerFn, [valueBasedEquality]])
  Adds a watcher object to the Scope.$$watchers array.
  Returns a destroyWatcher function, which can be called to
  remove the watcher from the array.
  
  Parameters
  watchFn(scope){}
  Function to be called during each $digest().
  Returns the value in scope to be watched.
  
  [optional] listenerFn(newValue, oldValue, scope){}
  Is called during the first digest, and then
  only if the latest value returned by watchFn is different
  to the previous time watchFn was run.
  
  [optional] valueBasedEquality: a boolean. If true, watchFn
  return values will be compared using value based equality,
  rather than the default reference based (===) equality.
   */
  $watch(watchFn, listenerFn = function () {}, valueBasedEquality = false) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn,
      valueBasedEquality: valueBasedEquality,
      last: initWatchVal,
    };

    this.$$watchers.unshift(watcher);
    this.$$lastDirtyWatch = null;

    const destroyWatcher = () => {
      const index = this.$$watchers.indexOf(watcher);
      if (index >= 0) {
        this.$$watchers.splice(index, 1);
      }
    };
    return destroyWatcher;
  }
  /* $$digestOnce()
  Returns a boolean. True if the scope is dirty,
  false otherwise.
  
  Iterates over each watcher {} and calls its watchFn.
  If a watchFn return val is different to the last
  time it was called, run the watcher's listenerFn.
  
  $$digestOnce is called in a loop inside $digest.
  */
  $$digestOnce() {
    let newValue, oldValue, dirty;

    _.forEachRight(this.$$watchers, (watcher) => {
      try {
        newValue = watcher.watchFn(this);
        oldValue = watcher.last;
        // if the watch fn return value is different to last time
        // (ie the watcher is dirty), run the listener function.
        if (!Scope.areEqual(newValue, oldValue, watcher.valueBasedEquality)) {
          this.$$lastDirtyWatch = watcher;
          if (watcher.valueBasedEquality) {
            watcher.last = _.cloneDeep(newValue);
          } else {
            watcher.last = newValue;
          }
          // The first time the listenerFn runs there is no
          // old value, so it receives newValue twice.
          watcher.listenerFn(
            newValue,
            oldValue === initWatchVal ? newValue : oldValue,
            this
          );
          dirty = true;

          /*
          Optimization to skip unecessary digestion.
          If a watcher is clean AND is the most recent dirty watcher,
          there cannot be any other dirty watchers. Abort early. */
        } else if (this.$$lastDirtyWatch === watcher) {
          return false;
        }
        // todo: improve error logging
      } catch (e) {
        console.error(
          `Error during scope digest.
        error: ${e}`
        );
      }
      // continue iterating over the watchers
      return true;
    });

    // $digest will loop this function until dirty returns false,
    // or we loop 10 times without the watch successfully clearing.
    return dirty;
  }
  /* $digest()
   Loop digestOnce() until all dirty values are clean.
  */
  $digest() {
    let ttl = 10; // Time To Live - the max iterations before giving up.
    let dirty;
    this.$$lastDirtyWatch = null;
    do {
      dirty = this.$$digestOnce();
      if (dirty && !--ttl) {
        throw "10 digest iterations reached without stabilising";
      }
    } while (dirty);
  }
}

/* initWatchVal serves as a unique initial return value for
 the watchFn inside $watch. The function is never called. It ensures 
 that the listenerFn will run on the first digest regardless
 of the watchFn return value. See scope_spec: "still calls 
 listener on first digest when watch value is undefined" */
function initWatchVal() {}
