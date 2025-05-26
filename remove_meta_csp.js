(function () {
  // Remove all meta CSP tags before any scripts run
  const observer = new MutationObserver((mutations, obs) => {
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(tag => {
      console.warn('[Plottico CSP Bypass] Removing meta CSP tag:', tag);
      tag.remove();
    });
  });

  // Observe the <head> in case meta tags are dynamically injected
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
