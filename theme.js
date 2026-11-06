// Light/dark mode. Loaded in <head> so the saved theme applies before the page paints.
(function () {
  var root = document.documentElement;
  root.classList.add('js'); // lets CSS tell that scripts run (used by the Home poster shuffle)
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  function isDark() {
    return root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
  }

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
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      label(button);
    });
  });
})();
