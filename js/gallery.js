// ===== GALLERY MANAGER =====
class GalleryManager {
  constructor() {
    this.images = [];
    this.allImages = [];
    this.currentImageIndex = 0;
    this.galleryElement = document.getElementById("gallery-grid");
    this.lightboxElement = document.getElementById("lightbox");
    this.lightboxImg = document.getElementById("lightbox-img");
    this.loadingElement = document.getElementById("loading");
    this.errorElement = document.getElementById("error");
    this.filterSummaryElement = document.getElementById("filter-summary");
    this.filtersElement = document.getElementById("category-filters");
    this.categoryDefinitions = this.getCategoryDefinitions();
    this.activeCategory = this.getCategoryFromUrl();
    this.init();
  }

  init() {
    if (
      !this.galleryElement ||
      !this.lightboxElement ||
      !this.lightboxImg ||
      !this.loadingElement ||
      !this.errorElement
    ) {
      return;
    }

    this.setupEventListeners();
    this.loadGallery();
  }

  setupEventListeners() {
    const closeBtn = document.querySelector(".lightbox-close");
    const prevBtn = document.querySelector(".lightbox-prev");
    const nextBtn = document.querySelector(".lightbox-next");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeLightbox());
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.navigateImage(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.navigateImage(1));
    }

    // Close lightbox on background click
    this.lightboxElement.addEventListener("click", (e) => {
      if (e.target === this.lightboxElement) {
        this.closeLightbox();
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (this.lightboxElement.classList.contains("active")) {
        if (e.key === "Escape") this.closeLightbox();
        if (e.key === "ArrowLeft") this.navigateImage(-1);
        if (e.key === "ArrowRight") this.navigateImage(1);
      }
    });

    window.addEventListener("popstate", () => {
      this.applyCategoryFilter(this.getCategoryFromUrl(), { updateUrl: false });
    });
  }

  getCategoryDefinitions() {
    const configured = Array.isArray(window.PORTFOLIO_CATEGORIES)
      ? window.PORTFOLIO_CATEGORIES
      : [];

    if (configured.length === 0) {
      return [
        { slug: "landscapes", label: "Landscapes" },
        { slug: "nature", label: "Nature" },
        { slug: "animal", label: "Animal" },
      ];
    }

    return configured
      .map((category) => ({
        slug: this.normalizeCategorySlug(category.slug),
        label: category.label || category.slug,
      }))
      .filter((category) => category.slug);
  }

  normalizeCategorySlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  getCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = this.normalizeCategorySlug(params.get("category"));

    if (!categoryParam) return "all";

    const exists = this.categoryDefinitions.some(
      (category) => category.slug === categoryParam,
    );

    return exists ? categoryParam : "all";
  }

  getCategoryLabel(slug) {
    if (slug === "all") return "All Photos";

    const match = this.categoryDefinitions.find((category) => category.slug === slug);
    return match ? match.label : "All Photos";
  }

  async loadGallery() {
    try {
      const images = await this.loadImagesFromFolder();

      if (images.length === 0) {
        this.showError(
          "No images found. Upload images via /admin or add them to the images/portfolio folder.",
        );
        return;
      }

      this.allImages = images;
      this.renderCategoryFilters();
      this.applyCategoryFilter(this.activeCategory, { updateUrl: false });
      this.hideLoading();
    } catch (error) {
      console.error("Error loading gallery:", error);
      this.showError("Failed to load gallery.");
    }
  }

  async loadImagesFromFolder() {
    try {
      // Try to fetch from Netlify function (Cloudinary)
      const response = await fetch("/.netlify/functions/get-images");
      if (response.ok) {
        const data = await response.json();
        return (data.images || [])
          .map((image, index) => this.normalizeImage(image, index))
          .filter(Boolean);
      }
    } catch (error) {
      console.log("Failed to fetch from Cloudinary, trying local images.json...");
      
      // Fallback to local images.json for development
      try {
        const localResponse = await fetch("/images/portfolio/images.json");
        if (localResponse.ok) {
          const localData = await localResponse.json();
          return (localData.images || [])
            .map((image, index) => this.normalizeImage(image, index))
            .filter(Boolean);
        }
      } catch (fallbackError) {
        console.log("No local images.json found either.");
      }
    }

    return [];
  }

  normalizeImage(image, index) {
    if (typeof image === "string") {
      return {
        src: image,
        title: `Photo ${index + 1}`,
        categories: [],
      };
    }

    if (!image || typeof image !== "object") {
      return null;
    }

    const src = image.url || image.path || image.src;
    if (!src) {
      return null;
    }

    const rawCategories = Array.isArray(image.categories)
      ? image.categories
      : image.category
        ? [image.category]
        : [];

    const categories = rawCategories
      .map((category) => this.normalizeCategorySlug(category))
      .filter(Boolean);

    return {
      src,
      title: image.title || `Photo ${index + 1}`,
      categories: [...new Set(categories)],
    };
  }

  renderCategoryFilters() {
    if (!this.filtersElement) return;

    const allCategories = [
      { slug: "all", label: "All Photos" },
      ...this.categoryDefinitions,
    ];

    this.filtersElement.innerHTML = allCategories
      .map((category) => {
        const count = this.getCategoryCount(category.slug);
        return `
          <button
            class="filter-button"
            data-category="${category.slug}"
            type="button"
          >
            ${category.label}
            <span>${count}</span>
          </button>
        `;
      })
      .join("");

    this.filtersElement.querySelectorAll(".filter-button").forEach((button) => {
      button.addEventListener("click", () => {
        const categorySlug = button.getAttribute("data-category");
        this.applyCategoryFilter(categorySlug, { updateUrl: true });
      });
    });

    this.updateActiveFilterButton();
  }

  getCategoryCount(slug) {
    if (slug === "all") return this.allImages.length;
    return this.allImages.filter((image) => image.categories.includes(slug)).length;
  }

  applyCategoryFilter(slug, options = { updateUrl: true }) {
    const normalized = this.normalizeCategorySlug(slug);
    const isKnown =
      normalized === "all" ||
      this.categoryDefinitions.some((category) => category.slug === normalized);

    this.activeCategory = isKnown ? normalized : "all";

    if (this.activeCategory === "all") {
      this.images = [...this.allImages];
    } else {
      this.images = this.allImages.filter((image) =>
        image.categories.includes(this.activeCategory),
      );
    }

    this.galleryElement.innerHTML = "";
    this.hideError();

    if (this.images.length === 0) {
      this.showError(`No photos in ${this.getCategoryLabel(this.activeCategory)} yet.`);
    } else {
      this.renderGallery();
      this.hideLoading();
    }

    this.updateFilterSummary();
    this.updateActiveFilterButton();

    if (options.updateUrl) {
      this.updateCategoryInUrl(this.activeCategory);
    }
  }

  updateFilterSummary() {
    if (!this.filterSummaryElement) return;

    const label = this.getCategoryLabel(this.activeCategory);
    this.filterSummaryElement.textContent = `Showing: ${label} (${this.images.length})`;
  }

  updateActiveFilterButton() {
    if (!this.filtersElement) return;

    this.filtersElement.querySelectorAll(".filter-button").forEach((button) => {
      const slug = button.getAttribute("data-category");
      button.classList.toggle("active", slug === this.activeCategory);
    });
  }

  updateCategoryInUrl(slug) {
    const url = new URL(window.location.href);

    if (slug === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", slug);
    }

    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  renderGallery() {
    this.images.forEach((image, index) => {
      const galleryItem = this.createGalleryItem(image, index);
      this.galleryElement.appendChild(galleryItem);
    });
  }

  createGalleryItem(image, index) {
    const item = document.createElement("div");
    item.className = "gallery-item";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.title || `Gallery image ${index + 1}`;
    img.loading = "lazy";

    item.addEventListener("click", () => this.openLightbox(index));

    item.appendChild(img);
    return item;
  }

  openLightbox(index) {
    this.currentImageIndex = index;
    this.updateLightboxImage();
    this.lightboxElement.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeLightbox() {
    this.lightboxElement.classList.remove("active");
    document.body.style.overflow = "";
  }

  navigateImage(direction) {
    this.currentImageIndex += direction;

    if (this.currentImageIndex < 0) {
      this.currentImageIndex = this.images.length - 1;
    } else if (this.currentImageIndex >= this.images.length) {
      this.currentImageIndex = 0;
    }

    this.updateLightboxImage();
  }

  updateLightboxImage() {
    const image = this.images[this.currentImageIndex];
    if (!image) return;

    this.lightboxImg.src = image.src;
    this.lightboxImg.alt = image.title || `Image ${this.currentImageIndex + 1}`;

    document.getElementById("current-index").textContent =
      this.currentImageIndex + 1;
    document.getElementById("total-images").textContent = this.images.length;
  }

  hideLoading() {
    this.loadingElement.style.display = "none";
  }

  showError(message) {
    this.loadingElement.style.display = "none";
    this.errorElement.style.display = "block";
    this.errorElement.textContent = message;
  }

  hideError() {
    this.errorElement.style.display = "none";
    this.errorElement.textContent = "";
  }
}

// ===== SMOOTH SCROLLING =====
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

// ===== INITIALIZE GALLERY ON PAGE LOAD =====
document.addEventListener("DOMContentLoaded", () => {
  new GalleryManager();
});
