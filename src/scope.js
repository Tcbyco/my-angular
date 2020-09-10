"use strict";

function Scope() {
  // $$ = consider this private to angular.
  this.$$watchers = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn,
  };

  this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function () {
  this.$$watchers.forEach(function (watcher) {
    watcher.listenerFn();
  });
};

// I'm not sure whether I can use ES Modules - there may be node based
// implementation details later on that will necessitate require().
// For the time being, using ESM.
export default Scope;
// module.exports = Scope;
