/*jslint browser: true, devel: true, indent: 2 */
/*global jQuery, Modernizr, Audio */

(function ($) {
  "use strict";
  /*
   * Code here...
   */
  console.log($);

  // some Modernizr feature detection
  var audio = new Audio();
  audio.src = Modernizr.audio.ogg ? 'background.ogg' :
              Modernizr.audio.mp3 ? 'background.mp3' :
                                    'background.m4a';
}(jQuery));
