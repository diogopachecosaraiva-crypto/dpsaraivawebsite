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
  originals.forEach(function (el, n) {
    var opening = n < OPENING || (intro && n >= originals.length - OPENING);
    // the posters in view straight away load first; the rest load as they scroll in
    el.querySelectorAll('img').forEach(function (img) {
      img.loading = opening ? 'eager' : 'lazy';
    });
    if (opening) el.querySelectorAll('video').forEach(function (video) { video.poster = video.dataset.poster; });
    track.appendChild(el);
  });
  // with the intro, the track shows when it starts
  if (!intro) track.classList.add('is-ready');

  // The project is the caption up to the first comma, without a "#01"-style
  // number: "Comédia (A)Normal, S1, 2026" and "Comédia (A)Normal, S2, 2026"
  // are the same project, as are "Paragem da Comédia #01" and "#02"
  function projectOf(figure) {
    var caption = figure.querySelector('.caption').textContent;
    return caption.split(',')[0].replace(/\s*#\d+$/, '').trim().toLowerCase();
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
  var step = 0;      // one poster + gutter, in px
  var setWidth = 0;  // all original posters + their gutters
  // On phones one poster rests in the middle, with parts of its neighbours
  // showing at both edges (styles.css): the positions the track settles onto
  // are shifted by `centre` (the scroll that centres the first poster; 0
  // elsewhere, where the posters line up with the grid from the left margin)
  var centred = matchMedia('(max-width: 640px)');
  var centre = 0;
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
    setWidth = step * originals.length;
    centre = centred.matches
      ? (parseFloat(getComputedStyle(track).paddingLeft) || 0) - (visible - posterWidth) / 2
      : 0;
    // only as many copies as fill one visible width (+1 for the partial poster)
    var copies = Math.ceil(visible / step) + 1;
    for (var c = 0; c < copies; c++) {
      var clone = originals[c % originals.length].cloneNode(true);
      clone.setAttribute('data-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    track.style.width = setWidth + visible + 'px';
    watchVideos();
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
  // A video with data-start (the ASCII posters, whose animation opens on a
  // black background) begins at that moment, the first frame on its colour
  // (also its cover), and then loops through the whole animation as usual.
  var nearObserver = null;
  var inViewObserver = null;
  function startAt(event) {
    var video = event.target;
    video.currentTime = parseFloat(video.dataset.start);
  }
  function prepareVideo(video, preload) {
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
      video.preload = preload;
      video.src = video.dataset.src;
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
          prepareVideo(video, 'auto');
          var playing = video.play();
          if (playing) playing.catch(function () {}); // e.g. blocked by low-power mode: the cover shows
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
    fitCaptions();
    var style = getComputedStyle(body);
    var visible = parseFloat(style.getPropertyValue('--visible')) || 4;
    var gutter = parseFloat(style.getPropertyValue('--gutter')) || 15;
    var posterH = (body.clientWidth - (visible + 1) * gutter) / visible * 636 / 455;
    var capH = parseFloat(style.getPropertyValue('--cap-h')) || 15;
    var free = innerHeight - posterH - (parseFloat(style.getPropertyValue('--cap-gap')) || 15) - capH;
    var footer = document.querySelector('.site-footer');
    var footerStyle = getComputedStyle(footer);
    var footerText = footer.getBoundingClientRect().height
      - parseFloat(footerStyle.paddingTop) - parseFloat(footerStyle.paddingBottom);
    var minHeader = 55;
    var minFooter = footerText + 2 * gutter;
    if (free < minHeader + minFooter) {
      body.dataset.dense = '';
      fitCaptions();
    }
  }

  // The room kept under the posters (--cap-h) is the tallest caption's: a
  // long caption that wraps onto a second line at this poster width isn't
  // cut by the bottom of the row. Narrower posters (the room taken from a
  // short window) can wrap more, so the room only grows, measured again until
  // it holds. It starts again from one line every time, so the result
  // depends only on the window's size (and the next resize can't build on it).
  function fitCaptions() {
    var body = document.body;
    body.style.removeProperty('--cap-h');
    var capH = 0;
    for (var i = 0; i < 8; i++) {
      var heights = originals.map(function (el) {
        return el.querySelector('.caption').getBoundingClientRect().height;
      });
      var tallest = Math.ceil(Math.max.apply(null, heights));
      // at most two lines: in a window too short even for that (a phone on
      // its side), more room would only shrink the posters into thin strips
      var lineHeight = parseFloat(getComputedStyle(originals[0].querySelector('.caption')).lineHeight);
      var most = Math.ceil(Math.min.apply(null, heights) + lineHeight);
      var next = Math.min(tallest, most);
      if (next <= capH) return;
      capH = next;
      body.style.setProperty('--cap-h', capH + 'px');
    }
  }

  updateDensity();
  build();
  // the captions' height is only final once the font is in
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

  // How close (as a share of one poster + gutter) the resting point must be
  // to the grid for the track to settle onto it
  var SNAP = 0.1;

  // Where the track will stop: the grid position if `rest` is close to one,
  // otherwise `rest` itself
  function restingPoint(rest) {
    var nearest = Math.round((rest - centre) / step) * step + centre;
    // on phones, always onto the nearest poster, in the middle
    return centred.matches || Math.abs(rest - nearest) <= step * SNAP ? nearest : rest;
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

  // The intro: the row starts two posters back (at the end of the loop)
  // and comes in from the right, already moving, slowing down onto the opening
  // posters, so it's clear from the start that it scrolls sideways. It starts
  // once the posters it shows are ready (1.5 seconds at most); scrolling,
  // dragging or an arrow key take over from it straight away.
  var INTRO_TIME = 1.4;  // s
  var INTRO_POSTERS = 2; // how far back it starts
  if (intro) {
    lenis.scrollTo(setWidth - INTRO_POSTERS * step + centre, { immediate: true });
    var started = false;
    var startIntro = function () {
      if (started) return;
      started = true;
      track.classList.add('is-ready');
      lenis.scrollTo(centre, {
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
    var at = ((lenis.isScrolling === 'smooth' && keyTarget !== null ? keyTarget : lenis.scroll) - centre) / step;
    var next = e.key === 'ArrowRight' ? Math.floor(at + 0.01) + 1 : Math.ceil(at - 0.01) - 1;
    keyTarget = next * step + centre;
    lenis.scrollTo(keyTarget, {
      onComplete: function () { keyTarget = null; }
    });
  });

  // Rebuild when the slider changes size (width or height, since posters shrink
  // to fit short windows), keeping the same place in the loop
  // (deferred until the resize settles, so the measurements are final)
  // (not on the first call, which only reports the size build() already used
  // and would stop the intro). The place is put back through restingPoint, so
  // on phones a poster always ends in the middle: after a rotation, or a
  // resize from a wider layout or in the middle of a move.
  var resizeTimer = null;
  var index = 0;
  var firstSize = true;
  new ResizeObserver(function () {
    if (firstSize) { firstSize = false; return; }
    if (!resizeTimer) index = (lenis.scroll - centre) / step;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      updateDensity();
      build();
      lenis.resize();
      lenis.scrollTo(restingPoint(index * step + centre), { immediate: true });
    }, 100);
  }).observe(area);
})();
