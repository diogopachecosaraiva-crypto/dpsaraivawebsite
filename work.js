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
      group.classList.toggle('is-preview', !open && row === preview);
    });
    gallery.classList.toggle('is-project', !!open);
    if (renderCovers) renderCovers();
    document.dispatchEvent(new CustomEvent('work:gallery'));
  }

  // Images with versions (.frames) alternate between them like a GIF, at the
  // Home's pace, wherever they show: the column, the covers or the viewer;
  // videos load and play only while they're on screen. With
  // reduced motion asked for, the first version and the video's cover stay.
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // a video shown at most 640px wide (on a phone) plays its lighter copy,
  // 960px wide (720 for a pair's half), where it has one (data-src-small,
  // made with _originais/tools/small-video.swift)
  function videoSource(video) {
    var small = video.dataset.srcSmall;
    var width = video.getBoundingClientRect().width;
    return small && width && width <= 640 ? small : video.dataset.src;
  }
  // refused to play on its own (e.g. Low Power Mode): it plays at a touch
  // (video-file.js)
  function refused(error) { if (window.videoFile) videoFile.refused(error); }
  // a video starts loading a screen and a half before it comes into view, so
  // it's ready to play by the time it gets there: its lighter copy fetched
  // whole (video-file.js), the full video buffered (where that's honoured);
  // now, as it comes into view, it plays from whatever there is
  var NEAR = '150% 0px';
  function loadVideo(video, now) {
    if (video.getAttribute('src')) return;
    var path = videoSource(video);
    // (from R2 on the published site, video-file.js)
    var url = window.videoFile ? videoFile.url(path) : path;
    if (path === video.dataset.srcSmall && window.videoFile) {
      var ready = videoFile.get(url, function (copy) {
        if (!video.getAttribute('src')) video.src = copy;
      });
      if (ready) { video.src = ready; return; }
      if (!now) return;
      videoFile.giveUp(url);
    }
    video.preload = 'auto';
    video.src = url;
  }
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
      document.querySelectorAll('.frames').forEach(function (frames) {
        var imgs = frames.querySelectorAll('img');
        var current = frame % imgs.length;
        imgs.forEach(function (img, i) { img.classList.toggle('is-current', i === current); });
      });
    }, 750);
    if ('IntersectionObserver' in window) {
      var nearVideos = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) loadVideo(entry.target); });
      }, { rootMargin: NEAR });
      var videos = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            loadVideo(video, true);
            video.play().catch(refused);
          } else {
            video.pause();
          }
        });
      });
      gallery.querySelectorAll('video').forEach(function (video) { nearVideos.observe(video); videos.observe(video); });
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
  // 15px apart, each from margin to margin, 3:2 (a pair's halves side by
  // side, as tall, videos playing while in view). It scrolls freely and smoothly like the Work columns (Lenis),
  // always from the start. The project's line of info (name, typology,
  // year) and Close take the menu's place at the top; above the images, its
  // collaborators and its text (from column 5 on desktop). At the end comes
  // the site's footer, as on the rest of the Work page: on desktop it slides
  // up once the scroll reaches the end, and the last image stops above it.
  // Close, the browser's back (button or gesture) or Escape go back: opening
  // a project is a step in the browser's history.
  if (gallery) {
    var viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    // (not aria-modal: its Close, on the project's line, sits next to it; the
    // rest of the page is made inert while it's open instead)
    viewer.setAttribute('aria-label', 'Image viewer');
    viewer.setAttribute('data-pt-aria-label', 'Visualizador de imagens');
    viewer.tabIndex = -1;   // focused while open, for the keyboard
    viewer.innerHTML =
      '<div class="viewer-content">' +
        '<div class="viewer-info"></div>' +
        '<div class="viewer-text"></div>' +
        '<div class="viewer-images"></div>' +
      '</div>' +
      '<div class="viewer-bar grid">' +
        '<button class="viewer-close" type="button"><span data-pt="Fechar">Close</span></button>' +
      '</div>';
    document.body.appendChild(viewer);
    var content = viewer.querySelector('.viewer-content');
    var info = viewer.querySelector('.viewer-info');
    var text = viewer.querySelector('.viewer-text');
    var images = viewer.querySelector('.viewer-images');
    var projectLine = viewer.querySelector('.viewer-bar');
    // the project's line goes next to the viewer, not inside it: fixed above
    // a scrolling box, Safari on the iPhone would clip it away
    projectLine.hidden = true;
    document.body.appendChild(projectLine);
    var closeButton = projectLine.querySelector('.viewer-close');
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
    viewer.addEventListener('scroll', function () { if (!viewerLenis) updateFooter(); });
    window.addEventListener('resize', function () { if (!viewer.hidden) { sizeFooter(); alignToMenu(); } });

    // The year above the text starts where ABOUT does in the menu
    // (styles.css): how far that is from the info's left edge, whatever the
    // menu's layout. On phones, with ABOUT inside MENU +, at the grid's
    // second column instead.
    var infoLink = document.querySelector('.site-header a[href="info.html"]');
    function alignToMenu() {
      if (!infoLink) return;
      var x = infoLink.getBoundingClientRect().left;
      if (infoLink.closest('.menu-items') && phoneViewer.matches) {
        var gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 10;
        x = (document.documentElement.clientWidth + gutter) / 2;
      }
      info.style.setProperty('--info-x', (x - info.getBoundingClientRect().left) + 'px');
      projectLine.style.setProperty('--info-x', (x - projectLine.getBoundingClientRect().left) + 'px');
    }
    // the viewer starts 15px below the project's line, however many lines
    // it takes (a whole pixel, as the menu's band). Rounded down: the line
    // covers the viewer's top by a fraction of a pixel rather than leave a
    // sliver of the page behind showing between them.
    function fitBar() {
      if (!viewer.hidden) viewer.style.setProperty('--bar-h', Math.floor(projectLine.getBoundingClientRect().height + 0.001) + 'px');
    }
    if ('ResizeObserver' in window) new ResizeObserver(fitBar).observe(projectLine);

    var returnFocus = null;
    var pageTheme = 'light';

    // videos start loading on their way into view (NEAR) and play only while
    // in view
    function videosIn(el) { return el.tagName === 'VIDEO' ? [el] : el.querySelectorAll('video'); }
    var nearing = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) Array.prototype.forEach.call(videosIn(entry.target), function (video) { loadVideo(video); });
      });
    }, { root: viewer, rootMargin: NEAR }) : null;
    var playing = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        Array.prototype.forEach.call(videosIn(entry.target), function (video) {
          if (!entry.isIntersecting) { video.pause(); return; }
          loadVideo(video, true);
          video.muted = true;
          if (!reduceMotion) video.play().catch(refused);
        });
      });
    }, { root: viewer }) : null;

    // the project's info (name, typology, year) and its text, as they are
    // in the list (in the page's language): the info in the menu's place, the
    // collaborators apart from the text (styles.css; on phones the typology
    // and the year above the text, the collaborators with it)
    function showInfo(row) {
      var meta = row.querySelector('.meta');
      projectLine.replaceChildren(row.querySelector('.name').cloneNode(true), meta.cloneNode(true), closeButton);
      info.replaceChildren();
      text.replaceChildren();
      if (phoneViewer.matches) info.appendChild(meta.cloneNode(true));
      row.querySelectorAll('.project-text p').forEach(function (para) {
        var copy = para.cloneNode(true);
        if (!phoneViewer.matches && /^(Collaborators|Colaboradores):/.test(para.textContent)) {
          info.appendChild(copy);
        } else {
          text.appendChild(copy);
        }
      });
      info.hidden = !info.children.length;
    }
    var phoneViewer = matchMedia('(max-width: 640px)');

    // the project's images (shot: one of them, in the image column), and its
    // row in the list. Each project has its own address, work.html#<project>
    // (its data-project): opening it is a step in the browser's history with
    // that address (pushed unless the address is already there), and the tab
    // takes the project's name
    var pageTitle = document.title;
    function open(shot, row, pushed) {
      if (!viewer.hidden) close(); // another project, through its address
      showInfo(row);
      images.replaceChildren();
      Array.prototype.forEach.call(shot.parentElement.children, function (source) {
        if (!source.classList.contains('shot')) return;
        var copy = source.cloneNode(true);
        images.appendChild(copy);
        // (each video itself: on phones a pair has no box of its own)
        if (playing) Array.prototype.forEach.call(videosIn(copy), function (video) { nearing.observe(video); playing.observe(video); });
      });
      returnFocus = document.activeElement;
      // the menu stays usable above it (styles.css)
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== viewer && el !== projectLine && !el.classList.contains('site-header')) el.inert = true;
      });
      // a project opened full size is shown in dark mode (the page itself is light)
      pageTheme = document.documentElement.dataset.theme;
      document.documentElement.dataset.theme = 'dark';
      document.body.classList.add('viewer-open');
      viewer.hidden = false;
      projectLine.hidden = false;
      fitBar();
      addFooter();
      // whichever image was clicked, it opens at the start, with the
      // project's info above the first image
      viewer.scrollTop = 0;
      if (typeof Lenis !== 'undefined') {
        // overscroll off: at its ends it doesn't pass the wheel on to the page behind
        viewerLenis = new Lenis({ wrapper: viewer, content: content, overscroll: false, autoRaf: true });
        viewerLenis.on('scroll', updateFooter);
      }
      updateFooter();
      alignToMenu();
      viewer.focus({ preventScroll: true });
      document.title = row.querySelector('.name').textContent.trim() + ' — ' + pageTitle.replace(/^Projects — /, '');
      // a step in the browser's history, so its back closes the project
      if (!pushed) history.pushState({ viewer: true }, '', '#' + row.dataset.project);
    }
    function close() {
      if (viewer.hidden) return;
      if (viewerLenis) { viewerLenis.destroy(); viewerLenis = null; }
      viewer.hidden = true;
      projectLine.hidden = true;
      document.title = pageTitle;
      document.documentElement.dataset.theme = pageTheme;
      document.body.classList.remove('viewer-open');
      viewer.classList.remove('is-end');
      if (playing) { nearing.disconnect(); playing.disconnect(); }
      images.replaceChildren();
      Array.prototype.forEach.call(document.body.children, function (el) { el.inert = false; });
      // back where the keyboard was, or nowhere (a click on an image)
      if (returnFocus && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
      else document.activeElement.blur();
    }

    gallery.addEventListener('click', function (event) {
      var shot = event.target.closest('.shot');
      if (shot && gallery.classList.contains('is-project')) openFaded(shot, document.querySelector('.project.is-open'));
    });
    // the project an address names (#full-frames), with its first image
    function fromAddress() {
      var key = decodeURIComponent(location.hash.slice(1));
      var row = key && document.querySelector('.projects > .project[data-project="' + key.replace(/"/g, '') + '"]');
      var group = row && groups[key];
      var shot = group && group.querySelector('.shot');
      return shot ? { shot: shot, row: row } : null;
    }
    // the browser's back closes it; Close and Escape go back the same way.
    // Forward opens it again, and so does a project's address typed or
    // followed while on the page
    // Opening a project (a click or a key) and closing it (Close, Escape)
    // go the way pages change (theme.js, styles.css): a block of the colour
    // coming fades in over the page, the project opens or closes under it,
    // and after a moment it fades away
    var LEAVE = 600; // ms, as in theme.js
    var HOLD = 300;
    var fades = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fading = false;
    function fadeTo(theme, change) {
      if (fading) return;
      if (!fades) { change(); return; }
      fading = true;
      var root = document.documentElement;
      root.dataset.next = theme;
      root.classList.add('is-leaving');
      setTimeout(function () {
        change();
        setTimeout(function () {
          root.classList.remove('is-leaving');
          fading = false;
          setTimeout(function () { if (!root.classList.contains('is-leaving')) delete root.dataset.next; }, LEAVE);
        }, HOLD);
      }, LEAVE);
    }
    function openFaded(shot, row) {
      if (!viewer.hidden) return;
      fadeTo('dark', function () { open(shot, row); });
    }
    function goBack() {
      fadeTo(pageTheme, function () {
        if (history.state && history.state.viewer) history.back();
        else close();
      });
    }
    window.addEventListener('popstate', function () {
      var target = fromAddress();
      if (!target) { close(); return; }
      if (!history.state || !history.state.viewer) history.replaceState({ viewer: true }, '');
      open(target.shot, target.row, true);
    });
    closeButton.addEventListener('click', goBack);
    document.addEventListener('keydown', function (event) {
      if (viewer.hidden || event.key !== 'Escape') return;
      goBack();
      event.preventDefault();
    });

    // arriving at a project's address opens it, over the Work page: the
    // address first goes back to work.html, so the browser's back (or Close)
    // leaves the project for the Work page rather than the site
    var arrived = fromAddress();
    if (arrived) {
      history.replaceState(null, '', location.pathname + location.search);
      open(arrived.shot, arrived.row);
    }
  }

  // Two views, switched next to the filters (Gallery / Index) and kept for the
  // rest of the visit; the page opens on the Gallery (as work.html is written,
  // so nothing switches on load). Index is the list with the image column; Gallery is a grid
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
      el.addEventListener('click', function () { openFaded(first, row); });
      el.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openFaded(first, row);
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
      setView(phone.matches || savedView !== 'index' ? 'full' : 'index', false);
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
        openFaded(group.querySelector('.shot'), project);
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
    fitFilters();
  }

  // The typologies fold into one line, "Filter: All ↓" (Filtro: Todos in
  // Portuguese), next to Year, on phones and wherever they wouldn't fit on
  // one line beside it (.is-compact, fitFilters below); tapping it opens them
  // below, one per line, and choosing one closes them again (styles.css)
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
  // the list's full height, which it grows to on opening (styles.css): from
  // its first line's top to its last line's baseline, as laid out (their
  // tap areas reach past them)
  function measureTypes() {
    var first = typeButtons[0], last = typeButtons[typeButtons.length - 1];
    var top = first.getBoundingClientRect().top - parseFloat(getComputedStyle(first).marginTop);
    var bottom = last.getBoundingClientRect().bottom + parseFloat(getComputedStyle(last).marginBottom);
    typesBox.style.setProperty('--types-h', bottom - top + 'px');
  }
  function setMenu(open) {
    if (open) measureTypes();
    bar.classList.toggle('is-open', open);
    labelToggle();
  }
  toggle.addEventListener('click', function () { setMenu(!bar.classList.contains('is-open')); });
  document.addEventListener('langchange', labelToggle);

  // Folded or on one line: on one line the typologies need their own widths
  // (as they are in the folded list too) plus, between each two, the stroke
  // with 10px on either side; beside Year, a gutter apart. Measured whenever
  // that could change: the window's size, the language, the active one
  // (bold), the font coming in.
  var phoneFilters = matchMedia('(max-width: 640px)');
  function fitFilters() {
    var fold = phoneFilters.matches;
    if (!fold) {
      var style = getComputedStyle(document.documentElement);
      var stroke = parseFloat(style.getPropertyValue('--stroke')) || 2;
      var gutter = parseFloat(style.getPropertyValue('--gutter')) || 15;
      // (each word's own width, without the stroke drawn after it on one line)
      var word = document.createRange();
      var needed = typeButtons.reduce(function (sum, b) {
        word.selectNodeContents(b.firstElementChild.firstChild);
        return sum + word.getBoundingClientRect().width;
      }, 0) + (typeButtons.length - 1) * (20 + stroke);
      var sort = bar.querySelector('.filter-sort');
      var room = bar.getBoundingClientRect().width - (sort ? sort.getBoundingClientRect().width + gutter : 0);
      fold = needed > room;
    }
    if (fold === bar.classList.contains('is-compact')) return;
    bar.classList.toggle('is-compact', fold);
    if (!fold) setMenu(false);
  }
  new ResizeObserver(fitFilters).observe(bar);
  window.addEventListener('resize', fitFilters);
  document.addEventListener('langchange', fitFilters);
  if (document.fonts) document.fonts.ready.then(fitFilters);
  // the page opening in Portuguese: lang.js translates the typologies once
  // the page is read, after this first ran, so the labels follow then
  document.addEventListener('DOMContentLoaded', function () { labelYear(); labelToggle(); fitFilters(); });

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
