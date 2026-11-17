// The images and videos can't be saved the easy way: no menu on a right click
// (so no "Save image as…" / "Save video as…") and no dragging one out of the
// page. Listened for on the whole document, so it also covers the copies the
// Home and the full-size view make. Text and links keep their usual menu.
// Loaded in <head>.
(function () {
  function onMedia(event) {
    var target = event.target;
    return target.closest && target.closest('img, video, picture, .shot');
  }
  document.addEventListener('contextmenu', function (event) {
    if (onMedia(event)) event.preventDefault();
  });
  document.addEventListener('dragstart', function (event) {
    if (onMedia(event)) event.preventDefault();
  });
})();
