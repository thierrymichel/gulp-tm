/*jslint browser: true, devel: true, indent: 2 */
/*global jQuery */

(function ($) {
  "use strict";
  /*
   * Code here...
   */
  // init overlay slide theatre
  $('.theatre').after('<div class="theatre-overlay">');
  // click handler
  $('.theatre__title').on('click', function() {
    $(this).parent('.theatre').toggleClass('is-open');
    $('body').toggleClass('is-sticky');
    $('.theatre-overlay').fadeToggle(500);
  });
}(jQuery));
