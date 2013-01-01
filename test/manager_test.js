var Manager = require('../lib/manager')
  , LessFile = require('../lib/lessfile');

describe("Manager", function() {
  var manager;
  var files = [
    'test/less/main.less',
    'test/less/common.less',
    'test/less/variables.less'
  ];
  var filesError = files.concat('test/less/error.less');

  beforeEach(function() {
    manager = new Manager('test/less', 'test/css');
  });

  describe("#addFiles", function() {
    it("creates LessFile for each file", function(done) {
      manager.addFiles(files, function(err) {
        manager.files['test/less/main.less'].should.be.an.instanceof(LessFile);
        manager.files['test/less/common.less'].should.be.an.instanceof(LessFile);
        done();
      });
    });

    it("updates dependencies for files", function(done) {
      manager.addFiles(files, function(err) {
        manager.dependencies['test/less/common.less']['test/less/main.less'].should.be.true;
        done();
      });
    });
  });

  describe("#compileAll", function() {
    describe("when no errors", function() {
      beforeEach(function(done) {
        manager.addFiles(files, done);
      });

      it("compiles files that are not imported", function(done) {
        var spy = sinon.spy(manager.files['test/less/main.less'], 'compile');

        manager.compileAll(function() {
          spy.calledOnce.should.be.true;
          done();
        });
      });

      it("doesn't compile files that are imported", function(done) {
        var spy = sinon.spy(manager.files['test/less/common.less'], 'compile');

        manager.compileAll(function() {
          spy.called.should.be.false;
          done();
        });
      });

      it("fires checked event for each file", function(done) {
        var spy = sinon.spy();
        manager.on("checked", spy);

        manager.compileAll(function() {
          spy.calledWith('success', 'test/less/main.less', 'test/css/main.css').should.be.true;
          spy.calledWith('skipped', 'test/less/common.less').should.be.true;
          done();
        });
      })
    });

    describe("when errors", function() {
      beforeEach(function(done) {
        manager.addFiles(filesError, done);
      });

      it("calls callback with error", function(done) {
        manager.compileAll(function(err) {
          should.exist(err);
          done();
        });
      });

      it("fires checked event for each file", function(done) {
        var spy = sinon.spy();
        manager.on("checked", spy);

        manager.compileAll(function() {
          spy.calledWith('error', 'test/less/error.less', 'test/css/error.css').should.be.true;
          done();
        });
      })
    });
  });

  describe("#check", function() {
    beforeEach(function(done) {
      manager.addFiles(files, done);
    });

    it("adds file and updates dependencies if not present", function(done) {
      manager.check('test/less/another.less', function() {
        manager.dependencies['test/less/common.less']['test/less/another.less'].should.be.true;
        done();
      });
    });

    describe("when file is not imported", function() {
      it("compiles it", function(done) {
        var spy = sinon.spy(manager.files['test/less/main.less'], 'compile');
        manager.check('test/less/main.less', function() {
          spy.calledOnce.should.be.true;
          done();
        });
      });

      it("fires checked event for the file", function(done) {
        var spy = sinon.spy();
        manager.on("checked", spy);

        manager.check('test/less/main.less', function() {
          spy.alwaysCalledWith('success', 'test/less/main.less', 'test/css/main.css').should.be.true;
          done();
        });
      })
    });

    describe("when file is imported", function() {
      it("does not compile it", function(done) {
        var spy = sinon.spy(manager.files['test/less/common.less'], 'compile');
        manager.check('test/less/common.less', function() {
          spy.called.should.be.false;
          done();
        });
      });

      it("compiles its dependencies", function(done) {
        var spy = sinon.spy(manager.files['test/less/main.less'], 'compile');
        manager.check('test/less/common.less', function() {
          spy.called.should.be.true;
          done();
        });
      });

      it("fires checked event for files", function(done) {
        var spy = sinon.spy();
        manager.on("checked", spy);

        manager.check('test/less/common.less', function() {
          spy.calledWith('success', 'test/less/main.less', 'test/css/main.css').should.be.true;
          spy.calledWith('skipped', 'test/less/common.less').should.be.true;
          done();
        });
      })
    });

    describe("when file is imported (nested dependencies)", function() {
      it("does not compile imported files", function(done) {
        var commonSpy = sinon.spy(manager.files['test/less/common.less'], 'compile');
        var variablesSpy = sinon.spy(manager.files['test/less/variables.less'], 'compile');
        manager.check('test/less/variables.less', function() {
          commonSpy.called.should.be.false;
          variablesSpy.called.should.be.false;
          done();
        });
      });

      it("compiles its dependencies", function(done) {
        var spy = sinon.spy(manager.files['test/less/main.less'], 'compile');
        manager.check('test/less/variables.less', function() {
          spy.called.should.be.true;
          done();
        });
      });

      it("fires checked event for files", function(done) {
        var spy = sinon.spy();
        manager.on("checked", spy);

        manager.check('test/less/variables.less', function() {
          spy.calledWith('success', 'test/less/main.less', 'test/css/main.css').should.be.true;
          spy.calledWith('skipped', 'test/less/common.less').should.be.true;
          spy.calledWith('skipped', 'test/less/variables.less').should.be.true;
          done();
        });
      })
    });
  });
});
