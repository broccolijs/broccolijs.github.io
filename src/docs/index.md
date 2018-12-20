---
title: Welcome to Broccoli.js
layout: homepage
---

### So what is Broccoli?

Broccoli is a Javascript build tool that exposes a simple Javascript API to perform file-based transformations,
allowing developers to easily build complex build pipelines, using a simple, functional API.

### Why choose Broccoli?

<div class="summary">
    <div>
        <h4>Blazing fast ⚡️</h4>
        <p>Broccoli's incremental rebuild system gives you sub-second compile times even when you're working with hundreds of files.</p>
    </div>
    <div>
        <h4>Less (code) is more 📉</h4>
        <p>Broccoli's ecosystem of high-quality plugins means you only have to write a few lines of code for most common tasks.</p>
    </div>
    <div>
        <h4>Flexible 🤸‍</h4>
        <p>Use Broccoli by itself, or as part of a larger system like Grunt, Rails, ember-cli, or even make. Broccoli don't care, it just builds what it's told.</p>
    </div>
    <div>
        <h4>It's Just Javascript 🙌</h4>
        <p>A Brocfile.js is just an ES6 module – use the Javascript you already know to specify how to build your assets.</p>
    </div>
</div>

Broccoli simply orchestrates file transformations via plugins. Plugins perform the actual work and operate on files,
Broccoli coordinates the inputs and output of plugins.

Broccoli provides a simple, functional javascript API for constructing your build pipeline.

### Example pipeline

```js
/* Brocfile.js */

const compileSass = require('broccoli-sass-source-maps')(require('sass'));
const babel = require('broccoli-babel-transpiler');
const merge = require('broccoli-merge-trees');

const appRoot = 'app';

const styles = compileSass([appRoot], 'styles/app.scss', 'assets/app.css');
const scripts = babel(appRoot);

module.exports = merge([styles, scripts]);
```

The above is an example of a simple Broccoli build pipeline that compiles Sass files and transcodes javascript using
Babel, then merges the result into an output directory.
