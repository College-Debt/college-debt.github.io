// Shared modal accessibility helpers (focus trapping & background inertness)
window.__cdA11y = window.__cdA11y || (function () {
    function getFocusable(container) {
        if (!container) return [];
        var selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function (el) {
            if (el.closest('[aria-hidden="true"]')) return false;
            var style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    function trapTab(e, container) {
        if (e.key !== 'Tab' || !container) return;
        var focusable = getFocusable(container);
        if (focusable.length === 0) {
            e.preventDefault();
            return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (!container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
            return;
        }
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function setBackgroundInert(modalEl, isInert) {
        var siteBlocks = document.querySelector('.wp-site-blocks');
        if (!siteBlocks) return;
        if (!isInert) {
            siteBlocks.inert = false;
            for (var i = 0; i < siteBlocks.children.length; i++) {
                siteBlocks.children[i].inert = false;
            }
            return;
        }
        if (modalEl && siteBlocks.contains(modalEl)) {
            for (var j = 0; j < siteBlocks.children.length; j++) {
                var child = siteBlocks.children[j];
                if (child !== modalEl && !child.contains(modalEl)) {
                    child.inert = true;
                }
            }
        } else {
            siteBlocks.inert = true;
        }
    }

    return {
        getFocusable: getFocusable,
        trapTab: trapTab,
        setBackgroundInert: setBackgroundInert
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    var openBtn = document.querySelector('.wp-block-navigation__responsive-container-open');
    var mobileModal = document.getElementById('site-mobile-nav-modal');
    var closeBtn = document.querySelector('.site-mobile-nav-close');
    var modalLinks = document.querySelectorAll('.site-mobile-nav-links a');
    var lastTrigger = null;

    // Dynamic header height synchronization
    function syncHeaderHeight() {
        var header = document.querySelector('.site-header-group');
        if (header) {
            var h = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--site-header-height', h + 'px');
        }
    }
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);

    function openMobileNav(triggerEl) {
        var personalizeModal = document.getElementById('site-personalize-modal');
        if (personalizeModal && personalizeModal.classList.contains('is-open')) {
            personalizeModal.classList.remove('is-open');
            personalizeModal.setAttribute('aria-hidden', 'true');
            document.querySelectorAll('.site-personalize-btn').forEach(function (b) {
                b.setAttribute('aria-expanded', 'false');
            });
        }
        var accountModal = document.getElementById('site-account-modal');
        if (accountModal && accountModal.classList.contains('is-open')) {
            accountModal.classList.remove('is-open');
            accountModal.setAttribute('aria-hidden', 'true');
            document.querySelectorAll('.site-account-btn').forEach(function (b) {
                b.setAttribute('aria-expanded', 'false');
            });
        }
        if (mobileModal) {
            lastTrigger = triggerEl || openBtn || document.activeElement;
            mobileModal.classList.add('is-open');
            mobileModal.setAttribute('aria-hidden', 'false');
            if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
            document.documentElement.classList.add('has-modal-open');
            document.body.classList.add('has-modal-open');
            window.__cdA11y.setBackgroundInert(mobileModal, true);
            if (closeBtn) {
                setTimeout(function () { closeBtn.focus(); }, 20);
            }
        }
    }

    function closeMobileNav(restoreFocus) {
        var wasOpen = mobileModal && mobileModal.classList.contains('is-open');
        if (mobileModal) {
            mobileModal.classList.remove('is-open');
            mobileModal.setAttribute('aria-hidden', 'true');
            if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
            document.documentElement.classList.remove('has-modal-open');
            document.body.classList.remove('has-modal-open');
            window.__cdA11y.setBackgroundInert(mobileModal, false);
        }
        if (wasOpen && restoreFocus && lastTrigger && lastTrigger.offsetParent !== null) {
            lastTrigger.focus();
        }
        lastTrigger = null;
    }

    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            openMobileNav(openBtn);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeMobileNav(true);
        });
    }

    modalLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMobileNav(false);
        });
    });

    if (mobileModal) {
        mobileModal.addEventListener('touchmove', function (e) {
            if (!e.target.closest('.site-mobile-nav-links')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    document.addEventListener('keydown', function (e) {
        if (!mobileModal || !mobileModal.classList.contains('is-open')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMobileNav(true);
        } else if (e.key === 'Tab') {
            window.__cdA11y.trapTab(e, mobileModal);
        }
    });

    // Sticky Header border on scroll
    function handleHeaderScroll() {
        var header = document.querySelector('.site-header-group');
        if (header) {
            if (window.scrollY > 0) {
                header.classList.add('is-scrolled');
            } else {
                header.classList.remove('is-scrolled');
            }
        }
    }
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll();
});
