document.addEventListener('DOMContentLoaded', function () {
    var openBtn = document.querySelector('.wp-block-navigation__responsive-container-open');
    var mobileModal = document.getElementById('site-mobile-nav-modal');
    var closeBtn = document.querySelector('.site-mobile-nav-close');
    var legacyModal = document.querySelector('.wp-block-navigation__responsive-container');
    var legacyCloseBtn = document.querySelector('.wp-block-navigation__responsive-container-close');
    var modalLinks = document.querySelectorAll('.site-mobile-nav-links a');

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

    function openMobileNav() {
        if (mobileModal) {
            mobileModal.classList.add('is-open');
            mobileModal.setAttribute('aria-hidden', 'false');
            document.documentElement.classList.add('has-modal-open');
            document.body.classList.add('has-modal-open');
        } else if (legacyModal) {
            legacyModal.classList.add('is-menu-open');
            document.documentElement.classList.add('has-modal-open');
        }
    }

    function closeMobileNav() {
        if (mobileModal) {
            mobileModal.classList.remove('is-open');
            mobileModal.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('has-modal-open');
            document.body.classList.remove('has-modal-open');
        }
        if (legacyModal) {
            legacyModal.classList.remove('is-menu-open');
            document.documentElement.classList.remove('has-modal-open');
        }
    }

    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            openMobileNav();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeMobileNav();
        });
    }

    if (legacyCloseBtn) {
        legacyCloseBtn.addEventListener('click', function () {
            closeMobileNav();
        });
    }

    modalLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMobileNav();
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeMobileNav();
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
