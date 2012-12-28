var path = require('path')
  , EventEmitter = require('events').EventEmitter
  , LessFile = require('./lessfile');

function Manager(srcDir, dstDir) {
  this.srcDir = srcDir;
  this.dstDir = dstDir;
  this.files = {};
  this.dependencies = {};
  this.pending = 0;
}

Manager.prototype = new EventEmitter();

Manager.prototype.update = function(file, callback) {
  var self = this
    , lessFile = this.files[file];
  
  if (!lessFile) {
    var match = file.match(/^(.*)(\.[^\.]*)$/)
      , base = match[1]
      , ext = match[2]
      , dstFile = path.join(this.dstDir, base.slice(this.srcDir.length) + '.css');
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
  var self = this
    , pending = 0;

  function done(err) {
    --pending;
    if (pending === 0) callback();
  }

  files.forEach(function(file) {
    ++pending;
    self.update(file, done);
  });
};

Manager.prototype.compileAll = function(callback) {
  var self = this
    , pending = 0
    , errors = null;

  function done(err, lessFile) {
    self.emit('checked', lessFile.file, lessFile.dstFile, err ? 'error' : 'success');
    if (err) {
      self.emit('lessError', err);
      errors = true;
    }
    --pending;
    if (pending === 0) callback(errors);
  }

  for (var file in this.files) {
    var lessFile = this.files[file];
    if (!this.dependencies[file]) {
      ++pending;
      lessFile.compile(done);
    } else {
      self.emit('checked', lessFile.file, lessFile.dstFile, 'skipped');
    }
  };
};

Manager.prototype.check = function(file, callback) {
  var self = this
    , pending = 0;

  function done(err, lessFile) {
    --pending;
    if (pending === 0) callback();
  }

  this.update(file, function(err, lessFile) {
    if (!self.dependencies[file]) {
      lessFile.compile(function(err, lessFile) {
        self.emit('checked', lessFile.file, lessFile.dstFile, err ? 'error' : 'success');
        if (err) self.emit('lessError', err);
        if (callback) callback();
      });
    } else {
      self.emit('checked', lessFile.file, lessFile.dstFile, 'skipped');
      Object.keys(self.dependencies[file]).forEach(function(file) {
        ++pending;
        self.check(file, done);
      });
    }
  });
};

module.exports = Manager;

