// Info: Lectures, Workshop and Academic Background open like Work's Index rows
// (same classes and styles): clicking a row opens its entries below it,
// clicking again closes them, and only one is open at a time. The entries are
// inert while closed, so keyboard and screen readers only reach them open.
(function () {
  var heads = Array.prototype.slice.call(document.querySelectorAll('.sections .project-head'));

  function setOpen(head, open) {
    var row = head.closest('.project');
    var text = document.getElementById(head.getAttribute('aria-controls'));
    if (row.classList.contains('is-open') === open) return;
    row.classList.remove('is-settled'); // clip again while it animates
    row.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    text.inert = !open;
    // no animation (reduced motion): it's settled straight away
    if (open && parseFloat(getComputedStyle(text).transitionDuration) === 0) row.classList.add('is-settled');
  }

  heads.forEach(function (head) {
    var row = head.closest('.project');
    var text = document.getElementById(head.getAttribute('aria-controls'));
    head.addEventListener('click', function () {
      var opening = !row.classList.contains('is-open');
      if (opening) heads.forEach(function (other) { if (other !== head) setOpen(other, false); });
      setOpen(head, opening);
    });
    text.addEventListener('transitionend', function (e) {
      if (e.target === text && row.classList.contains('is-open')) row.classList.add('is-settled');
    });
  });
})();
