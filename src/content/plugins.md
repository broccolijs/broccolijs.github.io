---
title: Broccoli Plugins
---

The first question you should ask yourself is "what is a Broccoli plugin?".

Plugins are what a build pipeline developer will interact with most. Plugins are what do the actual work of
transforming files at each step of build process. The API of a plugin requires just 2 steps, creating a class that
extends the [broccoli-plugin](https://github.com/broccolijs/broccoli-plugin) base class, and implementing a 
`build()` method that performs some work and/or returns a promise.

${toc}

Let's have a look at the basic building blocks of a Broccoli plugin.

# Broccoli-Plugin base class

```js
import Plugin from 'broccoli-plugin';

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

`options.annotation`: In addition to the plugin name, Broccoli uses annotations to provide a descriptive label used
during debugging/printing stack traces. This is not often set by the plugin author, but by the consumer of the 
plugin to tell multiple instances of the same plugin apart.

`options.persistentOutput`: If true, the output directory is not automatically emptied between
(re)builds. By default, a plugin's `outputPath` is emptied before each (re)build ensuring a 
consistent output state with every build. If `persistentOutput` is set to true, this cleanup
will not happen and the output directory will persist. This may be useful if your plugin
implements caching to allow the build method to be skipped. 

`options.needsCache`: Despite the name, `needsCache` doesn't provide caching for the plugin. If true, a directory
is created for the plugin to store temporary files that may be needed between rebuilds that are not included in the 
build output. Broccoli sets the path to this directory to `this.cachePath`.  

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

`this.cachePath`: The path on disk to an auxiliary cache directory. Use this to store files that 
you want preserved between builds but do not end up in your outputPath. This path is only set
when the `needsCache` option is true, and the directory will only be deleted when the Broccoli 
process exits.

All paths stay the same between rebuilds.

# Example plugin

Let's build a sample concatenation plugin. It's going to concatenate a set of files matching a glob expression.

```js
import Plugin from 'broccoli-plugin';
import walkSync from 'walk-sync';
import fs from 'fs';

export class ConcatPlugin extends Plugin
{
    constructor(inputNodes, options) {
        super(inputNodes, options);
        
        this.fileMatchers = options.globs || ['**/*'];
        this.joinSeparator = options.joinSeparator || "\n";
        this.outputFile = options.outputFile || 'concat';
    }
    
    build() {
        const walkOptions = {
            includeBasePath: true,
            directories: false,
            globs: this.fileMatchers,
        };

        const content = this.inputPaths
            .reduce((output, inputPath) => output + this.joinSeparator +
                walkSync(inputPath, walkOptions)
                    .map(file => fs.readFileSync(file, { encoding: 'UTF-8' }))
                    .join(this.joinSeparator),
            '');

        fs.writeFileSync(`${this.outputPath}/${this.outputFile}`, content);
    }
}

export default function concatPlugin(...params) {
    return new ConcatPlugin(...params);
}
```

Let's take a look and see what's happening here. 

First, we are importing our dependencies. We are using 3 packages, the
[broccoli-plugin](https://github.com/broccolijs/broccoli-plugin) base class that we are extending, a package 
called [walk-sync](https://www.npmjs.com/package/walk-sync) which synchronously walks a directory recursively, 
and the Node [fs](https://nodejs.org/api/fs.html) package.

After this we define the class and the constructor:
```js
export class ConcatPlugin extends Plugin
{
    constructor(inputNodes, options) {
        super(inputNodes, options);
        
        this.fileMatchers = options.globs || ['**/*'];
        this.joinSeparator = options.joinSeparator || "\n";
        this.outputFile = options.outputFile || 'concat';
    }
```

Here we are defining our class and exporting it so that other plugins can extend it by doing:
```js
import { ConcatPlugin } from 'concat-plugin';

class MyPlugin extends ConcatPlugin {
```

The constructor accepts multiple inputNodes and an options hash. As you can see we are defining 3 options, a 
default glob expression, the join character and the output file name. These will be used to inform how our build
method should work. 

Next up we define our `build()` method. First we setup some options for the walk-sync package then we iterate 
`this.inputPaths` using a reduce function. If you've not used reduce before, it provides a simple functional
programming way of iterating an input and combining the output into an accumulator. In our case we are merely 
concatenating the output together into one big string.

```js
    build() {
        const walkOptions = {
            includeBasePath: true,
            directories: false,
            globs: this.fileMatchers,
        };
        
        const content = this.inputPaths
            .reduce((output, inputPath) => output + this.joinSeparator +
                walkSync(inputPath, walkOptions)
                    .map(file => fs.readFileSync(file, { encoding: 'UTF-8' }))
                    .join(this.joinSeparator),
            '');
    
        fs.writeFileSync(`${this.outputPath}/${this.outputFile}`, content);
    }
```

Next we iterate each file the `inputPath` and read its contents. We do this via the map function, which 
transforms the array of files into an array of the contents of each file. We then join all the files together
with the separator character, which is returned as the result to the reduce method above. 

After the above is complete, we now have all of the file contents within the `content` variable and all that is 
left is to write that to the outputFile. 

That's it, plugin complete. In our case, the plugin is entirely synchronous and as such just returns at the end.
If we needed the plugin to be asynchronous, we could alternatively return a promise and Broccoli would wait until
the promise resolved before continuing the build.

Lastly, we export a default function that will be used when this plugin is imported into a build pipeline
```js
export default function concatPlugin(...params) {
    return new ConcatPlugin(...params);
}
```

E.g.

```js
// Brocfile.js
import concat from 'concat-plugin';

export default () => concat(['dir1', 'dir2']);
```

As you can see, there isn't really any magic happening here, it's all standard Node code, just wrapped in a 
`build()` method that is provided an array of `inputPaths` and an `outputPath` to write to.
