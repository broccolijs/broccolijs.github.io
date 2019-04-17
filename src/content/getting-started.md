---
title: Getting Started
---

## Prerequisites

First things first, it is assumed that you know how to use a terminal on your machine, if you're unfamiliar with the
terminal, best get familiar with that first.

You're also going to want to use Node 8 as this is the current LTS (long term support) version.
We recommend using [NVM](https://github.com/creationix/nvm).
Test to make sure you have node and npm installed by running the following commands and checking that your output is similar:

```shell
$ node --version
v8.0.x
```

You're free to use either [yarn](https://yarnpkg.com) or [npm](https://npmjs.com) package managers, whichever you prefer,
these docs will use `yarn` (note: to use `npm`, replace `yarn install --dev` with `npm install --save-dev`).

## Installation

You'll need a project directory, if you don't have one, create one now:

```shell
$ mkdir broccoli-tutorial
$ cd broccoli-tutorial
```

Inside your project directory root, install Broccoli:

```shell
$ yarn add --dev broccoli broccoli-cli
```

This will install the Broccoli library, and the CLI tool for Broccoli. The CLI tool can optionally be installed globally
if required, however installing within the project allows for `yarn` script commands to natively work.

Next create a `Brocfile.js` file and an `src` folder for your source code.

```shell
$ echo "export default () => 'src'" > Brocfile.js
$ mkdir src
$ echo 'Hello World!' > src/index.html
```

A `Brocfile.js` in the project root tells Broccoli how to build your project's assets. It can be as simple or as
complicated as your project needs. For this example, we're going to keep it relatively simple and just build Sass into
CSS and Coffeescript into Javascript. We're also going to assume your project structure looks like:

In your `package.json` add the following to the `scripts` node (add this if it's not present):

```json
{
  "scripts": {
    "build": "broccoli build",
    "serve": "broccoli serve"
  }
}
```

You can now run `yarn build` and `yarn serve` for convenience.

## The build file

Open the `Brocfile.js` and it should contain the contents:

```js
export default () => "src";
```

Next, open `src/index.html`, it should have the contents `Hello World!`.

That's it, you're done.

The initial setup of this tutorial merely copies files from the input `src` directory by exporting the string `src`.

The `Brocfile.js` contains the Broccoli configuration for the build. The `export default` line should export a 
function that returns a Broccoli node. "But it's a string" you say, yes, Broccoli will automatically convert a 
string into a `source node`, and on build, validate that the directory exists. In this case, the Brocfile merely
exports a single node, containing the contents of the `src` directory, this will then be copied to the destination
directory (`dist` in our case).

To run a build, run `yarn build` (if you added the script) or `broccoli build --overwrite` (note: without `--overwrite`
the contents of the output directory `dist` will NOT be overwritten and produce an error).

You should see something like:

```sh
$ yarn build
$ broccoli build --overwrite



Slowest Nodes (totalTime => 5% )              | Total (avg)
----------------------------------------------+---------------------
src (1)                                       | 0ms

Built - 0 ms @ Tue Dec 04 2018 17:18:34 GMT-0500 (Eastern Standard Time)
✨  Done in 0.88s.
```

This yarn command will remove any previous builds, and run a new build, outputting to the `dist` directory.

The contents of `src` should now be in the `dist` directory. Try:

```sh
$ cat dist/index.html
Hello World!
```

Now try running `yarn serve` or `broccoli serve` and you should see:

```sh
$ broccoli serve
Serving on http://localhost:4200




Slowest Nodes (totalTime => 5% )              | Total (avg)
----------------------------------------------+---------------------
src (1)                                       | 1ms

Built - 0 ms @ Tue Dec 04 2018 17:19:49 GMT-0500 (Eastern Standard Time)
```

You will see the URL `http://localhost:4200`, if you open this in the browser you should see `Hello World!` in your
Browser.

Congratulations 👏, you've just written your first Broccoli pipeline!

For a demo, checkout this sanbox from [codesandbox.io](https://codesandbox.io)

<div class="mobile-show">
<a href="https://codesandbox.io/s/github/broccolijs/broccoli-tutorial/tree/master/">
  <img alt="Edit broccoli-tutorial" src="https://codesandbox.io/static/img/play-codesandbox.svg">
</a>
</div>
<div class="mobile-hide">
  <iframe src="https://codesandbox.io/embed/github/broccolijs/broccoli-tutorial/tree/master/" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>
</div>
