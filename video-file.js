// Phones: a video's lighter copy is fetched whole, in the background, as it
// nears the view (home.js, work.js), and plays from that copy in memory, so it
// starts at once. (Safari on the iPhone doesn't load a video ahead of playing
// it, whatever its preload says.) One that comes into view before its copy
// is ready streams as before, and the fetch is given up.
window.videoFile = (function () {
  // The videos live apart from the site, in Cloudflare R2 (too heavy for
  // Pages, which takes files of up to 25MB), at media.dpsaraiva.com, under
  // the same paths as here (assets/…). Only on the published site: tried out
  // on the Mac (localhost, its address on the Wi-Fi) they come from here.
  var MEDIA = /(^|\.)dpsaraiva\.com$|\.pages\.dev$/.test(location.hostname) ? 'https://media.dpsaraiva.com/' : '';
  // (the Portuguese pages, under /pt/, give their paths from the site's root: /assets/…)
  function url(path) { return MEDIA && !/^[a-z]+:/.test(path) ? MEDIA + path.replace(/^\//, '') : path; }
  var files = {};
  // the ready copy's address, or null: then it starts fetching it, and
  // calls onReady with the address once it's there
  function get(url, onReady) {
    var file = files[url];
    if (!file) {
      if (!window.fetch || !window.AbortController || !window.URL) return null;
      file = files[url] = { ready: null, waiting: [], given: false, controller: new AbortController() };
      fetch(url, { signal: file.controller.signal })
        .then(function (response) {
          if (!response.ok) throw new Error(response.status);
          return response.blob();
        })
        .then(function (blob) {
          file.ready = URL.createObjectURL(blob);
          file.waiting.forEach(function (callback) { callback(file.ready); });
          file.waiting = [];
        })
        .catch(function () { file.given = true; file.waiting = []; });
    }
    if (file.ready) return file.ready;
    if (onReady && !file.given) file.waiting.push(onReady);
    return null;
  }
  // it's needed now: streamed instead, and no longer fetched
  function giveUp(url) {
    var file = files[url];
    if (!file || file.ready || file.given) return;
    file.given = true;
    file.waiting = [];
    file.controller.abort();
  }
  // Playing on its own refused (Safari on the iPhone in Low Power Mode does
  // that, even to a muted video): from then on every touch, tap or key plays
  // the videos on screen, and lets the others play later on their own (one
  // that has played once at a touch may play again without one). Not with
  // reduced motion asked for, where they don't play anyway.
  var listening = false;
  function onScreen(video) {
    var box = video.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
  }
  function playOnTouch() {
    Array.prototype.forEach.call(document.querySelectorAll('video[src]'), function (video) {
      if (onScreen(video)) {
        if (video.paused) video.play().catch(function () {});
      } else if (!video.hasPlayed) {
        video.play().then(function () { if (!onScreen(video)) video.pause(); }, function () {});
      }
    });
  }
  document.addEventListener('playing', function (event) { event.target.hasPlayed = true; }, true);
  function refused(error) {
    if (listening || !error || error.name !== 'NotAllowedError') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    listening = true;
    ['touchend', 'click', 'keydown'].forEach(function (type) {
      document.addEventListener(type, playOnTouch, { capture: true, passive: true });
    });
  }
  return { url: url, get: get, giveUp: giveUp, refused: refused };
})();
