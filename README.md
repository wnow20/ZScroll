ZScroll
---------

a simple carousel, vertical, smooth scroll.

#### Current version
 0.0.1

#### Demos & Docs
[http://wnow20.github.io/ZScroll](http://wnow20.github.io/ZScroll)

#### Features
+ infinite slide
+ autoPlay
+ smooth scroll

#### Example
write your DOM
```html
<div class="ZScroll">
  <div>
    something...
  </div>
  <div>
    something...
  </div>
  ...
</div>
```

Include ZScroll files
```html
<link rel="stylesheet" href="../src/ZScroll.css"/>
<script src="../src/ZScroll.js"></script>
```

Launch ZScroll
```html
<script>
$(window).on('load', function (e) {
  $('#J_Scroll').zScroll();
});
</script>
```

#### Dependencies

jQuery 1.7

#### Next move?
+ Events callback
+ Slide buttons, eg. dots arrows
+ data-* settings
+ Dynamic add/remove slides
+ Better animation
+ Lazyload
+ Custom template
+ CssEase
+ Responsive
+ Draggable
+ add package manager and gulp

#### Contributing
PLEASE review CONTRIBUTING.md prior to requesting a feature, filing a pull request or filing an issue.

#### License

Copyright (c) 2015, Frank Lin

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
