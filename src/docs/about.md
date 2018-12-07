---
title: What is Broccoli?
---

Broccoli is a simple Javascript build tool, that allows you to configure your build pipeline in javascript (like you're
already used to writing), and handles setting up the filesystem state for each transformation that's going to happen.

${toc}

## What is a build tool?

A build tool's job is to take input files (your javascript, css, html, etc) and process them and output them into some
form of distributable version. Typically this will involve things like javascript transformations to allow you to write
newer syntax that will work in a browser, to use things like Sass for your CSS, etc.

Broccoli.js is different to other build tools. You may be used to tools like [Grunt](https://gruntjs.com/) (a task
runner), [Gulp](https://gulpjs.com/) (streams) or [Webpack](https://webpack.js.org/) (a module bundler), these all
operate on different levels to Broccoli.

Broccoli works at the file-system level, it provides a Javascript API to wrap other node tools like
[Babel](https://babeljs.io/), [Rollup](https://rollupjs.org/) or [Node-Sass](https://github.com/sass/node-sass), that
operate on a set of input files, and emit output files.

## Thinking in Broccoli

Broccoli at its heart is very simple, it handles managing the file-system state, and simply takes input files and
passes them as inputs to plugins, and takes the output from each plugin and passes it as an input to the next one. The
order in which these operations happen is determined by the build file, that you're going to learn how to create.

You can think of Broccoli much like a simple programming language, where the output of a function can be passed as the
input to another function.

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
`.scss` files into `.css` files, it's output (your css) is passed to `autoprefixer()` which will add vendor prefixes
(like `-ms` or `-webkit`) to attributes, which is then in turn passed into `merge()`, which will merge the contents of
the output directories from `uglify` and `autoprefixer` into one directory, our final output.

This should all be fairly familiar to you if you've ever written Javascript (or any programming language for that
matter) before, it's just inputs and output.

## Thinking in Broccoli

There are 3 main concepts to get your head around when using Broccoli:

* [Nodes](#nodes)
* [Plugins](#plugins)
* [Trees](#trees)

### Nodes

Snapshot of the filesystem, come in 2 flavors.

**Source nodes**:

* Map to a “source” directory
* Can be watched/unwatched
* Can trigger a rebuild

**Transform nodes**:

* Take node(s) as input
* Cacheable
* Persistable


### Plugins



### Trees

