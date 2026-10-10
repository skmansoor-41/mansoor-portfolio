(() => {
    "use strict";

    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
    const progressBar = document.getElementById("scrollProgress");
    const year = document.getElementById("currentYear");

    if (year) year.textContent = new Date().getFullYear();

    // Accessible mobile navigation
    const closeMenu = () => {
        if (!menuToggle || !navLinks) return;
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
        navLinks.classList.remove("open");
        document.body.classList.remove("menu-open");
    };

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
            menuToggle.setAttribute("aria-expanded", String(!isOpen));
            menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
            navLinks.classList.toggle("open", !isOpen);
            document.body.classList.toggle("menu-open", !isOpen);
        });

        navLinks.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });

        document.addEventListener("click", (event) => {
            if (!navLinks.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
        });
    }

    // Reading progress indicator
    const updateProgress = () => {
        if (!progressBar) return;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progressBar.style.width = Math.min(100, Math.max(0, progress)) + "%";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    // Reveal content as it enters the viewport, with a safe fallback
    const revealItems = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -25px 0px" });
        revealItems.forEach((item) => revealObserver.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    // Highlight the section currently being viewed in the navigation
    const sections = document.querySelectorAll("main section[id]");
    const sectionLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if ("IntersectionObserver" in window && sections.length && sectionLinks.length) {
        const activeObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                sectionLinks.forEach((link) => {
                    const active = link.getAttribute("href") === "#" + entry.target.id;
                    if (active) link.classList.add("active");
                    else link.classList.remove("active");
                });
            });
        }, { rootMargin: "-30% 0px -60% 0px" });
        sections.forEach((section) => activeObserver.observe(section));
    }
})();
