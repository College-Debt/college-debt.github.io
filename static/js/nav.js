document.addEventListener('DOMContentLoaded', function () {
    var openBtn = document.querySelector('.wp-block-navigation__responsive-container-open');
    var closeBtn = document.querySelector('.wp-block-navigation__responsive-container-close');
    var modal = document.querySelector('.wp-block-navigation__responsive-container');

    if (openBtn && modal) {
        openBtn.addEventListener('click', function () {
            modal.classList.add('is-menu-open');
            document.documentElement.classList.add('has-modal-open');
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function () {
            modal.classList.remove('is-menu-open');
            document.documentElement.classList.remove('has-modal-open');
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('is-menu-open')) {
            modal.classList.remove('is-menu-open');
            document.documentElement.classList.remove('has-modal-open');
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
