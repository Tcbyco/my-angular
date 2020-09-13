"use strict";

function Scope() {
  // $$ = consider this private to angular.
  this.$$watchers = [];
}

// This fn definition serves as a unique initial value for a watched value.
// It is intentionally blank, as the function is never run.
// For test case, see scope_spec:"still calls listener on
// first digest when watch value is undefined"
function initWatchVal() {}

// listenerFn defaults to empty no-op to allow watchers that notify us
// when the scope is digested. See scope_spec test: "may have watchers
// that omit the listener function"
Scope.prototype.$watch = function (watchFn, listenerFn = function () {}) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn,
    last: initWatchVal,
  };

  this.$$watchers.push(watcher);
};

// arrow function used so 'this' will refer to the instance instead of window
Scope.prototype.$$digestOnce = function () {
  var newValue, oldValue, dirty;
  this.$$watchers.forEach((watcher) => {
    newValue = watcher.watchFn(this);
    oldValue = watcher.last;
    if (newValue !== oldValue) {
      watcher.last = newValue;
      watcher.listenerFn(
        newValue,
        oldValue === initWatchVal ? newValue : oldValue,
        this
      );
      dirty = true;
    }
  });
  return dirty;
};
// rerun digest() until all watched vals remain clean
// this is in case listener functions update watched vals.
Scope.prototype.$digest = function () {
  var dirty;
  do {
    dirty = this.$$digestOnce();
  } while (dirty);
};

// I'm not sure whether I can use ES Modules - there may be node based
// implementation details later on that will necessitate require().
// For the time being, using ESM.
export default Scope;
// module.exports = Scope;
