var Manager = require('../lib/manager')
  , LessFile = require('../lib/lessfile');

describe("Manager", function() {
  var manager;
  var files = [
    'test/less/main.less',
    'test/less/common.less'
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
    });

    describe("when file is imported", function() {
      it("does not compile it", function(done) {
        var spy = sinon.spy(manager.files['test/less/common.less'], 'compile');
        manager.check('test/less/common.less', function() {
          spy.called.should.be.false;
          done();
        });
      });

      it("checks its dependencies", function(done) {
        var spy = sinon.spy(manager, 'check');
        manager.check('test/less/common.less', function() {
          spy.calledWith('test/less/main.less').should.be.true;
          done();
        });
      });
    });
  });
});
