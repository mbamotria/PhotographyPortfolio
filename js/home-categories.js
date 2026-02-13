(() => {
  const categoryGrid = document.getElementById("category-grid");
  if (!categoryGrid) return;

  const categories = Array.isArray(window.FEATURED_HOME_CATEGORIES)
    ? window.FEATURED_HOME_CATEGORIES
    : Array.isArray(window.PORTFOLIO_CATEGORIES)
      ? window.PORTFOLIO_CATEGORIES
    : [];

  if (categories.length === 0) {
    categoryGrid.innerHTML = "";
    return;
  }

  categoryGrid.innerHTML = categories
    .slice(0, 3)
    .map(
      (category) => `
        <a class="category-card category-${String(category.slug || "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")}" href="gallery.html?category=${encodeURIComponent(category.slug)}">
          <img
            class="category-thumb"
            src="${category.thumbnail}"
            alt="${category.label} category thumbnail"
            loading="lazy"
          />
          <div class="category-content">
            <h3>${category.label}</h3>
            <p>${category.description || ""}</p>
            <span class="category-link">Open category</span>
          </div>
        </a>
      `,
    )
    .join("");
})();
