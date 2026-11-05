document.addEventListener("DOMContentLoaded", function () {
  // Tabs initialization
  document.querySelectorAll(".wiki-tabs").forEach(function (tabsContainer) {
    var panels = tabsContainer.querySelectorAll(".wiki-tab-panel");
    if (panels.length === 0) return;

    var headerRow = document.createElement("div");
    headerRow.className = "wiki-tab-headers";

    panels.forEach(function (panel, index) {
      var title = panel.getAttribute("data-tab-title") || ("Tab " + (index + 1));
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wiki-tab-btn" + (index === 0 ? " is-active" : "");
      btn.textContent = title;
      btn.addEventListener("click", function () {
        headerRow.querySelectorAll(".wiki-tab-btn").forEach(function (b) { b.classList.remove("is-active"); });
        panels.forEach(function (p) { p.classList.remove("is-active"); });
        btn.classList.add("is-active");
        panel.classList.add("is-active");
      });
      headerRow.appendChild(btn);

      if (index === 0) {
        panel.classList.add("is-active");
      }
      var innerHeader = panel.querySelector(".wiki-tab-header");
      if (innerHeader) innerHeader.style.display = "none";
    });

    tabsContainer.insertBefore(headerRow, tabsContainer.firstChild);
  });

  // GitBook Expandables (<details>): wrap content, inject centered SVG chevron, and mark chain neighbors
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

  // Remove leftover <select> tags from tables
  document.querySelectorAll(".wiki-article-body table select").forEach(function (el) {
    el.remove();
  });

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

    var remainingLinks = document.querySelectorAll("#TableOfContents a");
    var tocRail = document.querySelector(".wiki-toc-rail");
    if (remainingLinks.length < 2 && tocRail) {
      var tocTitle = tocRail.querySelector(".wiki-toc-title");
      var tocNav = tocRail.querySelector("#TableOfContents");
      if (tocTitle) tocTitle.style.display = "none";
      if (tocNav) tocNav.style.display = "none";
    }
  }

  // Table of Contents active highlight on scroll
  var tocLinks = document.querySelectorAll("#TableOfContents a");
  if (tocLinks.length > 0) {
    var headingTargets = [];
    tocLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        var el = document.getElementById(decodeURIComponent(href.slice(1)));
        if (el) headingTargets.push({ el: el, link: link });
      }
    });

    if (headingTargets.length > 0 && "IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tocLinks.forEach(function (l) { l.classList.remove("is-active"); });
            var active = headingTargets.find(function (item) { return item.el === entry.target; });
            if (active) active.link.classList.add("is-active");
          }
        });
      }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });

      headingTargets.forEach(function (item) { observer.observe(item.el); });
    }
  }

  // Sidebar collapsible subpages toggle
  document.querySelectorAll(".wiki-nav-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
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
    });
  });
});

