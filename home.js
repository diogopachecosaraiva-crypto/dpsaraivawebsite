// Home posters: endless horizontal scroll in both directions, smoothed by Lenis.
// Wheel, trackpad and touch go through Lenis; mouse drag and the arrow keys are
// handled here. When the motion stops close to a poster lining up with the grid,
// the track settles onto it; otherwise it stays where it stopped.
// The posters come in a new random order every time the page loads, after the
// ones marked data-first in the HTML, which always open the Home in that order.
(function () {
  var track = document.querySelector('.poster-track');
  if (!track) return;

  // How many posters can be in view when the page opens (8 is the most, in
  // very wide windows). Posters marked data-later in the HTML never go there:
  // they only come into view once you scroll.
  var OPENING = 8;

  // The data-first posters go first (data-first="1" leftmost); the rest are
  // shuffled after them so that any 4 posters in a row are from different
  // projects (see shuffleApart). Then the track shows: it stays hidden until
  // now so the original order never flashes.
  var all = Array.prototype.slice.call(track.children);
  var first = all.filter(function (el) { return el.hasAttribute('data-first'); })
    .sort(function (a, b) { return a.dataset.first - b.dataset.first; });
  var rest = all.filter(function (el) { return !el.hasAttribute('data-first'); });
  var originals = alternateColors(shuffleApart(rest, first, projectOf, isLater, OPENING));
  // The row opens by sliding in from the right (see the intro, below), so the
  // last posters of the loop are in view straight away too
  var intro = typeof Lenis !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // on phones 4 are in view (two over two) and the intro comes in from 4
  // back: only those load first, so the opening shows sooner
  var inView = matchMedia('(max-width: 640px)').matches ? 4 : OPENING;
  originals.forEach(function (el, n) {
    var opening = n < inView || (intro && n >= originals.length - inView);
    // the posters in view straight away load first; the rest load as they scroll in
    el.querySelectorAll('img').forEach(function (img) {
      img.loading = opening ? 'eager' : 'lazy';
    });
    if (opening) el.querySelectorAll('video').forEach(function (video) { video.poster = video.dataset.poster; });
    track.appendChild(el);
  });
  // with the intro, the track shows when it starts
  if (!intro) track.classList.add('is-ready');

  // The project is the poster's name in its alt text (a video's label), after
  // "Poster, " and up to the next comma, without a "#01"-style number:
  // "Comédia (A)Normal, S1, 2026" and "Comédia (A)Normal, S2, 2026" are the
  // same project, as are "Paragem da Comédia #01" and "#02"
  function projectOf(figure) {
    var media = figure.querySelector('img, video');
    var label = media.getAttribute('alt') || media.getAttribute('aria-label') || '';
    return label.replace(/^(animated )?poster, /i, '').split(',')[0].replace(/\s*#\d+$/, '').trim().toLowerCase();
  }

  function isLater(figure) {
    return figure.hasAttribute('data-later');
  }

  // A project's posters marked with data-color (today Comédia (A)Normal S1, 4
  // colours, 2 posters each) follow one order of colours as you scroll along,
  // over and over (e.g. blue, orange, green, red, blue, orange, …), so a
  // colour only comes back after all the others. The order is drawn anew on
  // every page load, and which of a colour's posters comes is random too. They
  // only swap places among themselves, so the spacing between projects stays
  // as shuffleApart left it.
  function alternateColors(list) {
    var places = {}; // each project's positions holding a coloured poster
    list.forEach(function (item, pos) {
      if (!item.dataset.color) return;
      var key = projectOf(item);
      (places[key] = places[key] || []).push(pos);
    });
    Object.keys(places).forEach(function (key) {
      var byColor = {};
      shuffleList(places[key].map(function (pos) { return list[pos]; })).forEach(function (item) {
        (byColor[item.dataset.color] = byColor[item.dataset.color] || []).push(item);
      });
      var order = shuffleList(Object.keys(byColor));
      places[key].forEach(function (pos, i) {
        var group = byColor[order[i % order.length]];
        // a colour that has run out: any poster left takes the place
        if (!group || !group.length) {
          group = byColor[Object.keys(byColor).filter(function (c) { return byColor[c].length; })[0]];
        }
        list[pos] = group.pop();
      });
    });
    return list;
  }

  function shuffleList(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = list[i]; list[i] = list[j]; list[j] = swap;
    }
    return list;
  }

  // `fixed`, in its order, then the items in a random order where any 4 posters
  // in a row are from 4 different projects (also across the loop's wrap, and
  // counting the fixed ones), with nothing that isLater() in the first
  // `opening` places. A project with too many posters for that (more than a
  // quarter of them: today only [ASCII_TYPE_GRIDS]) is only kept from being
  // side by side. Each place goes to a random project that is far enough from
  // its last poster, favouring the ones with most posters left to spread out;
  // a project that would run out of room if it waited goes first. Rare dead
  // ends are simply retried.
  function shuffleApart(items, fixed, keyOf, isLater, opening) {
    var SPACING = 4;
    var total = fixed.length + items.length;
    var counts = {}; // each project's posters, fixed ones included
    fixed.concat(items).forEach(function (item) {
      var key = keyOf(item);
      counts[key] = (counts[key] || 0) + 1;
    });

    function attempt() {
      var groups = {};
      items.forEach(function (item) {
        var key = keyOf(item);
        (groups[key] = groups[key] || []).push(item);
      });
      var gap = {}, lastAt = {}, firstAt = {};
      Object.keys(counts).forEach(function (key) {
        groups[key] = shuffleList(groups[key] || []);
        gap[key] = counts[key] * SPACING <= total ? SPACING : 2;
        lastAt[key] = -Infinity;
      });

      var result = fixed.slice();
      fixed.forEach(function (item, pos) {
        var key = keyOf(item);
        if (firstAt[key] === undefined) firstAt[key] = pos;
        lastAt[key] = pos;
      });
      for (var pos = fixed.length; pos < total; pos++) {
        var inOpening = pos < opening;
        var slotsLeft = total - pos;
        // how many of a project's remaining posters may take this place
        var usable = function (key) {
          return inOpening
            ? groups[key].filter(function (item) { return !isLater(item); }).length
            : groups[key].length;
        };
        var keys = Object.keys(groups).filter(function (key) {
          return usable(key) > 0 && pos - lastAt[key] >= gap[key];
        });
        if (!keys.length) return null; // dead end: retry

        // a project whose remaining posters only just fit in the places left must go now
        var pick = null;
        keys.forEach(function (key) {
          if ((groups[key].length - 1) * gap[key] + 1 >= slotsLeft) pick = key;
        });
        if (!pick) {
          var weight = function (key) { return usable(key) * gap[key]; };
          var r = Math.random() * keys.reduce(function (sum, key) { return sum + weight(key); }, 0);
          for (var k = 0; k < keys.length; k++) {
            r -= weight(keys[k]);
            if (r < 0) { pick = keys[k]; break; }
          }
          pick = pick || keys[keys.length - 1];
        }

        var group = groups[pick];
        var at = group.length - 1;
        if (inOpening) while (isLater(group[at])) at--;
        result.push(group.splice(at, 1)[0]);
        if (firstAt[pick] === undefined) firstAt[pick] = pos;
        lastAt[pick] = pos;
      }

      // the loop wraps: each project's last poster also sits before its first one
      var wrapsOk = Object.keys(groups).every(function (key) {
        return firstAt[key] === undefined || firstAt[key] + total - lastAt[key] >= gap[key];
      });
      return wrapsOk ? result : null;
    }

    for (var tries = 0; tries < 2000; tries++) {
      var order = attempt();
      if (order) return order;
    }
    return fixed.concat(shuffleList(items.slice())); // fallback; not reached with the current posters
  }

  if (typeof Lenis === 'undefined') {
    track.classList.add('is-ready');
    return;
  }

  var area = track.parentElement; // <main>, the horizontal scroll container
  var step = 0;      // one column of posters + gutter, in px
  var setWidth = 0;  // all original posters + their gutters
  // On phones the posters come two over two (styles.css): a column holds two
  // of them, and the track always settles onto a column
  var phone = matchMedia('(max-width: 640px)');
  var rows = 1;
  var settleTimer = null;
  var keyTarget = null; // where the latest arrow-key move is heading

  // Copies of the posters follow the last one, and the track is exactly one set
  // wider than the visible area. Lenis wraps its scroll at that limit, so the
  // view at the end is identical to the start and the loop is seamless.
  function build() {
    track.querySelectorAll('[data-clone]').forEach(function (el) { el.remove(); });
    track.style.width = '';
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var visible = area.clientWidth;
    var posterWidth = originals[0].getBoundingClientRect().width;
    step = posterWidth + gap;
    rows = phone.matches ? 2 : 1;
    // in two rows, an odd number of posters would leave the loop's last
    // column half empty: the loop then goes through them twice (the second
    // time one place further on), so it ends on a full column
    var loop = originals.length % rows ? originals.length * 2 : originals.length;
    setWidth = step * loop / rows;
    // copies for that second time round, then as many as fill one visible
    // width (+1 column for the partial one)
    var copies = loop - originals.length + (Math.ceil(visible / step) + 1) * rows;
    for (var c = 0; c < copies; c++) {
      var clone = originals[c % originals.length].cloneNode(true);
      clone.setAttribute('data-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    track.style.width = setWidth + visible + 'px';
    watchVideos();
    measureFold();
  }

  // The posters turn at the side margins, as if the row ran round the edges
  // of a drum (it's flat in between, so in view they keep their size and
  // their place on the grid): one going out at a margin swings back from it,
  // hinged on its inner side, its outer side staying on the margin and
  // drawing in until it's seen edge-on; one coming in opens out the same way.
  // Each poster's place in the track is measured flat (measureFold, at every
  // build) and the turn follows the scroll (fold, on every Lenis frame).
  var FOLD_DEPTH = 2; // the perspective, in poster widths: smaller, steeper
  var folding = [], foldWidth = 0, foldGap = 0, areaLeft = 0, areaWidth = 0;
  function measureFold() {
    folding = Array.prototype.slice.call(track.children);
    folding.forEach(function (el) { el.style.transform = ''; el.foldTransform = ''; });
    var trackLeft = track.getBoundingClientRect().left;
    folding.forEach(function (el) { el.foldLeft = el.getBoundingClientRect().left - trackLeft; });
    foldWidth = originals[0].getBoundingClientRect().width;
    foldGap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var box = area.getBoundingClientRect();
    areaLeft = box.left;
    areaWidth = box.width;
    fold();
  }
  function fold() {
    if (reduceMotion || !foldWidth) return;
    var shift = areaLeft - area.scrollLeft;
    var left = areaLeft + foldGap, right = areaLeft + areaWidth - foldGap;
    var a = 1 / FOLD_DEPTH;
    folding.forEach(function (el) {
      var x = el.foldLeft + shift;
      var side = 0, share = 1; // which margin it's crossing, and how much of it is still in
      if (x < left && x + foldWidth > left) { side = -1; share = (x + foldWidth - left) / foldWidth; }
      else if (x < right && x + foldWidth > right) { side = 1; share = (right - x) / foldWidth; }
      var transform = '';
      if (side) {
        // the angle at which, in perspective, the turned poster is `share`
        // of its width wide: cos φ = share × (1 + a sin φ)
        var angle = Math.acos(share / Math.sqrt(1 + share * share * a * a)) - Math.atan(share * a);
        transform = 'perspective(' + foldWidth * FOLD_DEPTH + 'px) rotateY(' + side * angle * 180 / Math.PI + 'deg)';
      }
      if (transform === el.foldTransform) return;
      el.foldTransform = transform;
      el.style.transformOrigin = side < 0 ? 'right center' : 'left center';
      el.style.transform = transform;
    });
  }

  // With reduced motion asked for, posters don't alternate and videos don't play
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Posters with several versions (.cycle) alternate between them like a GIF,
  // all in step. Clones are included, since they are looked up on every tick.
  var FRAME_TIME = 750; // ms per version
  if (!reduceMotion) {
    var frame = 0;
    setInterval(function () {
      frame++;
      track.querySelectorAll('.cycle .frames').forEach(function (frames) {
        var imgs = frames.querySelectorAll('img');
        var current = frame % imgs.length;
        imgs.forEach(function (img, i) { img.classList.toggle('is-current', i === current); });
      });
    }, FRAME_TIME);
  }

  // Video posters. Once the page has finished loading, each video fetches just
  // its cover and its first frames (a few KB, the files are "fast start"), so it
  // can start at once. Within three screen widths of the view it buffers in full,
  // and it only plays while it is visible (paused when it scrolls away, to save
  // battery and data); otherwise the cover shows.
  // A video with data-start (seconds) begins at that moment, which should be
  // the frame its cover shows, and then loops through the whole animation as
  // usual. (None uses it now: the ASCII posters' videos open on their colour.)
  var nearObserver = null;
  var inViewObserver = null;
  function startAt(event) {
    var video = event.target;
    video.currentTime = parseFloat(video.dataset.start);
  }
  function media(path) { return window.videoFile ? videoFile.url(path) : path; }
  function prepareVideo(video, preload, now) {
    // again after every load(), which takes the video back to its start
    // (copies made after a resize already have their src, so this isn't
    // left to the first load below)
    if (video.dataset.start && !video.startsLate) {
      video.startsLate = true;
      video.addEventListener('loadedmetadata', startAt);
      if (video.readyState > 0) startAt({ target: video });
    }
    if (!video.getAttribute('src')) {
      video.poster = video.dataset.poster;
      // on phones, where the posters are small, a lighter copy (540px wide),
      // fetched whole before it's needed so it starts at once (video-file.js);
      // now, as it comes into view, it streams if that isn't ready yet
      // (from R2 on the published site, video-file.js)
      var small = phone.matches && video.dataset.srcSmall && media(video.dataset.srcSmall);
      if (small && window.videoFile) {
        var ready = videoFile.get(small, function (copy) {
          if (!video.getAttribute('src')) { video.preload = 'auto'; video.src = copy; }
        });
        if (ready) { video.preload = 'auto'; video.src = ready; return; }
        if (!now) return;
        videoFile.giveUp(small);
      }
      video.preload = preload;
      video.src = small || media(video.dataset.src);
    } else if (preload === 'auto' && video.preload !== 'auto') {
      video.preload = 'auto';
      if (video.paused) video.load();
    }
  }
  function prepareAllVideos() {
    track.querySelectorAll('video').forEach(function (video) { prepareVideo(video, 'metadata'); });
  }
  if (document.readyState === 'complete') prepareAllVideos();
  else window.addEventListener('load', prepareAllVideos);

  function watchVideos() {
    if (!('IntersectionObserver' in window)) return;
    if (nearObserver) nearObserver.disconnect();
    if (inViewObserver) inViewObserver.disconnect();
    if (document.readyState === 'complete') prepareAllVideos(); // new clones after a resize
    nearObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) prepareVideo(entry.target, 'auto');
      });
    }, { rootMargin: '0px 300% 0px 300%' });
    inViewObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting && !reduceMotion) {
          prepareVideo(video, 'auto', true);
          // muted said again: Safari on the iPhone only plays a video on its
          // own when it's muted, and a copy of the poster (the loop's, made
          // with cloneNode) can lose the muted it had in the HTML
          video.muted = true;
          var playing = video.play();
          // refused (e.g. Low Power Mode): the cover shows until a touch
          // (video-file.js)
          if (playing) playing.catch(function (error) { if (window.videoFile) videoFile.refused(error); });
        } else {
          video.pause();
        }
      });
    });
    track.querySelectorAll('video').forEach(function (video) {
      nearObserver.observe(video);
      inViewObserver.observe(video);
    });
  }

  // 2-column posters need the window to be tall enough for them plus the menu
  // and footer at their smallest. When it isn't (very wide, short windows),
  // switch to 1-column posters so they still line up with the grid.
  function updateDensity() {
    var body = document.body;
    delete body.dataset.dense;
    var style = getComputedStyle(body);
    var visible = parseFloat(style.getPropertyValue('--visible')) || 4;
    var gutter = parseFloat(style.getPropertyValue('--gutter')) || 15;
    var posterH = (body.clientWidth - (visible + 1) * gutter) / visible * 636 / 455;
    var capH = parseFloat(style.getPropertyValue('--cap-h')) || 15;
    var free = innerHeight - posterH - (parseFloat(style.getPropertyValue('--cap-gap')) || 15) - capH;
    var footer = document.querySelector('body > .site-footer');
    var footerStyle = getComputedStyle(footer);
    var footerText = footer.getBoundingClientRect().height
      - parseFloat(footerStyle.paddingTop) - parseFloat(footerStyle.paddingBottom);
    var minHeader = 55;
    var minFooter = footerText + 2 * gutter;
    if (free < minHeader + minFooter) body.dataset.dense = '';
  }

  updateDensity();
  build();
  // the footer's height is only final once the font is in
  if (document.fonts) document.fonts.ready.then(updateDensity);

  var lenis = new Lenis({
    wrapper: area,
    content: track,
    eventsTarget: window,        // the wheel works anywhere on the Home
    orientation: 'horizontal',
    gestureOrientation: 'both',  // vertical wheels and trackpads move it too
    infinite: true,
    syncTouch: true,             // required by Lenis for infinite scroll on touch
    autoRaf: true
  });
  lenis.on('scroll', fold);

  // How close (as a share of one poster + gutter) the resting point must be
  // to the grid for the track to settle onto it
  var SNAP = 0.1;

  // Where the track will stop: the grid position if `rest` is close to one,
  // otherwise `rest` itself
  function restingPoint(rest) {
    var nearest = Math.round(rest / step) * step;
    // on phones, always onto the nearest column
    return phone.matches || Math.abs(rest - nearest) <= step * SNAP ? nearest : rest;
  }
  function settle() {
    // where Lenis's smoothing is heading, measured from the current position
    var rest = lenis.scroll + (lenis.targetScroll - lenis.animatedScroll);
    var target = restingPoint(rest);
    if (target !== rest) lenis.scrollTo(target);
  }
  function settleSoon() {
    keyTarget = null;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 160);
  }
  lenis.on('virtual-scroll', settleSoon);

  // The intro: the row starts two posters back (two columns on phones; at the end of the loop)
  // and comes in from the right, already moving, slowing down onto the opening
  // posters, so it's clear from the start that it scrolls sideways. It starts
  // once the posters it shows are ready (1.5 seconds at most); scrolling,
  // dragging or an arrow key take over from it straight away.
  var INTRO_TIME = 1.4;  // s
  var INTRO_POSTERS = 2; // how far back it starts
  if (intro) {
    lenis.scrollTo(setWidth - INTRO_POSTERS * step, { immediate: true });
    var started = false;
    var startIntro = function () {
      if (started) return;
      started = true;
      track.classList.add('is-ready');
      lenis.scrollTo(0, {
        duration: INTRO_TIME,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); }
      });
    };
    // loaded and decoded, so they don't pass by empty
    var shown = [];
    originals.forEach(function (el) {
      el.querySelectorAll('img').forEach(function (img) {
        if (img.loading === 'eager') shown.push(img.decode().catch(function () {}));
      });
    });
    Promise.all(shown).then(startIntro);
    setTimeout(startIntro, 1500);
  }

  // Drag with the mouse (touch is handled by Lenis), with a little momentum on release
  var drag = null;
  area.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    area.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging');
    clearTimeout(settleTimer);
    keyTarget = null;
  });
  area.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.lastX;
    var dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = dx / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    lenis.scrollTo(lenis.scroll - dx, { immediate: true });
  });
  function endDrag() {
    if (!drag) return;
    // momentum from the last movement only, capped at one poster so a flick
    // never laps the loop on small screens
    var v = performance.now() - drag.lastT > 100 ? 0 : drag.v;
    var fling = Math.max(-step, Math.min(step, v * 250));
    drag = null;
    track.classList.remove('is-dragging');
    lenis.scrollTo(restingPoint(lenis.scroll - fling));
  }
  area.addEventListener('pointerup', endDrag);
  area.addEventListener('pointercancel', endDrag);

  // Arrow keys move to the next poster on the grid in that direction
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    // while a previous key move is still animating, count from where it is going,
    // so quick repeated presses add up
    var at = (lenis.isScrolling === 'smooth' && keyTarget !== null ? keyTarget : lenis.scroll) / step;
    var next = e.key === 'ArrowRight' ? Math.floor(at + 0.01) + 1 : Math.ceil(at - 0.01) - 1;
    keyTarget = next * step;
    lenis.scrollTo(keyTarget, {
      onComplete: function () { keyTarget = null; }
    });
  });

  // Rebuild when the slider changes size (width or height, since posters shrink
  // to fit short windows), keeping the same place in the loop
  // (deferred until the resize settles, so the measurements are final)
  // (not on the first call, which only reports the size build() already used
  // and would stop the intro). The place is counted in posters, so it holds
  // between one row and two, and put back through restingPoint, so on phones
  // a column always ends lined up: after a rotation, or a resize from a wider
  // layout or in the middle of a move.
  var resizeTimer = null;
  var index = 0;
  var firstSize = true;
  function resized() {
    if (!resizeTimer) index = lenis.scroll / step * rows;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      updateDensity();
      build();
      lenis.resize();
      lenis.scrollTo(restingPoint(index / rows * step), { immediate: true });
      fold();
    }, 100);
  }
  new ResizeObserver(function () {
    if (firstSize) { firstSize = false; return; }
    resized();
  }).observe(area);
  // and on the window's own resize, in case the slider's size is reported
  // late or not at all (the sizes follow the window's width, styles.css)
  window.addEventListener('resize', resized);
})();
