/* Страница загрузки StashSync. Пусто — бейдж и ссылка в туре не меняются. */
const HELPER_URL = 'https://github.com/Arccalc/StashSync/releases/latest';

(function () {
    const A = () => window.__arcTourApi;
    const STEPS = {
        start: [
            { key: 'tourStart1', at: ['goals-search', 'goals-category'], enter() { A().showTab('.tab-btn', 'craft-goals'); }, until() { return !!(document.getElementById('search-input')?.value.trim() || document.querySelector('#items-container .items-list-content:not(.collapsed)')); } },
            { key: 'tourStart2', at: ['goals-item-add', 'goals-tier'], enter() { A().openDemoPlus(); }, until() { return A().goalQty() > 0; } },
            { key: 'tourStart3', at: ['totals-craft', 'totals-raw'], enter() { A().revealGoalTotals(); } },
            { key: 'tourStartColors', at: ['totals-craft', 'totals-raw'] },
            { key: 'tourStartRecipe', at: ['totals-recipe', 'totals-recipe-body'], enter() { A().openRecipe(); } },
            { key: 'tourStart4', at: 'tab-inventory', until() { return !!document.querySelector('.tab-btn[data-tab="inventory-input"].active'); } },
            { key: 'tourStart5', at: 'inventory-demo', enter(run) { const before = A().invJson(); A().addDemoPart(); run.mark = before; }, until(run) { return A().invJson() !== run.mark; } },
            { key: 'tourStart7', at: ['tour-download', 'sync-badge'], help: true, showSync: true, enter() { A().markDownload(); } },
            { key: 'tourStart6', at: 'stock-toggle', enter() { A().showTab('.out-tab-btn', 'output-totals'); } },
            { key: 'tourStartDone' }
        ],
        loadouts: [
            { key: 'tourLoad1', at: 'tab-loadouts', until() { return !!document.querySelector('.tab-btn[data-tab="loadouts"].active'); } },
            { key: 'tourLoad2', at: 'loadout-slots', enter() { A().showLoadoutSlots(); } },
            { key: 'tourLoad3', at: ['loadout-save', 'loadout-list'], enter() { A().playLoadoutDemo(); } },
            { key: 'tourLoad4', at: ['loadout-qty', 'totals-loadout', 'totals-raw'], enter() { A().showLoadoutCost(); } },
            { key: 'tourLoadSync', at: ['tour-download', 'sync-badge'], help: true, showSync: true, enter() { A().markDownload(); } },
            { key: 'tourLoadDone' }
        ],
        recycler: [
            { key: 'tourRec1', at: 'totals-material', enter(run) { A().ensureShortage(); run.mark = A().pinCount(); }, until(run) { return A().pinCount() > run.mark; } },
            { key: 'tourRec2', at: 'recycler-card', enter() { A().openRecyclerDemo(); } },
            { key: 'tourRec3', at: 'recycler-search' },
            { key: 'tourRecDone' }
        ]
    };

    const DANGER = '#reset-button,#reset-inventory-btn,#clear-loadout-btn,.delete-saved-btn,.recycler-card-x,.recycler-clear';
    let run = null;
    const dim = document.createElement('div');
    dim.className = 'tour-dim';
    const rings = document.createElement('div');
    rings.className = 'tour-rings';
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.tabIndex = -1;
    card.setAttribute('role', 'dialog');
    card.innerHTML = '<span class="tour-card-arrow" aria-hidden="true"></span><p class="tour-step"></p><button type="button" class="tour-x">×</button><p class="tour-text" aria-live="polite"></p><a class="tour-helper" target="_blank" rel="noopener" hidden></a><div class="tour-actions"><button type="button" class="tour-back"></button><button type="button" class="tour-next"></button></div><button type="button" class="tour-skip"></button>';
    const stepEl = card.querySelector('.tour-step');
    const textEl = card.querySelector('.tour-text');
    const helpEl = card.querySelector('.tour-helper');
    const backBtn = card.querySelector('.tour-back');
    const nextBtn = card.querySelector('.tour-next');
    const skipBtn = card.querySelector('.tour-skip');
    const xBtn = card.querySelector('.tour-x');
    const menu = document.getElementById('tour-menu');
    const nudge = document.getElementById('tour-nudge');

    const tr = (key, vars) => (typeof t === 'function' ? t(key, vars) : key);

    function idsOf(step) {
        if (!step.at) return [];
        return Array.isArray(step.at) ? step.at : [step.at];
    }

    function nodesOf(step) {
        return idsOf(step).map(id => document.querySelector(`[data-tour="${id}"]`)).filter(node => {
            if (!node) return false;
            const r = node.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
        });
    }

    function outside(node) {
        const r = node.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return true;
        let el = node.parentElement;
        while (el) {
            const style = getComputedStyle(el);
            const oy = style.overflowY;
            const ox = style.overflowX;
            if (oy === 'auto' || oy === 'scroll' || ox === 'auto' || ox === 'scroll') {
                const p = el.getBoundingClientRect();
                if (r.top < p.top + 6 || r.bottom > p.bottom - 6 || r.left < p.left || r.right > p.right) return true;
            }
            el = el.parentElement;
        }
        const dock = window.innerWidth <= 600 ? 140 : 8;
        return r.top < 8 || r.bottom > window.innerHeight - dock || r.left < 0 || r.right > window.innerWidth;
    }

    function reserveBottom() {
        const dock = window.innerWidth <= 600 || card.classList.contains('tour-card-dock');
        if (!dock) return 8;
        const h = card.classList.contains('tour-card-dock') ? Math.round(card.getBoundingClientRect().height) : 0;
        return Math.max(12, h + 12);
    }

    function prepareDock() {
        if (window.innerWidth > 600 || card.classList.contains('tour-card-dock')) return;
        card.style.left = '';
        card.style.top = '';
        card.classList.remove('tour-card-center', 'tour-arrow-top', 'tour-arrow-bottom', 'tour-arrow-left', 'tour-arrow-right');
        card.classList.add('tour-card-dock');
    }

    function reservePage() {
        const dock = window.innerWidth <= 600 || card.classList.contains('tour-card-dock');
        const next = dock ? (reserveBottom() + 8) + 'px' : '';
        if (document.body.style.paddingBottom !== next) document.body.style.paddingBottom = next;
    }

    function liftIntoView(nodes) {
        if (!nodes.length) return false;
        if (window.innerWidth > 600 && !card.classList.contains('tour-card-dock')) return false;
        const limit = window.innerHeight - reserveBottom();
        let moved = false;
        for (let pass = 0; pass < 4; pass++) {
            let passMoved = false;
            nodes.forEach(node => {
                let el = node.parentElement;
                while (el) {
                    const oy = getComputedStyle(el).overflowY;
                    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
                        const port = el.getBoundingClientRect();
                        const r = node.getBoundingClientRect();
                        const viewTop = Math.max(port.top, 8);
                        const viewBottom = Math.min(port.bottom, limit);
                        const room = viewBottom - viewTop;
                        let delta = 0;
                        if (r.top < viewTop - 1) delta = Math.round(r.top - viewTop);
                        else if (r.height >= room * 0.92) {
                            if (r.top > viewTop + 4) delta = Math.round(r.top - viewTop);
                        } else if (r.bottom > viewBottom + 1) delta = Math.round(r.bottom - viewBottom);
                        if (Math.abs(delta) > 2) {
                            const before = el.scrollTop;
                            const max = el.scrollHeight - el.clientHeight;
                            el.scrollTop = Math.max(0, Math.min(max, before + delta));
                            if (el.scrollTop !== before) passMoved = true;
                        }
                    }
                    el = el.parentElement;
                }
            });
            const rects = nodes.map(node => node.getBoundingClientRect());
            const top = Math.min.apply(null, rects.map(r => r.top));
            const bottom = Math.max.apply(null, rects.map(r => r.bottom));
            const room = limit - 12;
            let delta = 0;
            if (top < 8) delta = Math.round(top - 12);
            else if (bottom - top >= room * 0.92) {
                if (top > 16) delta = Math.round(top - 12);
            } else if (bottom > limit + 1) delta = Math.round(bottom - limit);
            if (Math.abs(delta) > 2) {
                const before = window.scrollY;
                window.scrollBy(0, delta);
                if (window.scrollY !== before) passMoved = true;
            }
            if (!passMoved) break;
            moved = true;
        }
        return moved;
    }

    function clipToSafe(rects) {
        if (window.innerWidth > 600 && !card.classList.contains('tour-card-dock')) return rects;
        const limit = window.innerHeight - reserveBottom();
        const out = [];
        rects.forEach(r => {
            const top = Math.max(0, r.top);
            const bottom = Math.min(limit, r.top + r.height);
            if (bottom - top < 4 || r.width < 4) return;
            out.push({ left: r.left, top: top, width: r.width, height: bottom - top });
        });
        return out;
    }

    function ensureSeen(nodes) {
        if (window.innerWidth <= 600 || card.classList.contains('tour-card-dock')) {
            liftIntoView(nodes);
            return;
        }
        if (!nodes.some(outside)) return;
        const target = nodes.slice().sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
        const row = target.closest('.item-row') || target;
        const box = nodes.reduce((acc, node) => {
            const r = node.getBoundingClientRect();
            return { top: Math.min(acc.top, r.top), bottom: Math.max(acc.bottom, r.bottom) };
        }, { top: Infinity, bottom: -Infinity });
        const room = window.innerHeight - 24;
        const tall = box.bottom - box.top > room * 0.72;
        row.style.scrollMarginTop = '12px';
        row.style.scrollMarginBottom = '12px';
        row.scrollIntoView({ block: tall ? 'start' : 'center', inline: 'nearest', behavior: 'auto' });
    }

    function pad(node) {
        const r = node.getBoundingClientRect();
        const p = 6;
        return {
            left: Math.round(r.left - p),
            top: Math.round(r.top - p),
            width: Math.round(r.width + p * 2),
            height: Math.round(r.height + p * 2)
        };
    }

    function hit(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function syncRings(rects) {
        while (rings.children.length > rects.length) rings.lastChild.remove();
        rects.forEach((r, i) => {
            let ring = rings.children[i];
            if (!ring) {
                ring = document.createElement('div');
                ring.className = 'tour-ring';
                rings.appendChild(ring);
            }
            ring.style.left = r.left + 'px';
            ring.style.top = r.top + 'px';
            ring.style.width = r.width + 'px';
            ring.style.height = r.height + 'px';
        });
    }

    function clip(rects) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        let d = `M0 0H${w}V${h}H0Z`;
        rects.forEach(r => {
            const x = Math.max(0, r.left);
            const y = Math.max(0, r.top);
            const x2 = Math.min(w, r.left + r.width);
            const y2 = Math.min(h, r.top + r.height);
            if (x2 > x && y2 > y) d += `M${x} ${y}H${x2}V${y2}H${x}Z`;
        });
        dim.style.clipPath = `path(evenodd, "${d}")`;
    }

    function freeze(rects) {
        const want = new Set();
        if (rects.length) {
            document.querySelectorAll(DANGER).forEach(node => {
                const b = node.getBoundingClientRect();
                const box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
                const cover = rects.some(r => hit(box, { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height }));
                if (cover) want.add(node);
            });
        }
        document.querySelectorAll('[data-tour-freeze]').forEach(node => {
            if (want.has(node)) return;
            node.disabled = false;
            node.removeAttribute('data-tour-freeze');
        });
        want.forEach(node => {
            if (node.getAttribute('data-tour-freeze') === '1') return;
            node.disabled = true;
            node.setAttribute('data-tour-freeze', '1');
        });
    }

    function dockCard() {
        card.style.left = '';
        card.style.top = '';
        card.classList.add('tour-card-dock');
        if (run) run.anchor = 'dock';
    }

    function place(rects) {
        card.classList.remove('tour-card-center', 'tour-card-dock', 'tour-arrow-top', 'tour-arrow-bottom', 'tour-arrow-left', 'tour-arrow-right');
        if (window.innerWidth <= 600) {
            dockCard();
            return;
        }
        if (!rects.length) {
            card.style.left = '';
            card.style.top = '';
            card.classList.add('tour-card-center');
            if (run) run.anchor = 'center';
            return;
        }
        const union = rects.reduce((acc, r) => ({
            left: Math.min(acc.left, r.left),
            top: Math.min(acc.top, r.top),
            right: Math.max(acc.right, r.left + r.width),
            bottom: Math.max(acc.bottom, r.top + r.height)
        }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        const cw = card.offsetWidth;
        const ch = card.offsetHeight;
        const gap = 12;
        const lang = document.querySelector('.lang-switcher')?.getBoundingClientRect();
        const fits = (box) => box.left >= 8 && box.top >= 8 && box.right <= window.innerWidth - 8 && box.bottom <= window.innerHeight - 8 && !hit(box, union) && !(lang && hit(box, lang));
        if (run && run.anchor && run.anchor !== 'dock' && run.anchor !== 'center') {
            const old = { left: run.anchor.left, top: run.anchor.top, right: run.anchor.left + cw, bottom: run.anchor.top + ch };
            if (fits(old)) {
                card.style.left = run.anchor.left + 'px';
                card.style.top = run.anchor.top + 'px';
                card.classList.add(run.anchor.a);
                return;
            }
        }
        const spots = [
            { x: union.left, y: union.bottom + gap, a: 'tour-arrow-top' },
            { x: union.left, y: union.top - ch - gap, a: 'tour-arrow-bottom' },
            { x: union.right + gap, y: union.top, a: 'tour-arrow-left' },
            { x: union.left - cw - gap, y: union.top, a: 'tour-arrow-right' }
        ];
        let best = null;
        spots.forEach(spot => {
            const left = Math.max(8, Math.min(Math.round(spot.x), window.innerWidth - cw - 8));
            const top = Math.max(8, Math.min(Math.round(spot.y), window.innerHeight - ch - 8));
            const box = { left, top, right: left + cw, bottom: top + ch, a: spot.a };
            if (!fits(box)) return;
            const score = Math.abs(left - spot.x) + Math.abs(top - spot.y);
            if (!best || score < best.score) best = { left, top, a: spot.a, score };
        });
        if (!best) {
            dockCard();
            return;
        }
        card.style.left = best.left + 'px';
        card.style.top = best.top + 'px';
        card.classList.add(best.a);
        run.anchor = { left: best.left, top: best.top, a: best.a };
    }

    function paint() {
        if (!run) return;
        const step = run.steps[run.i];
        card.setAttribute('aria-label', tr('tourAria'));
        stepEl.textContent = tr('tourStep', { n: run.i + 1, m: run.steps.length });
        textEl.textContent = run.missing ? tr('tourMissing') : tr(step.key);
        backBtn.textContent = tr('tourBack');
        nextBtn.textContent = tr('tourNext');
        skipBtn.textContent = tr('tourSkip');
        xBtn.setAttribute('aria-label', tr('tourClose'));
        if (HELPER_URL && step.help) {
            helpEl.hidden = false;
            helpEl.href = HELPER_URL;
            helpEl.textContent = tr('tourHelperPage');
        } else {
            helpEl.hidden = true;
            helpEl.removeAttribute('href');
        }
    }

    function frame() {
        if (!run) return;
        const step = run.steps[run.i];
        const badge = document.getElementById('auto-sync-status');
        if (badge) badge.classList.toggle('tour-show-sync', !!step.showSync);
        if (window.innerWidth <= 600) prepareDock();
        reservePage();
        let nodes = nodesOf(step);
        if (step.at && nodes.length >= idsOf(step).length) {
            if (!run.scrolled) {
                run.scrolled = true;
                ensureSeen(nodes);
                nodes = nodesOf(step);
                run.geom = '';
            } else if (card.classList.contains('tour-card-dock') && liftIntoView(nodes)) {
                nodes = nodesOf(step);
                run.geom = '';
            }
        }
        const lang = document.querySelector('.lang-switcher');
        const langRect = lang && lang.getBoundingClientRect().width > 1 ? [pad(lang)] : [];
        let rects = [];
        let mode = 'wait';
        if (!step.at) {
            run.missing = false;
            mode = 'clear';
        } else if (nodes.length >= idsOf(step).length) {
            run.missing = false;
            rects = clipToSafe(nodes.map(pad));
            mode = 'spot';
        } else if (performance.now() - run.t0 > 3000) {
            run.missing = true;
            mode = 'missing';
        }
        const dockH = card.classList.contains('tour-card-dock') ? Math.round(card.getBoundingClientRect().height) : 0;
        const geom = mode + ':' + window.innerWidth + 'x' + window.innerHeight + ':' + rects.map(r => r.left + ',' + r.top + ',' + r.width + ',' + r.height).join(';') + '|lang:' + langRect.map(r => r.left + ',' + r.top + ',' + r.width + ',' + r.height).join(';') + '|dock:' + dockH;
        if (geom !== run.geom) {
            run.geom = geom;
            run.holes = rects;
            if (mode === 'missing') {
                dim.hidden = true;
                syncRings([]);
                freeze([]);
                place([]);
            } else if (mode === 'spot') {
                dim.hidden = false;
                clip(rects.concat(langRect));
                syncRings(rects);
                freeze(rects);
                place(rects);
            } else if (mode === 'clear') {
                dim.hidden = false;
                clip(langRect);
                syncRings([]);
                freeze([]);
                place([]);
            } else {
                dim.hidden = false;
                clip(langRect);
                syncRings([]);
                place([]);
            }
        }
        if (run.missing) textEl.textContent = tr('tourMissing');
        else if (textEl.dataset.miss === '1') textEl.textContent = tr(step.key);
        textEl.dataset.miss = run.missing ? '1' : '';
        run.raf = requestAnimationFrame(frame);
    }

    function poke(e) {
        if (!run || !run.arm || run.hold) return;
        const step = run.steps[run.i];
        if (!step.until) return;
        if (e && e.target && e.target.nodeType === 1 && card.contains(e.target)) return;
        if (!step.until(run)) {
            clearTimeout(run.timer);
            return;
        }
        clearTimeout(run.timer);
        run.timer = setTimeout(() => {
            if (run && run.arm && run.steps[run.i].until && run.steps[run.i].until(run)) go(run.i + 1);
        }, 400);
    }

    function go(i) {
        if (!run) return;
        clearTimeout(run.timer);
        if (i < 0) i = 0;
        if (i >= run.steps.length) {
            stop();
            return;
        }
        run.i = i;
        run.arm = false;
        run.missing = false;
        run.scrolled = false;
        run.t0 = performance.now();
        run.holes = [];
        run.geom = '';
        run.anchor = null;
        textEl.dataset.miss = '';
        const step = run.steps[i];
        run.hold = true;
        try { if (step.enter) step.enter(run); } catch (e) {}
        run.hold = false;
        paint();
        card.focus({ preventScroll: true });
        setTimeout(() => { if (run && run.i === i) run.arm = true; }, 0);
    }

    function allowed(e) {
        if (!run || run.hold || run.missing) return true;
        const node = e.target && e.target.nodeType === 1 ? e.target : null;
        if (node && (card.contains(node) || node.closest('.lang-switcher'))) return true;
        const x = e.clientX;
        const y = e.clientY;
        return (run.holes || []).some(h => x >= h.left && y >= h.top && x <= h.left + h.width && y <= h.top + h.height);
    }

    function guard(e) {
        if (allowed(e)) return;
        if (e.type !== 'touchstart' && e.pointerType !== 'touch') e.preventDefault();
        e.stopPropagation();
    }

    function listen(on) {
        const fn = on ? 'addEventListener' : 'removeEventListener';
        ['pointerdown', 'mousedown', 'click', 'touchstart'].forEach(type => document[fn](type, guard, true));
        ['arc:state', 'input', 'change', 'click'].forEach(type => document[fn](type, poke));
    }

    function unfreeze() {
        document.querySelectorAll('[data-tour-freeze]').forEach(node => {
            node.disabled = false;
            node.removeAttribute('data-tour-freeze');
        });
        const badge = document.getElementById('auto-sync-status');
        if (badge) badge.classList.remove('tour-show-sync');
    }

    function teardown() {
        if (!run) return;
        clearTimeout(run.timer);
        cancelAnimationFrame(run.raf);
        listen(false);
        dim.remove();
        rings.remove();
        card.remove();
        card.style.left = '';
        card.style.top = '';
        document.body.classList.remove('tour-on');
        document.body.style.paddingBottom = '';
        unfreeze();
        run = null;
    }

    function readLs() {
        const ls = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('arcRaiders') || key === 'arcRaidersLang') continue;
            ls[key] = localStorage.getItem(key);
        }
        return ls;
    }

    function start(id) {
        if (!STEPS[id] || !A()) return;
        if (run) stop();
        closeMenu();
        const snap = { ls: readLs(), mem: A().mem() };
        try { localStorage.setItem('arcTourBackup', JSON.stringify(snap)); } catch (e) { return; }
        window.__arcTourActive = true;
        run = { id, i: 0, steps: STEPS[id], snap, timer: 0, raf: 0, arm: false, hold: false, missing: false, holes: [], t0: 0, scrolled: false, geom: '', anchor: null };
        if (nudge) nudge.hidden = true;
        document.body.classList.add('tour-on');
        document.body.append(dim, rings, card);
        listen(true);
        run.raf = requestAnimationFrame(frame);
        go(0);
    }

    function stop() {
        if (!run) return;
        const snap = run.snap;
        teardown();
        try {
            A().restore(snap);
            localStorage.removeItem('arcTourBackup');
        } catch (e) {
            try { location.reload(); } catch (err) {}
        }
        maybeNudge();
    }

    function refresh() {
        bindHelper();
        if (run) paint();
    }

    function activeAnchor() {
        const desk = document.querySelector('.tour-anchor-desktop');
        if (desk && getComputedStyle(desk).display !== 'none') return desk;
        return document.querySelector('.tour-anchor-mobile');
    }

    function park() {
        const host = activeAnchor();
        if (!host) return;
        if (nudge && nudge.parentElement !== host) host.appendChild(nudge);
        if (menu && menu.parentElement !== host) host.appendChild(menu);
    }

    function closeMenu() {
        if (!menu) return;
        menu.hidden = true;
    }

    function toggleMenu(btn) {
        if (!menu) return;
        if (!menu.hidden) {
            closeMenu();
            return;
        }
        const host = btn.closest('.tour-anchor');
        if (host && menu.parentElement !== host) host.appendChild(menu);
        menu.hidden = false;
        const first = menu.querySelector('[data-tour-go]');
        if (first) first.focus();
    }

    function markSeen() {
        try { localStorage.setItem('arcTourSeen', '1'); } catch (e) {}
    }

    function blankStore(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return !Object.values(data).some(v => Number(v) > 0);
        } catch (e) { return true; }
    }

    function maybeNudge() {
        if (!nudge || run) return;
        let seen = false;
        try { seen = localStorage.getItem('arcTourSeen') === '1'; } catch (e) {}
        nudge.hidden = seen || !blankStore('arcRaidersSelection') || !blankStore('arcRaidersInventory');
    }

    function bindHelper() {
        const el = document.getElementById('auto-sync-status');
        if (!el || !HELPER_URL) return;
        if (!el.dataset.helperBound) {
            el.dataset.helperBound = '1';
            el.addEventListener('click', () => {
                if (el.classList.contains('offline')) window.open(HELPER_URL, '_blank', 'noopener');
            });
            el.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && el.classList.contains('offline')) {
                    e.preventDefault();
                    window.open(HELPER_URL, '_blank', 'noopener');
                }
            });
            if (window.MutationObserver) {
                new MutationObserver(bindHelper).observe(el, { attributes: true, attributeFilter: ['class'] });
            }
        }
        el.setAttribute('data-helper', '1');
        if (el.classList.contains('offline')) {
            el.setAttribute('role', 'link');
            el.tabIndex = 0;
            el.title = tr('tourHelperAllow');
        } else {
            el.removeAttribute('role');
            el.removeAttribute('tabindex');
        }
    }

    function onKey(e) {
        if (e.key !== 'Escape') return;
        if (run) {
            e.preventDefault();
            stop();
            return;
        }
        if (menu && !menu.hidden) {
            e.preventDefault();
            closeMenu();
        }
    }

    function boot() {
        park();
        maybeNudge();
        bindHelper();
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', (e) => {
            if (!menu || menu.hidden) return;
            const node = e.target && e.target.nodeType === 1 ? e.target : null;
            if (node && (menu.contains(node) || node.closest('.tour-open-btn'))) return;
            closeMenu();
        });
        window.addEventListener('resize', () => {
            park();
            if (run) run.geom = '';
        });
        document.querySelectorAll('.tour-open-btn').forEach(btn => btn.addEventListener('click', () => toggleMenu(btn)));
        menu?.querySelector('.tour-menu-x')?.addEventListener('click', closeMenu);
        menu?.querySelectorAll('[data-tour-go]').forEach(btn => btn.addEventListener('click', () => start(btn.getAttribute('data-tour-go'))));
        document.getElementById('tour-nudge-show')?.addEventListener('click', () => { markSeen(); start('start'); });
        document.getElementById('tour-nudge-hide')?.addEventListener('click', () => { markSeen(); if (nudge) nudge.hidden = true; });
        backBtn.addEventListener('click', () => { if (run && run.i > 0) go(run.i - 1); });
        nextBtn.addEventListener('click', () => { if (run) go(run.i + 1); });
        skipBtn.addEventListener('click', stop);
        xBtn.addEventListener('click', stop);
    }

    window.ArcTour = { start, stop, isRunning: () => !!run, refresh };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
