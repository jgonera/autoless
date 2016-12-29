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
  _getOptions: function() {
    return {
      paths: path.dirname(this.file),
      filename: this.file
    };
  },

  _getAutoprefixerProcessor: function(autoprefix) {
    var browsers = autoprefix.split(',').map(function(b) {
      return b.trim();
    });

    return autoprefixer({ browsers: browsers, cascade: true });
  },

  parse: function(callback) {
    var self = this, options = this._getOptions();
    less.render(fs.readFileSync(this.file, 'utf-8'), options, function(err, output) {
      self.imports = output.imports;
      callback(err);
    });
  },

  _writeSourceMap: function(sourceMapContent, compileOptions) {
    var mapDstFile = this.dstFile + ".map";
    if (compileOptions.sourceMap) {
      fs.writeFileSync(mapDstFile, sourceMapContent, 'utf-8');
    }
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
    var self = this, options = this._getOptions();
    less.render(fs.readFileSync(this.file, 'utf-8'), Object.assign({}, compileOptions, options), function(err, output) {
      if (err) {
        callback(err);
      } else {
        try {
          self._writeSourceMap(output.map, compileOptions);

          var css = output.css;
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

