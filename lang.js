// Language. The site opens in English; the PT button in the menu switches it
// to Portuguese and EN back. The choice lasts for the rest of the visit (a new
// visit opens in English again). Loaded in <head>, like theme.js.
// Text to translate carries its Portuguese in the HTML, next to the English:
// data-pt for the element's content, data-pt-alt, data-pt-aria-label, ... for
// an attribute. Text that repeats (typologies, image descriptions,
// "Collaborators:") is given its data-pt by the rules below instead.
(function () {
  var root = document.documentElement;
  var lang = 'en';
  try { if (sessionStorage.getItem('lang') === 'pt') lang = 'pt'; } catch (e) {}
  root.lang = lang;

  var ATTRS = ['alt', 'aria-label', 'aria-roledescription', 'data-label'];

  var TYPES = {
    all: 'Todos', identity: 'Identidade', poster: 'Cartaz', editorial: 'Editorial',
    motion: 'Motion', merch: 'Merch', web: 'Web', illustration: 'Ilustração'
  };

  function rules() {
    // Work: the typology filters and each project's typologies
    document.querySelectorAll('.filter-types button').forEach(function (button) {
      var pt = TYPES[button.dataset.type];
      if (!pt) return;
      button.setAttribute('data-pt-data-label', pt);
      button.firstElementChild.setAttribute('data-pt', pt);
    });
    document.querySelectorAll('.meta > span:first-child').forEach(function (span) {
      span.setAttribute('data-pt', span.textContent.split(', ').map(function (type) {
        return TYPES[type.toLowerCase()] || type;
      }).join(', '));
    });
    // Work: placeholder descriptions and the collaborators line
    document.querySelectorAll('.project-text p:not([data-pt])').forEach(function (p) {
      var html = p.innerHTML;
      if (html === 'Project description coming soon.') p.setAttribute('data-pt', 'Descrição do projeto em breve.');
      else if (html.indexOf('Collaborators:') === 0) p.setAttribute('data-pt', html.replace('Collaborators:', 'Colaboradores:'));
    });
    // image and video descriptions: "Poster, …", "Animated poster, …",
    // "Project, image 3", "Project, image 4 (video)"
    document.querySelectorAll('img[alt], video[aria-label]').forEach(function (media) {
      var attr = media.tagName === 'IMG' ? 'alt' : 'aria-label';
      if (media.hasAttribute('data-pt-' + attr)) return;
      var text = media.getAttribute(attr);
      var pt = text
        .replace(/^Animated poster, /, 'Cartaz animado, ')
        .replace(/^Poster, /, 'Cartaz, ')
        .replace(/, image (\w+)/, ', imagem $1')
        .replace(' (video)', ' (vídeo)');
      if (pt !== text) media.setAttribute('data-pt-' + attr, pt);
    });
  }

  // The English is kept (data-en, data-en-…) the first time it is replaced
  function apply() {
    document.querySelectorAll('[data-pt]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === 'pt' ? el.dataset.pt : el.dataset.en;
    });
    ATTRS.forEach(function (attr) {
      document.querySelectorAll('[data-pt-' + attr + ']').forEach(function (el) {
        var en = 'data-en-' + attr;
        if (!el.hasAttribute(en)) el.setAttribute(en, el.getAttribute(attr));
        el.setAttribute(attr, el.getAttribute(lang === 'pt' ? 'data-pt-' + attr : en));
      });
    });
    document.querySelectorAll('.lang button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    rules();
    if (lang === 'pt') apply();
    document.querySelectorAll('.lang button').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.dataset.lang === lang) return;
        lang = button.dataset.lang;
        root.lang = lang;
        try { sessionStorage.setItem('lang', lang); } catch (e) {}
        apply();
        // work.js updates the text it writes itself
        document.dispatchEvent(new CustomEvent('langchange'));
      });
    });
  });
})();
