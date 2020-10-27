"use strict";

import _ from 'lodash';

function Scope() {
  // $$ = consider this private to angular.
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

// utility function to allow us to select value based checking,
// rather than the reference based default.
Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq){
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue;
  }
};

// This fn definition serves as a unique initial value for 
// a watched value. It is intentionally blank, as the 
// function is never run. For test case, see scope_spec:
// "still calls listener on first digest when watch value 
// is undefined"
function initWatchVal() {}

// listenerFn defaults to empty no-op to allow watchers 
// that notify us when the scope is digested. See scope_spec 
// test: "may have watchers that omit the listener function"
Scope.prototype.$watch = function (watchFn, listenerFn = function () {}, valueEq = false) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn,
    valueEq: valueEq,
    last: initWatchVal
  };

  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
};

// arrow function used so 'this' will refer to the instance 
// instead of window
Scope.prototype.$$digestOnce = function () {
  var newValue, oldValue, dirty;
  // Call each watch function. 
  this.$$watchers.every((watcher) => { // .every() used to allow early abort optimization.
    newValue = watcher.watchFn(this);
    oldValue = watcher.last;
    // if the watch fn return value is different to last time 
    // (ie the watcher is dirty), run the listener function.
    if (!this.$$areEqual(newValue, oldValue, watcher.valueEq)) { 
      // Keep track of the most recent dirty watcher. See else 
      // if below.
      this.$$lastDirtyWatch = watcher;
      watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue)
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
