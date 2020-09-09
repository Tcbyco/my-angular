"use strict";

function Scope() {
  // $$ = consider this private to angular.
  this.$$watchers = [];
  this.test = "test";
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

module.exports = Scope;
