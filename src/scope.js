"use strict";

import _ from "lodash";

function Scope() {
  // $$ === consider this private to angular.
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

// Equality checker. Has option to enable value-based checking.
// Defaults to reference-based (===) equality.
Scope.prototype.$$areEqual = function (newValue, oldValue, valueBasedEquality) {
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
};

/* This fn definition serves as a unique initial value for
 the watched value. It is intentionally blank. The
 function is never called. This ensures that the listener
 fn will run on the first digest even if the watch fn returns
 undefined, because undefined != initWatchVal. 
 
 Further explanation: Since we compare the watch fn return 
 value to its previous return val in order
 to determine whether to run the listener fn, BUT we want the listener 
 fn to always run the first time, the initial watch
 value must be set a unique value that will always be different 
 to whatever the watch fn can return. A function definition will
 always be a unique reference.  
 See scope_spec: "still calls listener on first digest 
 when watch value is undefined" */
function initWatchVal() {}

// listenerFn defaults to empty no-op to allow watchers
// that notify us when the scope is digested. See scope_spec:
// "may have watchers that omit the listener function"
Scope.prototype.$watch = function (
  watchFn,
  listenerFn = function () {},
  valueBasedEquality = false
) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn,
    valueBasedEquality: valueBasedEquality,
    last: initWatchVal,
  };

  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
};

// arrow function used so 'this' will refer to the instance
// instead of window
Scope.prototype.$$digestOnce = function () {
  var newValue, oldValue, dirty;
  // Call each watch function.
  this.$$watchers.every((watcher) => {
    // .every() used to allow early abort optimization.
    newValue = watcher.watchFn(this);
    oldValue = watcher.last;
    // if the watch fn return value is different to last time
    // (ie the watcher is dirty), run the listener function.
    if (!this.$$areEqual(newValue, oldValue, watcher.valueBasedEquality)) {
      this.$$lastDirtyWatch = watcher;
      if (watcher.valueBasedEquality) {
        watcher.last = _.cloneDeep(newValue);
      } else {
        watcher.last = newValue;
      }
      watcher.listenerFn(
        newValue,
        oldValue === initWatchVal ? newValue : oldValue,
        this
      );
      dirty = true;

      // This is an optimization to skip unecessary digestion.
      // If a watcher is clean AND the most recent dirty watcher,
      // there cannot be any other dirty watchers. We can abort.
    } else if (this.$$lastDirtyWatch === watcher) {
      return false;
    }
    // .every() requires cb to return a truthy value to continue
    // iterating
    return true;
  });
  return dirty;
};
// rerun digest() until all watched vals remain clean
// this is in case listener functions update watched vals.
Scope.prototype.$digest = function () {
  var ttl = 10; // Time To Live - the max iterations before giving up.
  var dirty;
  this.$$lastDirtyWatch = null;
  do {
    dirty = this.$$digestOnce();
    if (dirty && !ttl--) {
      throw "10 digest iterations reached without stabilising";
    }
  } while (dirty);
};

// I'm not sure whether I can use ES Modules - there may be node based
// implementation details later on that will necessitate require().
// For the time being, using ESM.
export default Scope;
// module.exports = Scope;
