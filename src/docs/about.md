---
title: What is Broccoli?
---

Broccoli is a simple Javascript build tool, that allows you to configure your build pipeline in Javascript (like you're
already used to writing), and handles setting up the filesystem state for each transformation that's going to happen.

${toc}

## What is a build tool?

A build tool's job is to take input files (your javascript, css, html, etc), to process them and output the result of
those transformations, usually into some distributable form. Typically this will involve things like javascript 
transformations to allow you to write newer syntax that will work in a browser, to use things like Sass for your CSS,
etc.

Broccoli.js is different to other build tools. You may be used to tools like [Grunt](https://gruntjs.com/) (a task
runner), [Gulp](https://gulpjs.com/) (streams and pipes) or [Webpack](https://webpack.js.org/) (a module bundler),
these all operate on different levels to Broccoli.

Broccoli works at the file-system level, it provides a Javascript API to wrap other node tools like
[Babel](https://babeljs.io/), [Rollup](https://rollupjs.org/) or [Node-Sass](https://github.com/sass/node-sass), that
operate on a set of input files, and emit output files, that is all. Broccoli has no knowledge of the contents of 
your files, only input and output directories.

## Thinking in Broccoli

Broccoli at its heart is very simple. It's really just a set of connected file transformations, performed by plugins,
that manipulate files from one or multiple inputs, into a single output. Each plugin is responsible for processing files
passed to it in input directories, and writing files to its output directory.

Broccoli handles managing the file-system state, and simply takes input files and passes them as inputs to plugins, 
and takes the output from each plugin and passes it as an input to the next one. The order in which these operations 
happen is determined by the build file, a `Brocfile.js` that you're going to learn how to create.

You can think of Broccoli much like a simple programming language, where the output of a function can be passed as the
input(s) to another function.

E.g.:

```js
module.exports = merge([
    uglify(
        babel('src')
    ),
    autoprefixer(
        sass('src/styles', 'site.scss')
    )
]);
```

In the above, working from inner to outer, a `src` directory is passed to the `babel()` plugin (which will convert our
new ES6 syntax into ES5 that runs in the browser), the output of that is passed to the `uglify()` plugin which will
minify our JS into a smaller format. The output of `uglify()` will in turn be passed as 1 input to `merge()`.

Additionally, a `src/styles` directory and the input file `site.scss` is passed to `sass()` which will convert your
`.scss` files into `.css` files, its output (your css) is passed as an input to `autoprefixer()` which will add vendor 
prefixes (like `-ms` or `-webkit`) to attributes, which is then in turn passed into the `merge()` plugin.

Merge will copy the contents of each of its inputs into its output directory. Thus, it merges our uglified Javascript
and out vendor prefixed css. This then becomes our final output and is what is written to our target (destination) 
directory.

This should all be fairly familiar to you if you've ever written Javascript (or any programming language for that
matter) before, it's just inputs and output.

## Thinking in Broccoli

There are 3 main concepts to get your head around when using Broccoli:

* [Plugins](#plugins)
* [Nodes](#nodes)
* [Trees](#trees)

### Plugins

Plugins are what a build pipeline developer will interact with most. Plugins are what do the actual work of transforming
input files into output files. The API of a plugin is pretty simple, all that's required is creating a class that 
extends the [broccoli-plugin](https://github.com/broccolijs/broccoli-plugin) base class provided by Broccoli, and
implementing a `build()` method, that performs some work or returns a promise.

```js
const Plugin = require('broccoli-plugin');

class MyPlugin extends Plugin
{
  build() {
    // A plugin can receive single or multiple inputs nodes/directories
    // The files are available in this.inputPaths[0]/this.inputPaths[1]...
    // You can do anything with these files that you can do in node
    // The output of your plugin must write to this.outputPath
  }
}
```

Basic plugins are super simple, anything you can do in node, you can do in the `build()` method. A plugin can receive
one or multiple inputs, and these are available in the `this.inputPaths` array in the order they are provided.
`this.inputPaths` contains paths to directories, that are the `outputPath` of previous plugins. Each `inputPath` 
contains files that you can manipulate and write to `this.outputPath`. Broccoli will handle the state of these 
directories and passing them between plugins.

### Nodes

Nodes represent either a source directory or a plugin. They are like
[nodes in a graph](https://en.wikipedia.org/wiki/Vertex_(graph_theory)) or a network. Nodes are connected together with
one/many inputs and a single output. Internally, nodes are wrapped in a consistent interface called a `NodeWrapper` 
which Broccoli uses to maintain the filesystem state for each node.

Nodes come in 2 flavors:

**Source nodes**:

* Map to a "source" directory
* Can be watched/unwatched
* Can trigger a rebuild

**Transform nodes**:

* Are plugins
* Take node(s) as input
* Cacheable
* Persistable

The majority of nodes within the build graph will be transform nodes, with source nodes only used for input directories.
Internally, Broccoli wraps source nodes in a "source" plugin that connects the `inputPath` directly to the `outputPath`.

Source nodes are automatically created when a string is passed as an input to a plugin, Broccoli auto-converts this into
a [source plugin](https://github.com/broccolijs/broccoli-source) that maps its input directory to its output directory
and allows Broccoli to be notified when files change within the input directory.

### Trees

As nodes accept one or more inputs and emit a single output, and the entire build pipeline will write to a single output
directory, when connected together they form a sort of "tree" structure. 
Broccoli constructs this tree of connected nodes in memory as it parses the `Brocfile`, and sets up the filesystem 
state for each node, creating an `outputPath` for each node to write to.

You may often encounter the term "tree" when reading plugin READMEs or in tutorials, just remember a tree is a connected
set of plugins/nodes.

## Building

Broccoli build pipelines are defined using a `Brocfile.js` file in the root of the project. This `js` file sets up the 
build graph, connecting source directories via plugins, and exports a single node whose output will be written to the
target directory. Broccoli will then handle wiring up all of the nodes inputs and outputs into a graph (from the end 
node up to the start nodes), creating temporary directories as it goes, linking inputs to outputs between plugins using 
symlinks to make them super fast, run the build and invoke the `build()` method on each plugin, and finally resolve all
the symlinks and write the files from the final node into the destination build directory.

Confused? Here's an example:

```js
const mergeTrees = require("broccoli-merge-trees"); // broccoli merge-trees plugin
module.exports = mergeTrees(["dir1", "dir2"]);
```

This is a very simple `Brocfile.js` that merely merges the contents of `dir1` and `dir2` into the output
directory. The node graph would be represented as follows:

```
source node
            =====> transform node
source node
------------------------
/dir1 => source node 1
/dir2 => source node 2
mergeTrees(
    'dir1', => source node, implicitly created when using a string as an input
    'dir2' => source node, implicitly created when using a string as an input
)
module.exports = transformation node with input nodes dir1 and dir2
```

Thus `module.exports` contains a node that references the two input nodes, and an output path that will contain the
contents of `dir1` and `dir2` when the `build` command is run. The two input nodes reference two source directories,
`dir1` and `dir2`.

## Serving

One last thing. Broccoli comes with a built in development server, that provides an HTTP server to host your assets
in development, and perform rebuilds when source directories (nodes) change.

The local HTTP server runs on `http://localhost:4200`

Ok, that pretty much wraps up the basics, let's continue on an learn how to setup a Broccoli build pipeline in the
[Getting Started](/getting-started.html) guide.
