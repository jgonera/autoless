autoless
========

Another .less file watcher, but this time with:

* Dependency tracking (if a file imported by other files changes, they get
  compiled).
* Growl notifications (a notification with summary shows up after each time
  something is compiled).


Usage
-----

    $ npm install autoless -g
    $ autoless --help


Pausing and resuming
--------------------

You can pause watching files by creating a .lessignore file in your
source directory (the one with .less files). When the file is removed,
watching is resumed.

You can use that e.g. in Git's `pre-rebase` and `post-rewrite` hooks to
avoid confusing Git when rebasing.

