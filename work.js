// Work: clicking a project opens its text below the row; clicking again closes it.
// The list can be filtered by typology and sorted by year or name (bottom of file).
// Only one project is open at a time: opening one closes the one that was open.
// The text is inert while closed, so keyboard and screen readers only reach it
// when it's open.
(function () {
  var heads = Array.prototype.slice.call(document.querySelectorAll('.project-head'));

  function setOpen(head, open) {
    var project = head.closest('.project');
    var text = document.getElementById(head.getAttribute('aria-controls'));
    if (project.classList.contains('is-open') === open) return;
    project.classList.remove('is-settled'); // clip again while it animates
    project.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    text.inert = !open;
    // no animation (reduced motion): it's settled straight away
    if (open && parseFloat(getComputedStyle(text).transitionDuration) === 0) settle(project);
  }

  // Once a project's text is fully open, the list can scroll to show it whole
  // (scroll.js)
  function settle(project) {
    project.classList.add('is-settled');
    document.dispatchEvent(new CustomEvent('work:opened', { detail: project }));
  }

  // The image column: with no project open it's empty, except for the first
  // image of the project the pointer (or the keyboard) is on in the list; with
  // one open, all its images, in a column that scrolls. The column then starts
  // again from the top (scroll.js).
  var gallery = document.querySelector('.gallery');
  var groups = {};
  var renderCovers = null; // the Full view's grid follows the list too (below)
  var preview = null; // the row whose first image shows while none is open
  if (gallery) {
    Array.prototype.forEach.call(gallery.querySelectorAll('.gallery-project'), function (group) {
      groups[group.dataset.project] = group;
    });
  }
  function showGallery() {
    if (!gallery) return;
    var open = document.querySelector('.project.is-open');
    Array.prototype.forEach.call(document.querySelectorAll('.projects > .project'), function (row) {
      var group = groups[row.dataset.project];
      if (!group) return;
      gallery.appendChild(group);
      group.hidden = open ? row !== open : row !== preview || row.hidden;
    });
    gallery.classList.toggle('is-project', !!open);
    if (renderCovers) renderCovers();
    document.dispatchEvent(new CustomEvent('work:gallery'));
  }

  // Images with versions (.frames) alternate between them like a GIF, at the
  // Home's pace; videos load and play only while they're on screen. With
  // reduced motion asked for, the first version and the video's cover stay.
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // a video with data-rate plays at that speed (1.5 = one and a half times
  // faster), wherever it plays: the column, the covers or the viewer
  document.addEventListener('play', function (event) {
    var video = event.target;
    if (video.dataset && video.dataset.rate) video.defaultPlaybackRate = video.playbackRate = parseFloat(video.dataset.rate);
  }, true);
  if (gallery && !reduceMotion) {
    var frame = 0;
    setInterval(function () {
      frame++;
      gallery.querySelectorAll('.frames').forEach(function (frames) {
        var imgs = frames.querySelectorAll('img');
        var current = frame % imgs.length;
        imgs.forEach(function (img, i) { img.classList.toggle('is-current', i === current); });
      });
    }, 750);
    if ('IntersectionObserver' in window) {
      var videos = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            if (!video.getAttribute('src')) video.src = video.dataset.src;
            video.play().catch(function () {});
          } else {
            video.pause();
          }
        });
      });
      gallery.querySelectorAll('video').forEach(function (video) { videos.observe(video); });
    }
  }

  // Pointing at an image marks its project's row on the left, which then shows
  // in ExtraBold like a hovered row (styles.css), and brings that row into view
  // if the list is scrolled away from it (scroll.js). Images scrolling under a
  // pointer that stays still count too.
  if (gallery) {
    var hinted = null;
    var pointer = null; // where the pointer is while it's over the images
    function hint(row) {
      if (row === hinted) return;
      if (hinted) hinted.classList.remove('is-hinted');
      if (row) row.classList.add('is-hinted');
      hinted = row;
      if (row) document.dispatchEvent(new CustomEvent('work:hint', { detail: row }));
    }
    function hintAt(el) {
      var group = el && el.closest('.gallery-project');
      hint(group ? document.querySelector('.project[data-project="' + group.dataset.project + '"]') : null);
    }
    gallery.addEventListener('mousemove', function (event) {
      pointer = { x: event.clientX, y: event.clientY };
      hintAt(event.target);
    });
    gallery.addEventListener('mouseleave', function () {
      pointer = null;
      hint(null);
    });
    document.addEventListener('scroll', function () {
      if (pointer) hintAt(document.elementFromPoint(pointer.x, pointer.y));
    }, true);
  }

  // With a project open, clicking one of its images opens the project's images
  // over everything, in a column like the Work images: one under the other,
  // 20px apart, each as large as the window allows inside the 20px margins
  // and as it is in the Work column (pairs side by side, videos playing while
  // in view). It scrolls freely and smoothly like the Work columns (Lenis),
  // always from the start. Above the images, the project's line of
  // info and its text, on the same columns as in the list (the text from
  // column 5). At the end comes the site's footer, as on the rest of the
  // Work page: on desktop it slides up once the scroll reaches the end, and
  // the last image stops above it. The X (top right) or Escape go back.
  if (gallery) {
    var viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Image viewer');
    viewer.setAttribute('data-pt-aria-label', 'Visualizador de imagens');
    viewer.innerHTML =
      '<div class="viewer-content">' +
        '<div class="viewer-info"></div>' +
        '<div class="viewer-text"></div>' +
        '<div class="viewer-images"></div>' +
      '</div>' +
      '<button class="viewer-close" type="button" aria-label="Close" data-pt-aria-label="Fechar"></button>';
    document.body.appendChild(viewer);
    var content = viewer.querySelector('.viewer-content');
    var info = viewer.querySelector('.viewer-info');
    var text = viewer.querySelector('.viewer-text');
    var images = viewer.querySelector('.viewer-images');
    var closeButton = viewer.querySelector('.viewer-close');
    var viewerLenis = null;
    var viewerFooter = null;
    var twoColumns = matchMedia('(min-width: 1101px)');

    // a copy of the page's footer (in the page's language). On desktop it's
    // fixed at the bottom, so the column ends with room for it: its height,
    // rounded up like the Work columns' (scroll.js)
    function addFooter() {
      if (viewerFooter) viewerFooter.remove();
      viewerFooter = document.querySelector('body > .site-footer').cloneNode(true);
      viewer.appendChild(viewerFooter);
      sizeFooter();
    }
    function sizeFooter() {
      if (!viewerFooter) return;
      var room = twoColumns.matches ? Math.ceil(viewerFooter.getBoundingClientRect().height) + 1 : 0;
      content.style.setProperty('--viewer-footer', room + 'px');
      if (viewerLenis) viewerLenis.resize();
      updateFooter();
    }
    // as on the Work page: shown as soon as the scroll is heading to its end
    function updateFooter() {
      var end = viewerLenis
        ? viewerLenis.limit <= 2 || viewerLenis.targetScroll >= viewerLenis.limit - 2
        : viewer.scrollTop >= viewer.scrollHeight - viewer.clientHeight - 2;
      viewer.classList.toggle('is-end', end);
    }
    viewer.addEventListener('scroll', function () { if (!viewerLenis) { updateFooter(); updateClose(); clipTop(); } });
    window.addEventListener('resize', function () { if (!viewer.hidden) { sizeFooter(); updateClose(); } });
    // the 12px of room above the first line (styles.css) is covered by the
    // menu's band as soon as the column scrolls, so nothing shows above where
    // it starts
    function clipTop() {
      var scrolled = viewerLenis ? viewerLenis.scroll > 0.01 || viewerLenis.targetScroll > 0.01 : viewer.scrollTop > 0;
      document.body.classList.toggle('viewer-scrolled', scrolled);
    }

    // The X: black or white, whichever shows against the part of the image
    // under it, measured from a few pixels of that part (a video's current
    // frame, or its poster until it plays); over the page itself, the page's
    // ink. Checked as the column scrolls, and a few times a second for videos.
    var sample = document.createElement('canvas');
    sample.width = sample.height = 6;
    var sampleContext = sample.getContext('2d', { willReadFrequently: true });
    var posters = {};
    var closeTimer = null;
    function lightness(media, x, y, size) {
      var box = media.getBoundingClientRect();
      var source = media;
      var width = media.naturalWidth, height = media.naturalHeight;
      if (media.tagName === 'VIDEO') {
        width = media.videoWidth; height = media.videoHeight;
        if (media.readyState < 2) {
          source = posters[media.poster];
          if (!source) {
            source = posters[media.poster] = new Image();
            source.src = media.poster;
          }
          width = source.naturalWidth; height = source.naturalHeight;
        }
      }
      if (!width || !height) return null;
      // object-fit: cover, centred
      var scale = Math.max(box.width / width, box.height / height);
      var left = box.left + (box.width - width * scale) / 2;
      var top = box.top + (box.height - height * scale) / 2;
      try {
        sampleContext.drawImage(source, (x - left) / scale, (y - top) / scale, size / scale, size / scale, 0, 0, 6, 6);
        var data = sampleContext.getImageData(0, 0, 6, 6).data;
      } catch (e) { return null; }
      var sum = 0;
      for (var i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      return sum / (data.length / 4) / 255;
    }
    function updateClose() {
      if (viewer.hidden) return;
      var button = closeButton.getBoundingClientRect();
      var x = button.left + button.width / 2, y = button.top + button.height / 2;
      var size = button.width + 8;
      var under = null;
      images.querySelectorAll('img, video').forEach(function (media) {
        var box = media.getBoundingClientRect();
        if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) under = media;
      });
      var level = under ? lightness(under, x - size / 2, y - size / 2, size) : null;
      // a little hysteresis, so it doesn't flicker on mid greys
      var light = closeButton.classList.contains('on-light');
      if (level === null) {
        closeButton.classList.remove('on-light', 'on-dark');
        return;
      }
      light = light ? level > 0.45 : level > 0.55;
      closeButton.classList.toggle('on-light', light);
      closeButton.classList.toggle('on-dark', !light);
    }
    var returnFocus = null;

    // videos load and play only while in view
    var playing = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var videos = entry.target.tagName === 'VIDEO' ? [entry.target] : entry.target.querySelectorAll('video');
        Array.prototype.forEach.call(videos, function (video) {
          if (!entry.isIntersecting) { video.pause(); return; }
          if (!video.getAttribute('src')) video.src = video.dataset.src;
          video.muted = true;
          if (!reduceMotion) video.play().catch(function () {});
        });
      });
    }, { root: viewer }) : null;

    // the project's line of info (name, typology, year) and its text, as
    // they are in the list (in the page's language); the collaborators go
    // on the line under the name instead of after the text (not on phones)
    function showInfo(row) {
      info.replaceChildren(row.querySelector('.name').cloneNode(true), row.querySelector('.meta').cloneNode(true));
      text.replaceChildren();
      row.querySelectorAll('.project-text p').forEach(function (para) {
        var copy = para.cloneNode(true);
        if (!phoneViewer.matches && /^(Collaborators|Colaboradores):/.test(para.textContent)) {
          copy.className = 'credits';
          info.appendChild(copy);
        } else {
          text.appendChild(copy);
        }
      });
    }
    var phoneViewer = matchMedia('(max-width: 640px)');

    // the project's images (shot: one of them, in the image column), and its
    // row in the list
    function open(shot, row) {
      showInfo(row);
      images.replaceChildren();
      Array.prototype.forEach.call(shot.parentElement.children, function (source) {
        if (!source.classList.contains('shot')) return;
        var box = source.getBoundingClientRect();
        var copy = source.cloneNode(true);
        // the Work column's proportions (as in Figma while the column is hidden, in the Full view)
        copy.style.setProperty('--ratio', box.height ? box.width / box.height : 930 / 688);
        images.appendChild(copy);
        if (playing) playing.observe(copy);
      });
      returnFocus = document.activeElement;
      // the menu stays usable above it (styles.css)
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== viewer && !el.classList.contains('site-header')) el.inert = true;
      });
      document.body.classList.add('viewer-open');
      viewer.hidden = false;
      addFooter();
      // whichever image was clicked, it opens at the start, with the
      // project's info above the first image
      viewer.scrollTop = 0;
      if (typeof Lenis !== 'undefined') {
        // overscroll off: at its ends it doesn't pass the wheel on to the page behind
        viewerLenis = new Lenis({ wrapper: viewer, content: content, overscroll: false, autoRaf: true });
        viewerLenis.on('scroll', function () { updateFooter(); updateClose(); clipTop(); });
      }
      updateFooter();
      updateClose();
      closeTimer = setInterval(updateClose, 200);
      closeButton.focus({ preventScroll: true });
    }
    function close() {
      if (viewerLenis) { viewerLenis.destroy(); viewerLenis = null; }
      clearInterval(closeTimer);
      closeButton.classList.remove('on-light', 'on-dark');
      viewer.hidden = true;
      document.body.classList.remove('viewer-open');
      document.body.classList.remove('viewer-scrolled');
      viewer.classList.remove('is-end');
      if (playing) playing.disconnect();
      images.replaceChildren();
      Array.prototype.forEach.call(document.body.children, function (el) { el.inert = false; });
      // back where the keyboard was, or nowhere (a click on an image)
      if (returnFocus && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
      else document.activeElement.blur();
    }

    gallery.addEventListener('click', function (event) {
      var shot = event.target.closest('.shot');
      if (shot && gallery.classList.contains('is-project')) open(shot, document.querySelector('.project.is-open'));
    });
    closeButton.addEventListener('click', close);
    document.addEventListener('keydown', function (event) {
      if (viewer.hidden || event.key !== 'Escape') return;
      close();
      event.preventDefault();
    });
  }

  // Two views, switched next to the filters (Index / Gallery) and kept for the
  // rest of the visit: Index is the list with the image column; Gallery is a grid
  // of every listed project's first image, two per row, each over the project's
  // line of info laid out as in the list. Clicking one opens the project in the
  // viewer. The grid follows the list's typology filter and order (showGallery).
  var fullPane = document.querySelector('.pane-full');
  var viewButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-view button'));
  if (gallery && fullPane && viewButtons.length) {
    var covers = fullPane.querySelector('.covers');
    var coversEmpty = covers.querySelector('.covers-empty');
    var cards = {};

    // a project's card, made the first time it's shown
    var card = function (row) {
      var key = row.dataset.project;
      if (cards[key]) return cards[key];
      var first = groups[key] && groups[key].querySelector('.shot');
      if (!first) return null;
      var el = document.createElement('div');
      el.className = 'cover';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      var shot = first.cloneNode(true);
      var infoLine = document.createElement('div');
      infoLine.className = 'cover-info';
      infoLine.append(row.querySelector('.name').cloneNode(true), row.querySelector('.meta').cloneNode(true));
      el.append(shot, infoLine);
      if (videos) {
        (shot.tagName === 'VIDEO' ? [shot] : Array.prototype.slice.call(shot.querySelectorAll('video')))
          .forEach(function (video) { videos.observe(video); });
      }
      el.addEventListener('click', function () { open(first, row); });
      el.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open(first, row);
      });
      cards[key] = el;
      return el;
    };
    renderCovers = function () {
      var any = false;
      Array.prototype.forEach.call(document.querySelectorAll('.projects > .project'), function (row) {
        var el = card(row);
        if (!el) return;
        covers.appendChild(el);
        el.hidden = row.hidden;
        if (!row.hidden) any = true;
      });
      coversEmpty.hidden = any;
    };

    var panesIndex = [document.querySelector('.pane-list'), document.querySelector('.pane-gallery')];
    var setView = function (view, remember) {
      var full = view === 'full';
      panesIndex.forEach(function (pane) { pane.hidden = full; });
      fullPane.hidden = !full;
      document.body.classList.toggle('is-full', full);
      viewButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
      if (remember !== false) {
        try { sessionStorage.setItem('workView', view); } catch (e) {}
      }
      document.dispatchEvent(new CustomEvent('work:view')); // scroll.js
    };
    viewButtons.forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    // On phones there's only the Gallery (styles.css hides the switch); the
    // view picked on a larger screen comes back if the window grows again
    var phone = matchMedia('(max-width: 640px)');
    var fitView = function () {
      var savedView = null;
      try { savedView = sessionStorage.getItem('workView'); } catch (e) {}
      setView(phone.matches || savedView === 'full' ? 'full' : 'index', false);
    };
    fitView();
    phone.addEventListener('change', fitView);
  }

  // Pointing at a row (or reaching it with the keyboard) previews its first
  // image; leaving the list empties the column again
  function setPreview(row) {
    if (row === preview) return;
    preview = row;
    if (!document.querySelector('.project.is-open')) showGallery();
  }
  heads.forEach(function (head) {
    var row = head.closest('.project');
    head.addEventListener('mouseenter', function () { setPreview(row); });
    head.addEventListener('focus', function () { setPreview(row); });
  });
  var projectList = document.querySelector('.projects');
  if (projectList) {
    projectList.addEventListener('mouseleave', function () { setPreview(null); });
    projectList.addEventListener('focusout', function (event) {
      if (!projectList.contains(event.relatedTarget)) setPreview(null);
    });
  }

  // On tablet and phone the image column would only come after the whole
  // list (styles.css hides it there), so a project opens straight in the
  // viewer, with its info, text and images
  var stacked = matchMedia('(max-width: 1100px)');
  heads.forEach(function (head) {
    var project = head.closest('.project');
    var text = document.getElementById(head.getAttribute('aria-controls'));
    head.addEventListener('click', function () {
      var group = groups[project.dataset.project];
      if (stacked.matches && group && group.querySelector('.shot')) {
        open(group.querySelector('.shot'), project);
        return;
      }
      var opening = !project.classList.contains('is-open');
      if (opening) heads.forEach(function (other) { if (other !== head) setOpen(other, false); });
      setOpen(head, opening);
      showGallery();
    });
    text.addEventListener('transitionend', function (e) {
      if (e.target === text && project.classList.contains('is-open')) settle(project);
    });
  });

  // The filters' last line is a cap height tall, a fraction of a pixel: the
  // 30px under them take up that fraction, so the list and the images start
  // on a whole pixel however many lines the typologies wrap to (styles.css)
  var filterBand = document.querySelector('.filters');
  function snapFilters() {
    filterBand.style.removeProperty('--snap');
    var bottom = filterBand.getBoundingClientRect().bottom + window.scrollY;
    filterBand.style.setProperty('--snap', (Math.ceil(bottom - 0.001) - bottom) + 'px');
  }
  if (filterBand) new ResizeObserver(snapFilters).observe(filterBand.firstElementChild);

  // Filters: one typology at a time (or All), and the list sorted by year
  // (newest first; clicking Year reverses it).
  var list = document.querySelector('.projects');
  var empty = document.querySelector('.filters-empty');
  var typeButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-types button'));
  var yearButton = document.querySelector('.filter-sort button');
  if (!list || !typeButtons.length) { showGallery(); return; }
  list.classList.add('is-filterable');

  var projects = Array.prototype.slice.call(list.querySelectorAll('.project')).map(function (el, i) {
    var meta = el.querySelectorAll('.meta > span');
    return {
      el: el,
      head: el.querySelector('.project-head'),
      index: i, // the original order breaks ties
      types: meta[0].textContent.split(',').map(function (t) { return t.trim().toLowerCase(); }),
      year: parseInt(meta[1].textContent, 10) || 0
    };
  });
  var state = { type: 'all', dir: -1 };

  function apply() {
    var shown = projects.filter(function (p) {
      var keep = state.type === 'all' || p.types.indexOf(state.type) !== -1;
      p.el.hidden = !keep;
      if (!keep) setOpen(p.head, false); // a hidden project doesn't stay open
      return keep;
    });
    var sorted = projects.slice().sort(function (a, b) {
      return (a.year - b.year) * state.dir || a.index - b.index;
    });
    sorted.forEach(function (p) { list.appendChild(p.el); });
    empty.hidden = shown.length > 0;
    list.classList.toggle('is-empty', !shown.length); // no line above an empty list
    showGallery();

    typeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.type === state.type));
    });
    labelYear();
    labelToggle();
  }

  // Phones: the typologies fold into one line, "Filter: All ↓" (Filtro: Todos
  // in Portuguese), next to Year; tapping it opens them below, one per line,
  // and choosing one closes them again (styles.css shows it only on phones)
  var bar = document.querySelector('.filters-bar');
  var typesBox = document.querySelector('.filter-types');
  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'filter-toggle';
  typesBox.id = 'filter-types';
  toggle.setAttribute('aria-controls', typesBox.id);
  toggle.setAttribute('aria-expanded', 'false');
  bar.insertBefore(toggle, typesBox);
  function labelToggle() {
    var open = bar.classList.contains('is-open');
    var active = typeButtons.filter(function (b) { return b.dataset.type === state.type; })[0];
    var word = document.documentElement.lang === 'pt' ? 'Filtro' : 'Filter';
    var label = document.createElement('span');
    var name = document.createElement('b');
    name.textContent = active.firstElementChild.textContent;
    label.append(word + ': ', name, ' ' + (open ? '\u2191' : '\u2193'));
    toggle.replaceChildren(label);
    toggle.setAttribute('aria-expanded', String(open));
  }
  function setMenu(open) {
    bar.classList.toggle('is-open', open);
    labelToggle();
  }
  toggle.addEventListener('click', function () { setMenu(!bar.classList.contains('is-open')); });
  document.addEventListener('langchange', labelToggle);

  // Year (Ano in Portuguese, lang.js), with its arrow; both arrows' widths
  // are reserved in styles.css
  function labelYear() {
    var word = document.documentElement.lang === 'pt' ? 'Ano' : 'Year';
    yearButton.dataset.label = word + ' \u2193';
    yearButton.dataset.alt = word + ' \u2191';
    yearButton.firstElementChild.textContent = word + ' ' + (state.dir === 1 ? '\u2191' : '\u2193');
  }
  document.addEventListener('langchange', labelYear);

  typeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      // clicking the active typology again goes back to All
      state.type = b.dataset.type === state.type ? 'all' : b.dataset.type;
      bar.classList.remove('is-open');
      apply();
    });
  });
  yearButton.addEventListener('click', function () {
    state.dir = -state.dir;
    apply();
  });

  apply();
})();
