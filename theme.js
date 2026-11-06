// Light/dark mode. The site opens light; the dot button switches to dark and
// back. The choice lasts for the rest of the visit (a new visit opens light
// again), like the language. Loaded in <head> so the theme applies before the
// page paints.
(function () {
  var root = document.documentElement;
  root.classList.add('js'); // lets CSS tell that scripts run (used by the Home poster shuffle)
  var saved = null;
  try { saved = sessionStorage.getItem('theme'); } catch (e) {}
  root.dataset.theme = saved === 'dark' ? 'dark' : 'light';

  function isDark() { return root.dataset.theme === 'dark'; }

  // in the page's language (lang.js)
  function label(button) {
    var pt = root.lang === 'pt';
    button.setAttribute('aria-label', isDark()
      ? (pt ? 'Mudar para modo claro' : 'Switch to light mode')
      : (pt ? 'Mudar para modo escuro' : 'Switch to dark mode'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector('.dot');
    if (!button) return;
    label(button);
    document.addEventListener('langchange', function () { label(button); });
    button.addEventListener('click', function () {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { sessionStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      label(button);
    });
  });
})();
