var fs = require('fs');
var path = require('path');
var less = require('less');
var autoprefixer = require('autoprefixer-core');

function LessFile(file, dstFile) {
  this.file = file;
  this.dstFile = dstFile;
  this.imports = [];
}

LessFile.prototype = {
  _getParser: function() {
    return new less.Parser({
      paths: path.dirname(this.file),
      filename: this.file
    });
  },

  _getAutoprefixerProcessor: function(autoprefix) {
    var browsers = autoprefix.split(',').map(function(b) {
      return b.trim();
    });

    return autoprefixer({ browsers: browsers, cascade: true });
  },

  parse: function(callback) {
    var self = this, parser = this._getParser();
    parser.parse(fs.readFileSync(this.file, 'utf-8'), function(err) {
      self.imports = Object.keys(parser.imports.files);
      callback(err);
    });
  },

  _addSourceMapProperties: function(compileOptions) {
    var mapDstFile = this.dstFile + ".map";
    // only gets called if compileOptions.sourceMap = true
    compileOptions.writeSourceMap = function (sourceMapContent) {
      fs.writeFileSync(mapDstFile, sourceMapContent, 'utf-8');
    };
    compileOptions.sourceMapURL = path.basename(mapDstFile);
  },

  _autoprefix: function(css, compileOptions) {
    var autoprefix = compileOptions.autoprefix;

    if (!autoprefix) {
      return css;
    }

    var processor = this._getAutoprefixerProcessor(compileOptions.autoprefix);
    var processOptions = {};

    if (compileOptions.sourceMap) {
      processOptions.map = { inline: false };
      processOptions.from = this.file;
      processOptions.to = this.dstFile;  
    }

    return processor.process(css, processOptions).css;
  },

  compile: function(compileOptions, callback) {
    var self = this;
    this._getParser().parse(fs.readFileSync(this.file, 'utf-8'), function(err, tree) {
      if (err) {
        callback(err);
      } else {
        try {
          self._addSourceMapProperties(compileOptions);

          var css = tree.toCSS(compileOptions);
          var autoprefixed = self._autoprefix(css, compileOptions);

          fs.writeFileSync(self.dstFile, autoprefixed, 'utf-8');

          callback(null);
        } catch (err) {
          callback(err);
        }
      }
    });
  }
};

module.exports = LessFile;

