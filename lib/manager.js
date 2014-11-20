var path = require('path');
var EventEmitter = require('events').EventEmitter;
var LessFile = require('./lessfile');

var ignoreRe = /\.lessignore$/;

function Manager(srcDir, dstDir, compileOptions) {
  // strip "./" from the beginning for dstFile path generation to work
  this.srcDir = srcDir.replace(/^\.\/?/, '');
  this.dstDir = dstDir.replace(/^\.\/?/, '');
  this.compileOptions = compileOptions;
  this.files = {};
  this.dependencies = {};
  this.pending = 0;
  this.ignore = false;
}

Manager.prototype = new EventEmitter();

Manager.prototype._update = function(file, callback) {
  var self = this, lessFile = this.files[file];

  if (!lessFile) {
    var base = file.match(/^(.*)\.[^\.]*$/)[1];
    var dstFile = path.join(this.dstDir, base.slice(this.srcDir.length) + '.css');
    lessFile = this.files[file] = new LessFile(file, dstFile);
  }

  lessFile.parse(function(err) {
    lessFile.imports.forEach(function(importFile) {
      self.dependencies[importFile] = self.dependencies[importFile] || {};
      self.dependencies[importFile][lessFile.file] = true;
    });
    callback(err);
  });
};

Manager.prototype.addFiles = function(files, callback) {
  var self = this, pending = files.length;

  function done() {
    --pending;
    if (pending === 0) callback();
  }

  files.forEach(function(file) {
    if (!ignoreRe.test(file)) {
      self._update(file, done);
    } else {
      done();
    }
  });
};

Manager.prototype._compileBatch = function(files, callback) {
  var self = this, errors = 0, summary = [], pending = files.length;

  function done(err, info) {
    if (err) ++errors;
    summary.push(info);
    --pending;
    if (pending === 0) {
      self.emit('checkSummary', summary);
      if (callback) callback(errors);
    }
  }

  function compile(file) {
    var lessFile = self.files[file];

    function report(err, info) {
      self.emit('check', info);
      if (err) self.emit('lessError', err);
      done(err, info);
    }

    if (!self.dependencies[file]) {
      lessFile.compile(self.compileOptions, function(err) {
        report(err, { status: err ? 'error' : 'success', src: file, dst: lessFile.dstFile });
      });
    } else {
      report(null, { status: 'skipped', src: file });
    }
  }

  files.forEach(compile);
};

Manager.prototype.compileAll = function(callback) {
  this._compileBatch(Object.keys(this.files), callback);
};

Manager.prototype.check = function(file, callback) {
  var self = this;

  if (ignoreRe.test(file)) {
    this.emit('ignore', file);
    this.ignore = true;
  }

  if (this.ignore) return;

  this._update(file, function() {
    if (self.dependencies[file]) {
      self._compileBatch([file].concat(Object.keys(self.dependencies[file])), callback);
    } else {
      self._compileBatch([file], callback);
    }
  });
};

Manager.prototype.remove = function(file) {
  delete this.files[file];
  delete this.dependencies[file];

  if (ignoreRe.test(file)) {
    this.emit('resume', file);
    this.ignore = false;
  }
};

module.exports = Manager;

