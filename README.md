# posthtml-partials
## **A fork of https://github.com/mrmlnc/posthtml-mixins with a few small updates** 

> A [PostHTML](https://github.com/posthtml/posthtml) plugin adds support for partials. partials allow you to create reusable blocks of code.

[![Travis Status](https://travis-ci.org/Tadwork/posthtml-partials.svg?branch=master)](https://travis-ci.org/Tadwork/posthtml-partials)

## Install

```
$ npm i -D posthtml-partials
```

## Usage

```js
const { readFileSync } = require('fs');

const posthtml = require('posthtml');
const partials = require('posthtml-partials');

const html = readFileSync('index.html');
posthtml([ partials() ])
  .process(html)
  .then((result) => console.log(result.html))
```

## Options

#### delimiters

  * Type: `String[]`
  * Default: `['{{', '}}']`

Array containing beginning and ending delimiters for locals.

For example:

  * `['{', '}']` - `{ key }`
  * `['${', '}']` - `${ key }`
  * `['%', '%']` - `%key%`
  * `['%', '']` - `%key`

## Features

### Parameters

We support parameters for partials inside tags and in attributes.

```html
<partial name="say" class from>
  <p class="{{ class }}">Hello from {{ from }}!</p>
</partial>

<div>
  <partial name="say" class="hello" from="me"></partial>
</div>
```

```html
<div>
  <p class="hello">Hello from me!</p>
</div>
```

### Default values

We support default values for parameters (order is unimportant).

```html
<partial name="say" class from="me">
  <p class="{{ class }}">Hello from {{ from }}!</p>
</partial>

<div>
  <partial name="say" class="hello"></partial>
</div>
```

```html
<div>
  <p class="hello">Hello from me!</p>
</div>
```

### partial reloading

We support Partial reloading when the Partial may have the same name but a different number of parameters.

```html
<partial name="say" from>
  <p>Hello from {{ from }}!</p>
</partial>

<partial name="say">
  <p>Hello!</p>
</partial>

<div>
  <partial name="say"></partial>
</div>

<div>
  <partial name="say" from="partial"></partial>
</div>
```

```html
<div>
  <p>Hello!</p>
</div>

<div>
  <p>Hello from partial!</p>
</div>
```

## Changelog

See the [Releases section of our GitHub project](https://github.com/Tadwork/posthtml-partials/releases) for changelogs for each release version.

## License

This software is released under the terms of the MIT license.
