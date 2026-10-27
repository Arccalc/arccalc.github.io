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

// Classic page: the same design vote as on index.html (shared arcDesignVote, same Metrika goals).
// Shown to everyone who has not voted; «Not now» asks again after a minute; never over the tour offer or a tour.
(function () {
    if (!/classic\.html$/.test(location.pathname)) return;
    var KEY = 'arcDesignVote', AGAIN = 60 * 1000, PAUSE = 20 * 1000;
    var box = null, shown = false, freeSince = 0;
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    var write = function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } };
    var goal = function (name, params) {
        if (typeof window.ym !== 'function') return;
        try { window.ym(106994566, 'reachGoal', name); if (params) window.ym(106994566, 'params', params); } catch (e) { /* ignore */ }
    };
    var tx = function (k) { return typeof t === 'function' ? t(k) : k; };
    // free = no tour offer on screen and no tour running
    var busy = function () {
        var nudge = document.getElementById('tour-nudge');
        return (nudge && !nudge.hidden) || (window.ArcTour && window.ArcTour.isRunning());
    };
    function hide() { if (box) { box.remove(); box = null; } }
    function show() {
        if (read().voted || box) return;
        box = document.createElement('div');
        box.id = 'design-vote';
        box.className = 'tour-nudge';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-labelledby', 'design-vote-t');
        box.innerHTML = '<p><strong id="design-vote-t"></strong><br><span></span></p><div class="tour-nudge-actions">' +
            '<button type="button" data-vote="old"></button><button type="button" data-vote="new"></button><button type="button" data-vote="later"></button></div>';
        box.querySelector('strong').textContent = tx('ndVoteTitle');
        box.querySelector('span').textContent = tx('ndVoteText');
        box.querySelector('[data-vote="old"]').textContent = tx('ndVoteOld');
        box.querySelector('[data-vote="new"]').textContent = tx('ndVoteNew');
        box.querySelector('[data-vote="later"]').textContent = tx('ndVoteLater');
        box.addEventListener('click', function (e) {
            var v = e.target.getAttribute && e.target.getAttribute('data-vote');
            if (!v) return;
            if (v === 'later') {
                write({ later: Date.now() });
                goal('design_vote_later');
                hide();
                setTimeout(wait, AGAIN);
                return;
            }
            write({ voted: v, at: Date.now() });
            goal(v === 'new' ? 'design_vote_new' : 'design_vote_old', { design_vote: v });
            box.innerHTML = '<p style="margin: 0"></p>';
            box.firstChild.textContent = tx('ndVoteThanks');
            setTimeout(hide, 2500);
        });
        document.body.appendChild(box);
        if (!shown) { shown = true; goal('design_vote_shown'); }
        setTimeout(watch, 1000);
    }
    // a tour started while the vote is up: hide it and ask again after the tour
    function watch() {
        if (!box) return;
        if (busy()) { hide(); freeSince = 0; wait(); return; }
        setTimeout(watch, 1000);
    }
    // the vote waits PAUSE after the tour offer closes or a tour ends
    function wait() {
        if (read().voted) return;
        if (busy()) { freeSince = 0; hide(); setTimeout(wait, 1000); return; }
        if (!freeSince) freeSince = Date.now();
        if (Date.now() - freeSince < PAUSE && freeSince > start) { setTimeout(wait, 1000); return; }
        show();
    }
    var start = 0;
    function begin() {
        var v = read();
        if (v.voted) return;
        start = Date.now();
        var again = v.later ? v.later + AGAIN - Date.now() : 0;
        setTimeout(function () { freeSince = busy() ? 0 : start; wait(); }, Math.max(8000, again));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin);
    else begin();
})();
