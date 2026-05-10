/**
 * OSINT Library - Utilities for reverse image search operations
 * @module osint-lib
 */

// UMD-ish small pure helpers used by the browser app + node tests.
(() => {
  /**
   * Generates a reverse search URL for a given engine and image URL
   * @param {string} engine - Search engine name (lens, bing, tineye, yandex, pinterest, saucenao, iqdb, baidu, ascii2d, google_images)
   * @param {string} imageUrl - Public URL of the image
   * @returns {string} Reverse search URL or empty string if engine not supported
   */
  const reverseSearchUrl = (engine, imageUrl) => {
    const u = encodeURIComponent(imageUrl);
    switch (engine) {
      case "lens":
        return `https://lens.google.com/uploadbyurl?url=${u}`;
      case "bing":
        return `https://www.bing.com/images/search?q=imgurl:${u}&view=detailv2&iss=sbi`;
      case "tineye":
        return `https://tineye.com/search?url=${u}`;
      case "yandex":
        return `https://yandex.com/images/search?rpt=imageview&url=${u}`;
      case "pinterest":
        return `https://www.pinterest.com/search/pins/?q=${u}`;
      case "saucenao":
        return `https://saucenao.com/search.php?url=${u}`;
      case "iqdb":
        return `https://iqdb.org/?url=${u}`;
      case "baidu":
        return `https://image.baidu.com/n/pc_search?queryImageUrl=${u}`;
      case "ascii2d":
        return `https://ascii2d.net/search/url/${u}`;
      case "google_images":
        return `https://www.google.com/searchbyimage?image_url=${u}`;
      default:
        return "";
    }
  };

  /**
   * Returns the manual upload page URL for a search engine
   * @param {string} engine - Search engine name
   * @returns {string} Upload page URL or "about:blank" if not supported
   */
  const reverseSearchUploadPage = (engine) => {
    switch (engine) {
      case "lens":
        return "https://lens.google.com/upload";
      case "bing":
        return "https://www.bing.com/visualsearch";
      case "tineye":
        return "https://tineye.com/";
      case "yandex":
        return "https://yandex.com/images/";
      case "pinterest":
        return "https://www.pinterest.com/";
      case "saucenao":
        return "https://saucenao.com/";
      case "iqdb":
        return "https://iqdb.org/";
      case "baidu":
        return "https://image.baidu.com/";
      case "ascii2d":
        return "https://ascii2d.net/";
      case "google_images":
        return "https://images.google.com/";
      default:
        return "about:blank";
    }
  };

  const api = { reverseSearchUrl, reverseSearchUploadPage };

  try {
    // Browser global
    if (typeof window !== "undefined") window.OSINT_LIB = api;
  } catch {
    // ignore
  }

  try {
    // Node export for tests
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch {
    // ignore
  }
})();
