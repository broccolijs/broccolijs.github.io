---
title: What is Broccoli.js?
---

Broccoli is a JavaScript build tool. A build tool is a piece of software that is responsible for assembling your
applications assets (JavaScript, CSS, images, etc) into some distributable form, usually to run in a browser.
All configuration is done in JavaScript (no confusing/messy config files) via a modular plugin architecture.

${toc}

## What is a build tool?

A build tool's job is to take input files (your JavaScript, CSS, HTML, etc), to process them and output the result
of those transformations, usually into some distributable form. Typically this will involve things like JavaScript 
transformations to allow you to write newer syntax that will work in a browser, to use a CSS pre-processor like 
Sass for your CSS, etc.

Broccoli.js is different from other build tools. You may be used to tools like [Grunt](https://gruntjs.com/) (a 
task runner), [Gulp](https://gulpjs.com/) (streams and pipes) or [Webpack](https://webpack.js.org/) (a module 
bundler), these all aim to solve different problems than what Broccoli what built for.

Broccoli provides a modular plugin API to leverage other Node tools. Tools like [Babel](https://babeljs.io/),
[Rollup](https://rollupjs.org/), [Node-Sass](https://github.com/sass/node-sass), 
[Webpack](https://webpack.js.org/), [Browserify](http://browserify.org/), and many more can easily be used with 
Broccoli. These tools perform the actual work by transforming files, Broccoli merely connects inputs to outputs.

## Thinking in Broccoli

There are 3 main concepts to get your head around when using Broccoli:

* [Directories](#directories)
* [Plugins](#plugins)
* [Trees](#trees)

### Directories

Using the above tools in a standalone fashion is relatively straight forward, they read input files, and write 
to output files. The difficulty comes when connecting different tools together as you need to manage all the 
interim state yourself. The only common interface between them is the file system.

Say we want to concatenate our JavaScript files, minify them, and copy the results to our build directory:

```js
import fs from 'fs';
import path from 'path';
import minify from 'minify';
import readDir from './readDir';
import readFiles from './readFiles';

function concatFiles(sourceDir, outputFile) {
    const output = readDir(sourceFiles).reduce((output, file) => output += `;${file.content}`, '');
    fs.writeFileSync(outputFile, output)
}

function minifyFiles(sourceFiles, outputDir) {
    return readFiles(sourceFiles).map(file => {
        const minified = minify(file.path);
        const outputFile = `${outputDir}/${file.name}.min.${file.extension}`;
        fs.writeFileSync(outputFile, minified)
        return outputFile;
    })
}

function copyFiles(sourceFiles, outputDir) {
    sourceFiles.forEach(filePath => {
        const file = path.basename(filePath);
        fs.createReadStream(path).pipe(fs.createWriteStream(`${outputDir}/${file}`));
    });
}

const concatted = concatFiles('app', '/tmp/concat-files')
const minified = minifyFiles(concatted, '/tmp/minified-files')
copyFiles(minified, './build');
```

The above is all well and good, but notice how we have to handle the state between each operation. Now imagine how
this scales as our build pipeline grows, adding in Sass compilation, JavaScript transpilation (Babel),
fingerprinting, etc. That's lots of temp directories and file state that you have to handle.

Broccoli works by managing of a set of directories, connected together by plugins, which describe how files
are moved or transformed at each step of the build process. Broccoli ensures plugins are called in the prescribed
order, and writes the result to a `target` directory. Each plugin is responsible for processing files passed to
it in input directories, and writing files to its output directory. This allows you to focus on the
transformations and not how files are passed between each plugin.

For example:
```sh
app                                                       [target]
 ├─ src                                                    │
 │   ├─ index.js   --> ConcatPlugin() ┐                    │
 │   └─ other.js                      ├─ MergePlugin() --> ├─ prod.js
 └─ styles                            │                    └─ site.css
     ├─ site.scss  --> SassPlugin() ──┘
     └─ layout.scss
```

Broccoli itself doesn't really care about files, it simply takes source directories and passes them as inputs to
plugins, creates an output directory for the plugin to write to, and passes that output directory it as an input
to the next plugin.

Broccoli is configured with a file in the root of your project called `Brocfile.js`. This file defines the build
pipeline for your application, and is written in plain old JavaScript. The order in which operations happen is
determined by this build file. All that is required is that `module.exports` returns a plugin/string.

You can think of broccoli-plugins much like a simple programming language, where the output of a function can be
passed as the input(s) to another function.

E.g.:

```js
export default (options) => {
    let js = babel('src');
    js = uglify(js);

    let css = sass('src/styles', 'site.scss');
    css = autoprefixer(css);

    return merge([js, css]);
};
```

This could also be expressed as:
```js
export default (options) => {
     return merge([
        uglify(
            babel('src')
        ),
        autoprefixer(
            sass('src/styles', 'site.scss')
        )
    ])
};
```

In the above, a `src` directory is passed to the `babel()` plugin (which will convert our new ES6 syntax into
ES5 that runs in the browser), the output of that is passed to the `uglify()` plugin which will minify our JS
into a smaller format. The output of `uglify()` will in turn be passed as 1 input to `merge()`.

Additionally, a `src/styles` directory and the input file `site.scss` is passed to `sass()` which will convert your
`.scss` files into `.css` files, its output (your css) is passed as an input to `autoprefixer()` which will add
vendor  prefixes (like `-ms` or `-webkit`) to attributes, which is then in turn passed into the `merge()` plugin.

The `merge()` plugin will copy the contents of each of its inputs into its output directory. Thus, it merges our
uglified JavaScript and out vendor prefixed css. This then becomes our final output and is what is written to
our target (destination) directory.

Finally, the `export default () => ` line exports a function that Broccoli will invoke with an `options` object,
that contains an `env` property to indicate the environment. This is set from the `--environment` CLI argument and
defaults to `development`.

This should all be fairly familiar to you if you've ever written JavaScript (or any programming language for that
matter) before, it's just inputs and output.

Note: [ES Modules](https://nodejs.org/api/esm.html) syntax is supported by Broccoli in the current master. Prior
to this, standard CommonJs syntax with `require` and `module.exports` should be used.

### Plugins

Plugins are what a build pipeline developer will interact with most. Plugins are what do the actual work of
transforming files at each step of build process. The API of a plugin is pretty simple, all that's required is
creating a class that extends the [broccoli-plugin](https://github.com/broccolijs/broccoli-plugin) base class, and
implementing a `build()` method, that performs some work or returns a promise.

```js
import Plugin from 'broccoli-plugin';

class MyPlugin extends Plugin
{
  build() {
    // A plugin can receive single or multiple inputs nodes/directories
    // The files are available in this.inputPaths[0]/this.inputPaths[1]...
    // You can do anything with these files that you can do in Node
    // The output of your plugin must write to this.outputPath
  }
}
```

A broccoli-plugin has only one purpose, to transform the files from its `this.inputPaths` directories to its
`this.outputPath` directory when its `build()` function is invoked. Anything you can do in Node, you can do in
the `build()` method. A plugin can receive one or multiple inputs, and these are available in the `this.inputPaths`
array in the order they are provided.

`this.inputPaths` contains paths to directories, that are the `outputPath` of previous plugins. Each `inputPath`
contains files that you can manipulate and write to `this.outputPath`. Broccoli will handle the state of these
directories and take responsibility for passing them between plugins.

There is a special case where a `string` is passed as an input to a plugin. When parsing your build pipeline,
Broccoli will automatically convert a string input into a
[source plugin](https://github.com/broccolijs/broccoli-source). This plugin basically connects its input directory
to its output directory, and also allows Broccoli to `watch` and be notified when files within the input
directory change and trigger a rebuild. You can also manually create an `unwatched` directory from a string by
using [UnwatchedDir](https://github.com/broccolijs/broccoli-source#new-unwatcheddirdirectorypath-options),
changes in this directory will not trigger a rebuild.

### Trees

The build pipeline is series of connected plugins, from one or more input directories to a single target directory.
Working from the target directory (the final output) back up to the source directories resembles a tree. Think of a
piece of Broccoli and you should have a mental model of what a build pipeline looks like.

<div style="text-align: center">

![broccoli tree](/assets/logo/logo-small.png)

</div>

Broccoli parses the result of the `export default` from the `Brocfile.js`, and traverses up all of the connected
nodes all the way to the source directories to produce this tree.

As Broccoli does this, it sets up the filesystem state for each plugin, creating an `outputPath` for each to write
to. Broccoli normalizes each plugin into what it calls `nodes`, that contain information about the inputs and
output of each item in the build pipeline.

You may often encounter the term "tree" when reading plugin READMEs or in tutorials, just remember a tree is a
connected set of plugins.

## Building

When Broccoli starts up, the build file `Brocfile.js` file in the root of the project is parsed, from last
(target) plugin/node up to the source directories. As it does so, Broccoli handles wiring up all of the nodes'
inputs and outputs into a graph (from the end node up to the start nodes), creating temporary output directories
for each as it goes, linking inputs to outputs.

This graph of nodes is held in memory, and reused whenever a rebuild is triggered. When a `build` or `rebuild`
is triggered, Broccoli will invoke the `build()` method on each plugin in the order they're defined in the
`Brocfile.js`, building one plugin at a time, and finally write the files from the final node into the
destination build directory.

Here's an example:

```js
import mergeTrees from "broccoli-merge-trees"; // broccoli merge-trees plugin
module.exports = mergeTrees(["dir1", "dir2"]);
```

This is a very simple `Brocfile.js` that merely merges the contents of `dir1` and `dir2` into the output
directory. The node graph would be represented as follows:

```
source plugin
               =====> merge plugin
source plugin
------------------------
/dir1 => source node 1
/dir2 => source node 2
mergeTrees(
    'dir1', => source node, implicitly created when using a string as an input
    'dir2' => source node, implicitly created when using a string as an input
)
export default () => broccoli-merge-trees node with source nodes dir1 and dir2 as inputs
```

The two input nodes reference two source directories, `dir1` and `dir2`.
Thus `export default` contains a node that references the two input nodes, and an output path that will contain the
contents of `dir1` and `dir2` when the `build` command is run. 

## Serving

One last thing. Broccoli comes with a built in development server, that provides an HTTP server to host your assets
in development, and perform rebuilds when source directories (nodes) change.

The local HTTP server runs on `http://localhost:4200`

Ok, that pretty much wraps up the basics, let's continue on an learn how to setup a Broccoli build pipeline in the
[Getting Started](/getting-started.html) guide.
