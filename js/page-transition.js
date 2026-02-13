(() => {
  const TRANSITION_MS = 260;
  const body = document.body;
  let navigating = false;

  requestAnimationFrame(() => {
    body.classList.add("page-ready");
  });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest("a[href]");
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const samePath = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePath) return;
    if (navigating) {
      event.preventDefault();
      return;
    }

    navigating = true;
    event.preventDefault();
    body.classList.add("page-leaving");

    setTimeout(() => {
      window.location.href = url.href;
    }, TRANSITION_MS);
  });

  window.addEventListener("pageshow", () => {
    body.classList.remove("page-leaving");
    navigating = false;
  });
})();
