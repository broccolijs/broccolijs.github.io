---
title: Building Broccoli Plugins
---

The first question you should ask yourself is "what is a Broccoli plugin?".

Plugins are what a build pipeline developer will interact with most. Plugins are what do the actual work of
transforming files at each step of build process. The API of a plugin requires just 2 steps, creating a class that
extends the [broccoli-plugin](https://github.com/broccolijs/broccoli-plugin) base class, and implementing a 
`build()` method, that performs some work and/or returns a promise.

Let's have a look at the basic building blocks of a Broccoli plugin.

# Broccoli-Plugin base class

```js
const Plugin = require('broccoli-plugin');

class MyPlugin extends Plugin
{
    constructor (inputNode, options) {
        super([inputNodes], options);
    }
    
    build() {
        // A plugin can receive single or multiple inputs nodes/directories
        // The files are available in this.inputPaths[0]/this.inputPaths[1]...
        // You can do anything with these files that you can do in node
        // The output of your plugin must write to this.outputPath
    }
}
```

## Constructor

`inputNode`: This can be one of two things, a string or another Broccoli plugin. If a string is passed, Broccoli
expects this to be a source directory and automatically converts this into a
[broccoli-source](https://github.com/broccolijs/broccoli-source).

When constructing your build pipeline you will be passing plugins as inputs to one another, these are commonly
referred to as `inputNodes`. The `broccoli-plugin` base class expects an array of `inputNodes`, however the 
majority of plugins will only require a single input, so feel free to pass an array up if only a single input is
required.

`options`: (all optional)

```js
{
    name: '',
    annotation: '',
    persistentOutput: false,
    needsCache: false,
}
```

`options.name`: Custom name used when debugging/printing stack traces. Broccoli will use the name of your
plugin if this field is not supplied.

`options.annotation`: In addition to the plugin name, Broccoli uses annotation to provide a descriptive label used
during debugging/printing stack traces. This is not often set by the plugin author, but by the consumer of the 
plugin to tell multiple instances of the same plugin apart.

`options.persistentOutput`: If true, the output directory is not automatically emptied between builds. By default,
when the Broccoli process is stopped, all plugins temporary output directories are deleted. If `persistentOutput`
is true, this will not happen and the contents will persist between processes. This allows a plugin which performs
expensive operations to re-use previously generated content (if its inputs have no changed for example).

`options.needsCache`: If true, a cache directory is created automatically and the path is set at `this.cachePath`. 
This allows a plugin to store temporary files that may be needed between rebuilds that are not included in the 
build output.

## Build

The build method is where the grunt (lol, intentional pun) of the work happens. Build can do anything you can do in
node. Additionally, if `build()` returns a promise, Broccoli will wait until the promise resolves before continuing
the rest of the build. Broccoli only builds one plugin at a time in order, from top to bottom of the build graph.

This function will typically access the following only properties:

`this.inputPaths`: An array of paths on disk corresponding to each node in inputNodes. Your plugin will read 
files from these paths.

`this.outputPath`: Broccoli will automatically create a directory for this plugin to write to when it starts up. 
Your plugin must write files to this path, and Broccoli will use this directory as an `inputPath` to the next 
plugin. This directory is emptied by Broccoli before each build, unless the `persistentOutput` option is true.

`this.cachePath`: The path on disk to an auxiliary cache directory. Use this to store files that you want preserved
between builds. This directory will only be deleted when Broccoli exits.

All paths stay the same between builds.

# Example plugin

Let's build a sample concatenation plugin. It's going to concatenate a set of files matching a glob expression.

```js
const Plugin = require('broccoli-plugin');
const walkSync = require('walk-sync');
const fs = require('fs');

class ConcatPlugin extends Plugin
{
    constructor(inputNodes, options) {
        super(inputNodes, options);
        
        this.fileMatchers = options.globs || ['**/*'];
        this.joinSeparator = '';
    }
    
    build() {
        const options = {
            includeBasePath: true,
            directories: false,
            globs: this.fileMatchers,
        };

        const content = this.inputPaths
            .reduce((output, inputPath) => output +
                walkSync(inputPath, options)
                .map(file => fs.readFileSync(file, { encoding: 'UTF-8' }))
                .join(this.joinSeparator),
            '');

        fs.writeFileSync(`${this.outputPath}/output.js`, content);
    }
}

module.exports = function concatPlugin(...params) {
    return new ConcatPlugin(...params);
}
module.exports.Plugin = ConcatPlugin;
```