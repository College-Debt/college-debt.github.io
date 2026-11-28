/**
 * College Debt SMP - Wiki Controller
 * Handles tabs, expandables, Table of Contents scroll highlight, mobile drawers,
 * and seamless client-side intra-wiki navigation with scroll/state preservation.
 */
document.addEventListener("DOMContentLoaded", function () {
  // --- Helpers for Normalizing Paths ---
  function normalizePath(p) {
    if (!p) return "";
    var cleaned = p.split("#")[0].split("?")[0];
    return cleaned.endsWith("/") ? cleaned : cleaned + "/";
  }

  // --- Sidebar State Preservation (Scroll & Open Subsections) ---
  var sidebar = document.querySelector(".wiki-sidebar-card");

  function saveOpenSections() {
    try {
      var openSections = [];
      document.querySelectorAll(".wiki-nav-subitems.is-open").forEach(function (sub) {
        var sec = sub.getAttribute("data-section");
        if (sec) openSections.push(sec);
      });
      sessionStorage.setItem("wiki_open_sections", JSON.stringify(openSections));
    } catch (e) {}
  }

  function saveSidebarScroll() {
    if (sidebar) {
      try {
        sessionStorage.setItem("wiki_sidebar_scroll", sidebar.scrollTop);
      } catch (e) {}
    }
  }

  if (sidebar) {
    var scrollTimeout;
    sidebar.addEventListener("scroll", function () {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveSidebarScroll, 80);
    }, { passive: true });

    // Initial save of current server-rendered open section
    saveOpenSections();
  }

  window.addEventListener("beforeunload", saveSidebarScroll);
  window.addEventListener("pagehide", saveSidebarScroll);

  // --- Subsections Toggle Handler ---
  function toggleSubsection(btn) {
    var li = btn.closest("li");
    if (!li) return;
    var sublist = li.querySelector(".wiki-nav-subitems");
    var chevron = btn.querySelector(".wiki-nav-chevron");
    if (!sublist) return;

    var isOpen = sublist.classList.contains("is-open");
    if (isOpen) {
      sublist.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (chevron) {
        chevron.classList.remove("fa-chevron-down");
        chevron.classList.add("fa-chevron-right");
      }
    } else {
      sublist.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      if (chevron) {
        chevron.classList.remove("fa-chevron-right");
        chevron.classList.add("fa-chevron-down");
      }
    }
    saveOpenSections();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".wiki-nav-toggle");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      toggleSubsection(btn);
    }
  });

  // --- Content Enhancements Initialization ---
  var tocObserver = null;
  var wikiTabsCounter = 0;

  function initWikiTabs() {
    document.querySelectorAll(".wiki-tabs").forEach(function (tabsContainer) {
      if (tabsContainer.querySelector(".wiki-tab-headers")) return; // already initialized
      var panels = tabsContainer.querySelectorAll(".wiki-tab-panel");
      if (panels.length === 0) return;

      wikiTabsCounter += 1;
      var tabSetId = "wiki-tabs-" + wikiTabsCounter;

      var headerRow = document.createElement("div");
      headerRow.className = "wiki-tab-headers";
      headerRow.setAttribute("role", "tablist");

      var buttons = [];

      function activateTab(activeIdx, shouldFocus) {
        buttons.forEach(function (b, idx) {
          var isSel = idx === activeIdx;
          b.classList.toggle("is-active", isSel);
          b.setAttribute("aria-selected", isSel ? "true" : "false");
          b.setAttribute("tabindex", isSel ? "0" : "-1");
        });
        panels.forEach(function (p, idx) {
          var isSel = idx === activeIdx;
          p.classList.toggle("is-active", isSel);
          p.hidden = !isSel;
        });
        if (shouldFocus && buttons[activeIdx]) {
          buttons[activeIdx].focus();
        }
      }

      panels.forEach(function (panel, index) {
        var title = panel.getAttribute("data-tab-title") || ("Tab " + (index + 1));
        var tabId = tabSetId + "-tab-" + index;
        var panelId = tabSetId + "-panel-" + index;

        panel.id = panelId;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tabId);
        panel.hidden = index !== 0;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = tabId;
        btn.className = "wiki-tab-btn" + (index === 0 ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-controls", panelId);
        btn.setAttribute("aria-selected", index === 0 ? "true" : "false");
        btn.setAttribute("tabindex", index === 0 ? "0" : "-1");
        btn.textContent = title;
        btn.addEventListener("click", function () {
          activateTab(index, false);
        });
        headerRow.appendChild(btn);
        buttons.push(btn);

        if (index === 0) {
          panel.classList.add("is-active");
        }
        var innerHeader = panel.querySelector(".wiki-tab-header");
        if (innerHeader) innerHeader.style.display = "none";
      });

      headerRow.addEventListener("keydown", function (e) {
        var idx = buttons.indexOf(document.activeElement);
        if (idx === -1) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          activateTab((idx + 1) % buttons.length, true);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          activateTab((idx - 1 + buttons.length) % buttons.length, true);
        } else if (e.key === "Home") {
          e.preventDefault();
          activateTab(0, true);
        } else if (e.key === "End") {
          e.preventDefault();
          activateTab(buttons.length - 1, true);
        }
      });

      tabsContainer.insertBefore(headerRow, tabsContainer.firstChild);
    });
  }

  function initWikiExpandables() {
    var allDetails = Array.from(document.querySelectorAll(".wiki-article-body details"));
    allDetails.forEach(function (det) {
      var summary = det.querySelector("summary");
      if (summary) {
        if (!summary.querySelector(".wiki-expandable-chevron")) {
          var chevron = document.createElement("span");
          chevron.className = "wiki-expandable-chevron";
          chevron.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 4 10 8 6 12"></polyline></svg>';
          summary.insertBefore(chevron, summary.firstChild);
        }

        if (!det.querySelector(".wiki-expandable-content")) {
          var contentWrapper = document.createElement("div");
          contentWrapper.className = "wiki-expandable-content";
          while (summary.nextSibling) {
            contentWrapper.appendChild(summary.nextSibling);
          }
          det.appendChild(contentWrapper);
        }
      }

      var next = det.nextElementSibling;
      var prev = det.previousElementSibling;
      if (next && next.tagName === "DETAILS") {
        det.classList.add("has-next-details");
      }
      if (prev && prev.tagName === "DETAILS") {
        det.classList.add("has-prev-details");
      }
    });
  }

  function cleanWikiTables() {
    document.querySelectorAll(".wiki-article-body table select").forEach(function (el) {
      el.remove();
    });
  }

  function initWikiTOC() {
    if (tocObserver) {
      tocObserver.disconnect();
      tocObserver = null;
    }

    cleanWikiTables();

    // Exclude headings within <details> (Expandables) from Table of Contents
    var detailsHeadings = document.querySelectorAll(".wiki-article-body details [id]");
    if (detailsHeadings.length > 0) {
      detailsHeadings.forEach(function (heading) {
        if (/^H[1-6]$/i.test(heading.tagName)) {
          var id = heading.id;
          var link = document.querySelector('#TableOfContents a[href="#' + CSS.escape(id) + '"]');
          if (link) {
            var li = link.closest("li");
            if (li) {
              var parentUl = li.parentElement;
              li.remove();
              while (parentUl && parentUl.id !== "TableOfContents" && parentUl.children.length === 0) {
                var grandParentLi = parentUl.closest("li");
                var nextParent = parentUl.parentElement;
                parentUl.remove();
                if (grandParentLi && grandParentLi.children.length === 0) {
                  grandParentLi.remove();
                }
                parentUl = nextParent;
              }
            }
          }
        }
      });
    }

    var remainingLinks = document.querySelectorAll("#TableOfContents a");
    var tocRail = document.querySelector(".wiki-toc-rail");
    if (tocRail) {
      var tocTitle = tocRail.querySelector(".wiki-toc-title");
      var tocNav = tocRail.querySelector("#TableOfContents");
      if (remainingLinks.length < 2) {
        if (tocTitle) tocTitle.style.display = "none";
        if (tocNav) tocNav.style.display = "none";
      } else {
        if (tocTitle) tocTitle.style.display = "";
        if (tocNav) tocNav.style.display = "";
      }
    }

    // Table of Contents active highlight on scroll
    if (remainingLinks.length > 0 && "IntersectionObserver" in window) {
      var headingTargets = [];
      remainingLinks.forEach(function (link) {
        var href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          var el = document.getElementById(decodeURIComponent(href.slice(1)));
          if (el) headingTargets.push({ el: el, link: link });
        }
      });

      if (headingTargets.length > 0) {
        tocObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              remainingLinks.forEach(function (l) { l.classList.remove("is-active"); });
              var active = headingTargets.find(function (item) { return item.el === entry.target; });
              if (active) active.link.classList.add("is-active");
            }
          });
        }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });

        headingTargets.forEach(function (item) { tocObserver.observe(item.el); });
      }
    }
  }

  function initWikiContent() {
    initWikiTabs();
    initWikiExpandables();
    initWikiTOC();
  }

  // Run initial content setup
  initWikiContent();

  // --- Seamless Client-Side Intra-Wiki Navigation ---
  var isNavigating = false;

  function updateSidebarActive(targetUrl) {
    if (!sidebar) return;
    var targetPath = normalizePath(new URL(targetUrl, window.location.origin).pathname);

    // Remove active state from old item & row
    sidebar.querySelectorAll(".wiki-nav-item.is-active, .wiki-nav-row.is-active").forEach(function (el) {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });

    var activeLink = null;
    sidebar.querySelectorAll(".wiki-nav-item").forEach(function (a) {
      if (normalizePath(a.getAttribute("href")) === targetPath) {
        activeLink = a;
      }
    });

    if (activeLink) {
      activeLink.classList.add("is-active");
      activeLink.setAttribute("aria-current", "page");
      var parentRow = activeLink.closest(".wiki-nav-row");
      if (parentRow) parentRow.classList.add("is-active");

      // Ensure enclosing subsection is open without closing other open sections
      var parentSub = activeLink.closest(".wiki-nav-subitems");
      if (parentSub) {
        parentSub.classList.add("is-open");
        var parentToggle = parentSub.previousElementSibling ? parentSub.previousElementSibling.querySelector(".wiki-nav-toggle") : null;
        if (parentToggle) {
          parentToggle.setAttribute("aria-expanded", "true");
          var chevron = parentToggle.querySelector(".wiki-nav-chevron");
          if (chevron) {
            chevron.classList.remove("fa-chevron-right");
            chevron.classList.add("fa-chevron-down");
          }
        }
      }

      // Smoothly ensure the active item is visible in view if offscreen
      var sbRect = sidebar.getBoundingClientRect();
      var aRect = activeLink.getBoundingClientRect();
      if (aRect.top < sbRect.top || aRect.bottom > sbRect.bottom) {
        activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      saveOpenSections();
      saveSidebarScroll();
    }
  }

  function navigateTo(url, pushHistory) {
    if (isNavigating) return;
    isNavigating = true;

    document.body.classList.add("wiki-is-navigating");

    fetch(url, { headers: { "X-Requested-With": "WikiNav" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");

        // 1. Update Document Title
        if (doc.title) {
          document.title = doc.title;
        }

        // 2. Replace Center Column (.wiki-content-wrapper)
        var newContent = doc.querySelector(".wiki-content-wrapper");
        var curContent = document.querySelector(".wiki-content-wrapper");
        if (newContent && curContent) {
          curContent.innerHTML = newContent.innerHTML;
        }

        // 3. Replace Table of Contents (.wiki-toc-rail)
        var newToc = doc.querySelector(".wiki-toc-rail");
        var curToc = document.querySelector(".wiki-toc-rail");
        if (newToc && curToc) {
          curToc.innerHTML = newToc.innerHTML;
        }

        // 4. Update Sidebar active states WITHOUT re-rendering or resetting scroll
        updateSidebarActive(url);

        // 5. Update browser history
        if (pushHistory) {
          history.pushState({ wikiUrl: url }, "", url);
        }

        // 6. Scroll window to top or to anchor
        var targetHash = new URL(url, window.location.origin).hash;
        if (targetHash) {
          try {
            var targetEl = document.getElementById(decodeURIComponent(targetHash.slice(1)));
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth" });
            } else {
              window.scrollTo({ top: 0, behavior: "instant" });
            }
          } catch (e) {
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        } else {
          window.scrollTo({ top: 0, behavior: "instant" });
        }

        // 7. Re-initialize interactive content
        initWikiContent();

        // 8. Close search overlay if open
        var searchModal = document.getElementById("site-search-modal");
        if (searchModal && searchModal.classList.contains("is-open")) {
          searchModal.classList.remove("is-open", "has-search-query", "is-typing", "using-keyboard");
          searchModal.setAttribute("aria-hidden", "true");
          document.documentElement.classList.remove("has-modal-open", "has-search-open");
          document.body.classList.remove("has-modal-open", "has-search-open");
          document.querySelectorAll(".site-search-btn").forEach(function (b) {
            b.setAttribute("aria-expanded", "false");
          });
          if (window.__cdA11y) window.__cdA11y.setBackgroundInert(searchModal, false);
        }

        // 9. Close mobile drawers if open
        closeAllDrawers(false);

        // 10. Announce route change and move focus to new article heading when not anchor-scrolling
        var announcer = document.getElementById("wiki-route-announcer");
        var pageTitle = document.querySelector(".wiki-content-wrapper .wiki-page-title");
        if (announcer) {
          var titleText = pageTitle ? pageTitle.textContent.trim() : document.title;
          announcer.textContent = "";
          setTimeout(function () {
            announcer.textContent = "Navigated to " + titleText;
          }, 30);
        }
        if (pageTitle && !targetHash) {
          pageTitle.setAttribute("tabindex", "-1");
          pageTitle.focus({ preventScroll: true });
        }
      })
      .catch(function (err) {
        console.warn("Wiki seamless navigation fallback to full load:", err);
        window.location.href = url;
      })
      .finally(function () {
        isNavigating = false;
        document.body.classList.remove("wiki-is-navigating");
      });
  }

  // Intercept click on internal wiki links
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link) return;

    // Ignore new tab, modifier keys, downloads
    if (link.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (link.hasAttribute("download")) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // Ignore purely hash-based links on the same page
    if (href.startsWith("#")) return;

    var url;
    try {
      url = new URL(link.href, window.location.origin);
    } catch (err) {
      return;
    }

    // Must be same origin and inside /wiki/
    if (url.origin !== window.location.origin) return;
    if (!url.pathname.startsWith("/wiki/")) return;

    // If clicking exact current page without hash, ignore
    if (url.pathname === window.location.pathname && !url.hash) {
      e.preventDefault();
      return;
    }

    // If same page with hash anchor, allow default browser hash navigation
    if (url.pathname === window.location.pathname && url.hash) {
      return;
    }

    e.preventDefault();
    navigateTo(url.href, true);
  });

  // Handle browser Back / Forward buttons
  window.addEventListener("popstate", function () {
    if (window.location.pathname.startsWith("/wiki/")) {
      navigateTo(window.location.href, false);
    }
  });

  // --- Mobile Sidebar & TOC Drawers ---
  var sidebarToggle = document.querySelector(".wiki-mobile-sidebar-toggle");
  var tocRail = document.querySelector(".wiki-toc-rail");

  function syncDrawerA11y() {
    var sbOpen = document.body.classList.contains("has-wiki-sidebar-open");
    var tocOpen = document.body.classList.contains("has-wiki-toc-open");
    if (sidebar) {
      var sbHidden = window.innerWidth <= 820 && !sbOpen;
      sidebar.inert = sbHidden;
      sidebar.setAttribute("aria-hidden", sbHidden ? "true" : "false");
    }
    if (tocRail) {
      var tocHidden = window.innerWidth <= 1100 && !tocOpen;
      tocRail.inert = tocHidden;
      tocRail.setAttribute("aria-hidden", tocHidden ? "true" : "false");
    }
  }

  function closeAllDrawers(restoreFocus) {
    var hadSidebar = document.body.classList.contains("has-wiki-sidebar-open");
    var hadToc = document.body.classList.contains("has-wiki-toc-open");
    document.body.classList.remove("has-wiki-sidebar-open", "has-wiki-toc-open");
    if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", "false");
    var tocToggle = document.querySelector(".wiki-mobile-toc-toggle");
    if (tocToggle) tocToggle.setAttribute("aria-expanded", "false");
    syncDrawerA11y();
    if (restoreFocus) {
      if (hadSidebar && sidebarToggle && sidebarToggle.offsetParent !== null) {
        sidebarToggle.focus();
      } else if (hadToc && tocToggle && tocToggle.offsetParent !== null) {
        tocToggle.focus();
      }
    }
  }

  function toggleSidebar() {
    var isOpen = document.body.classList.contains("has-wiki-sidebar-open");
    if (isOpen) {
      closeAllDrawers(true);
    } else {
      document.body.classList.remove("has-wiki-toc-open");
      var tocToggle = document.querySelector(".wiki-mobile-toc-toggle");
      if (tocToggle) tocToggle.setAttribute("aria-expanded", "false");
      var mobileNavModal = document.getElementById("site-mobile-nav-modal");
      if (mobileNavModal) {
        mobileNavModal.classList.remove("is-open");
        mobileNavModal.setAttribute("aria-hidden", "true");
      }
      document.documentElement.classList.remove("has-modal-open");
      document.body.classList.remove("has-modal-open");
      document.body.classList.add("has-wiki-sidebar-open");
      if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", "true");
      syncDrawerA11y();
      if (sidebar) {
        var firstItem = sidebar.querySelector(".wiki-nav-item.is-active, .wiki-nav-item");
        if (firstItem) setTimeout(function () { firstItem.focus({ preventScroll: true }); }, 20);
      }
    }
  }

  function toggleTOC() {
    var isOpen = document.body.classList.contains("has-wiki-toc-open");
    var tocToggle = document.querySelector(".wiki-mobile-toc-toggle");
    if (isOpen) {
      closeAllDrawers(true);
    } else {
      document.body.classList.remove("has-wiki-sidebar-open");
      if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", "false");
      var mobileNavModal = document.getElementById("site-mobile-nav-modal");
      if (mobileNavModal) {
        mobileNavModal.classList.remove("is-open");
        mobileNavModal.setAttribute("aria-hidden", "true");
      }
      document.documentElement.classList.remove("has-modal-open");
      document.body.classList.remove("has-modal-open");
      document.body.classList.add("has-wiki-toc-open");
      if (tocToggle) tocToggle.setAttribute("aria-expanded", "true");
      syncDrawerA11y();
      if (tocRail) {
        var closeBtn = tocRail.querySelector(".wiki-toc-close");
        var firstLink = tocRail.querySelector("#TableOfContents a");
        var target = closeBtn || firstLink;
        if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 20);
      }
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  // Delegated listeners for TOC toggle and close (robust across content replacement)
  document.addEventListener("click", function (e) {
    var tocBtn = e.target.closest(".wiki-mobile-toc-toggle");
    if (tocBtn) {
      e.stopPropagation();
      toggleTOC();
      return;
    }

    var tocClose = e.target.closest(".wiki-toc-close");
    if (tocClose) {
      e.stopPropagation();
      closeAllDrawers(true);
      return;
    }
  });

  var backdrop = document.querySelector(".wiki-drawer-backdrop");
  if (backdrop) {
    backdrop.addEventListener("touchmove", function (e) {
      e.preventDefault();
    }, { passive: false });
    backdrop.addEventListener("click", function () {
      closeAllDrawers(true);
    });
  }

  // Dismiss drawers on Escape key and trap Tab inside TOC drawer
  document.addEventListener("keydown", function (e) {
    var sbOpen = document.body.classList.contains("has-wiki-sidebar-open");
    var tocOpen = document.body.classList.contains("has-wiki-toc-open");
    if (!sbOpen && !tocOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeAllDrawers(true);
    } else if (e.key === "Tab" && tocOpen && tocRail && window.__cdA11y) {
      window.__cdA11y.trapTab(e, tocRail);
    }
  });

  // Close drawers if viewport is resized beyond mobile/tablet widths
  window.addEventListener("resize", function () {
    if (window.innerWidth > 820 && document.body.classList.contains("has-wiki-sidebar-open")) {
      document.body.classList.remove("has-wiki-sidebar-open");
      if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", "false");
    }
    if (window.innerWidth > 1100 && document.body.classList.contains("has-wiki-toc-open")) {
      document.body.classList.remove("has-wiki-toc-open");
      var tocToggle = document.querySelector(".wiki-mobile-toc-toggle");
      if (tocToggle) tocToggle.setAttribute("aria-expanded", "false");
    }
    syncDrawerA11y();
  });

  syncDrawerA11y();
});
