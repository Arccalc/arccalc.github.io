// Switch between the new design (index.html, the default) and the classic page (classic.html).
// The choice is remembered: a visitor who picked the classic design is sent there from index.html.
// index.html?classic opens the classic page and remembers that choice.
(function () {
    var classicPage = /classic\.html$/.test(location.pathname);
    try {
        if (classicPage) { localStorage.setItem('arcDesign', 'old'); return; }
        if (/[?&]classic\b/.test(location.search) || localStorage.getItem('arcDesign') === 'old') {
            localStorage.setItem('arcDesign', 'old');
            location.replace('classic.html' + location.hash);
        }
    } catch (e) { /* storage blocked: stay on this page */ }
})();

// Classic page: «Try the new design» link.
document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-design-switch]');
    if (!link) return;
    try { localStorage.setItem('arcDesign', 'new'); } catch (err) { /* ignore */ }
    try { if (typeof window.ym === 'function') window.ym(106994566, 'reachGoal', 'design_switch_new'); } catch (err) { /* ignore */ }
});
