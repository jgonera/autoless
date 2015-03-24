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

      Usage: autoless [options] <source_dir> [destination_dir]

      Options:

        -h, --help               output usage information
        --interval <ms>          How often files are checked for changes
        --no-watch               Compile what needs to be compiled and exit
        --source-map             Generate source map files next to css files
        --autoprefix <browsers>  Browserslist query, e.g. '> 1%, last 2 versions'


Pausing and resuming
--------------------

You can pause watching files by creating a .lessignore file in your
source directory (the one with .less files). When the file is removed,
watching is resumed.

You can use that e.g. in Git's `pre-rebase` and `post-rewrite` hooks to
avoid confusing Git when rebasing.

