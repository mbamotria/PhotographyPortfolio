(() => {
  const STORAGE_KEY = "portfolio_theme";
  const body = document.body;
  const toggles = Array.from(document.querySelectorAll(".theme-toggle"));

  if (!body || toggles.length === 0) return;

  const getStoredTheme = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  };

  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const setToggleState = (theme) => {
    toggles.forEach((toggle) => {
      const isDark = theme === "dark";
      toggle.textContent = isDark ? "Light" : "Dark";
      toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode",
      );
    });
  };

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    body.classList.toggle("theme-dark", isDark);
    body.classList.toggle("theme-light", !isDark);
    setToggleState(theme);
  };

  let currentTheme = getStoredTheme() || getSystemTheme();
  applyTheme(currentTheme);

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      try {
        localStorage.setItem(STORAGE_KEY, currentTheme);
      } catch {
        // Ignore storage errors.
      }
    });
  });
})();
