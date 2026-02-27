document.addEventListener('pjax:complete', function () {
  if (typeof MathJax !== 'undefined' && MathJax.Hub) {
    MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
  }
});
