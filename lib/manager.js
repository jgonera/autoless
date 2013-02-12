var path = require('path');
var EventEmitter = require('events').EventEmitter;
var LessFile = require('./lessfile');

function Manager(srcDir, dstDir) {
  this.srcDir = srcDir;
  this.dstDir = dstDir;
  this.files = {};
  this.dependencies = {};
  this.pending = 0;
}

Manager.prototype = new EventEmitter();

Manager.prototype.update = function(file, callback) {
  var self = this, lessFile = this.files[file];

  if (!lessFile) {
    var base = file.match(/^(.*)\.[^\.]*$/)[1]
    var dstFile = path.join(this.dstDir, base.slice(this.srcDir.length) + '.css');
    lessFile = this.files[file] = new LessFile(file, dstFile);
  }

  lessFile.parse(function(err) {
    lessFile.imports.forEach(function(importFile) {
      self.dependencies[importFile] = self.dependencies[importFile] || {};
      self.dependencies[importFile][lessFile.file] = true;
    });
    callback(err, lessFile);
  });
};

Manager.prototype.addFiles = function(files, callback) {
  var self = this, pending = files.length;

  function done(err) {
    --pending;
    if (pending === 0) callback();
  }

  files.forEach(function(file) {
    self.update(file, done);
  });
};

Manager.prototype._check = function(file, recurse, callback) {
  var self = this, lessFile = this.files[file], summary = [], errors = 0, pending;

  function done(err, info) {
    summary = summary.concat(info);
    if (err) ++errors;
    --pending;
    if (pending === 0) callback(errors, summary);
  }

  if (!this.dependencies[file]) {
    lessFile.compile(function(err) {
      var info = { status: err ? 'error' : 'success', src: lessFile.file, dst: lessFile.dstFile };
      self.emit('check', info);
      if (err) self.emit('lessError', err);
      if (callback) callback(err, [info]);
    });
  } else {
    var info = { status: 'skipped', src: lessFile.file };
    self.emit('check', info);
    if (recurse) {
      var files = Object.keys(self.dependencies[file]);
      pending = files.length;
      summary.push(info);
      files.forEach(function(file) {
        self._check(file, recurse, done);
      });
    } else if (callback) {
      callback(null, [info]);
    }
  }
};

Manager.prototype.compileAll = function(callback) {
  var self = this, pending = Object.keys(this.files).length, errors = 0, summary = [];

  function done(err, info) {
    summary = summary.concat(info);
    errors += err;
    --pending;
    if (pending === 0) {
      self.emit('checkSummary', summary);
      callback(errors)
    };
  }

  for (var file in this.files) {
    self._check(file, false, done);
  };
};

Manager.prototype.check = function(file, callback) {
  var self = this;

  this.update(file, function(err) {
    self._check(file, true, function(errors, summary) {
      self.emit('checkSummary', summary);
      if (callback) callback();
    });
  });
};

module.exports = Manager;

