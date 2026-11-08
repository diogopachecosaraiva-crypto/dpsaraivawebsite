// Light/dark mode is set by each page in its HTML (data-theme on <html>): the
// Home is dark, Work and Info light, and on Work a project opened full size
// turns the page dark while it's open (work.js). Loaded in <head>.
(function () {
  document.documentElement.classList.add('js'); // lets CSS tell that scripts run (used by the Home poster shuffle)
})();
