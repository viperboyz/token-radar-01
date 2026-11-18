// Token Radar dashboard: renders window.RADAR (written by main.ts from the sealed snapshot).
// No network, no fetch: every view is built from the data already on the page.
// Views are hash-routed so each state has its own address:
//   #board            the ranked board
//   #detail/<slug>    one protocol: its model breakdown and farm plan
//   #filter/<category> the board filtered to one category
//   #live             protocols whose token already trades (the market's own values)
//   #method           how the implied value is derived, with the multiples table
(function () {
  'use strict';
  var D = window.RADAR;
  var main = document.getElementById('board');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(v) {
    if (v == null) return '<span class="flat">n/a</span>';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days == null) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + ' yrs';
    return days + ' days';
  }
  function catPill(c) { return '<span class="pill">' + esc(c || 'Uncategorised') + '</span>'; }

  var state = { q: '', category: '', chain: '', sort: 'rank' };

  function header() {
    return '<div class="wrap"><header><div class="brand">' +
      '<h1>TOKEN RADAR<span class="dot">.</span></h1>' +
      '<p>Pre-token protocols ranked by <b>implied value</b> — what a launch would be worth if the ' +
      'protocol\'s record stayed as it is. Snapshot ' + esc(D.as_of) + ', ' + D.rows.length +
      ' protocols ranked, every one of the ' + D.watchlist_size + ' watchlist protocols covered.</p></div>' +
      '<div class="stats">' +
      '<div class="stat"><div class="v">' + D.board_size + '</div><div class="k">ranked</div></div>' +
      '<div class="stat"><div class="v">' + D.watchlist_size + '</div><div class="k">watchlist</div></div>' +
      '<div class="stat"><div class="v">' + D.early_size + '</div><div class="k">early finds</div></div>' +
      '<div class="stat"><div class="v">' + money(D.total_implied_usd) + '</div><div class="k">total implied</div></div>' +
      '</div></header>' +
      '<nav class="tabs" role="tablist">' +
      tab('board', 'Board') + tab('live', 'Live tokens') + tab('method', 'Method') +
      '</nav>';
  }
  function tab(view, label) {
    var cur = currentView();
    var sel = (view === 'board' && (cur === 'board' || cur === 'detail' || cur === 'filter')) || cur === view;
    return '<button role="tab" aria-selected="' + sel + '" data-view="' + view + '">' + label + '</button>';
  }
  function footer() {
    return '<footer>Implied values are this entry\'s own claim from the snapshot, not a prediction that a ' +
      'token will be issued or when. A protocol "records no token" in DefiLlama\'s record; the record is ' +
      'not proof it has none. Farm steps are a plan, not advice. Data: ' + esc(D.source) + '.</footer></div>';
  }
  function currentView() {
    var h = location.hash || '#board';
    if (h.indexOf('#detail/') === 0) return 'detail';
    if (h.indexOf('#filter/') === 0) return 'filter';
    if (h === '#live') return 'live';
    if (h === '#method') return 'method';
    return 'board';
  }

  function filteredRows() {
    var rows = D.rows.filter(function (r) {
      if (state.category && (r.category || 'Uncategorised') !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        if ((r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var s = state.sort;
    if (s === 'tvl') rows.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (s === 'growth') rows.sort(function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); });
    else if (s === 'age') rows.sort(function (a, b) { return (b.age_days || 0) - (a.age_days || 0); });
    else rows.sort(function (a, b) { return a.rank - b.rank; });
    return rows;
  }

  function options(list, cur, allLabel) {
    var h = '<option value="">' + esc(allLabel) + '</option>';
    list.forEach(function (v) {
      h += '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
    });
    return h;
  }

  function boardView() {
    var cats = [], chains = [];
    D.rows.forEach(function (r) {
      if (cats.indexOf(r.category || 'Uncategorised') < 0) cats.push(r.category || 'Uncategorised');
      r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
    });
    cats.sort(); chains.sort();
    var rows = filteredRows();
    var h = header() +
      '<div class="toolbar">' +
      '<input id="q" type="search" placeholder="Search a protocol…" value="' + esc(state.q) + '" aria-label="Search protocols">' +
      '<select id="cat" aria-label="Filter by category">' + options(cats, state.category, 'All categories') + '</select>' +
      '<select id="chain" aria-label="Filter by chain">' + options(chains, state.chain, 'All chains') + '</select>' +
      '<select id="sort" aria-label="Sort the board">' +
      '<option value="rank"' + (state.sort === 'rank' ? ' selected' : '') + '>Sort: board rank</option>' +
      '<option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>Sort: TVL</option>' +
      '<option value="growth"' + (state.sort === 'growth' ? ' selected' : '') + '>Sort: 7-day growth</option>' +
      '<option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Sort: age</option>' +
      '</select>' +
      '<span class="count">Showing ' + rows.length + ' of ' + D.rows.length + ' rows</span>' +
      '</div>';
    if (rows.length === 0) {
      h += '<div class="card empty">No protocol matches this filter.</div>' + footer();
      return h;
    }
    h += '<table><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
      '<th class="num">TVL</th><th class="num">7d</th><th class="num">Multiple</th>' +
      '<th class="num">Implied value</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var wl = r.watchlist === true;
      h += '<tr data-slug="' + esc(r.slug) + '"><td><span class="rank' + (r.rank <= 3 ? ' top' : '') + '">' + r.rank + '</span>' +
        (wl ? ' <span class="watch">WATCHLIST</span>' : '') + '</td>' +
        '<td><div class="name">' + esc(r.name) + '</div><div class="slug">' + esc(r.slug) + '</div></td>' +
        '<td>' + catPill(r.category) + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num mult">' + r.multiple.toFixed(2) + 'x</td>' +
        '<td class="num implied">' + money(r.implied_value_usd) + '</td></tr>';
    });
    h += '</tbody></table>' + footer();
    return h;
  }
  function detailView(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return header() + '<div class="card empty">No ranked protocol has the slug ' + esc(slug) + '.</div>' + footer();
    var base = r.tvl_usd * r.multiple;
    var h = header() +
      '<button class="back" data-view="board">&larr; Back to the board</button>' +
      '<div class="detail"><div class="card"><h2>#' + r.rank + ' &nbsp;' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + catPill(r.category) + ' &middot; ' +
      esc(r.chains.join(', ') || 'no chain listed') + ' &middot; tracked ' + ageText(r.age_days) + '</p>' +
      '<div class="big">' + money(r.implied_value_usd) + ' <small>implied value</small></div>' +
      '<dl class="kv">' +
      '<dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd>' +
      '<dt>7-day change</dt><dd>' + (r.change_7d == null ? 'not reported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '%') + '</dd>' +
      '<dt>Multiple used</dt><dd>' + r.multiple.toFixed(3) + 'x &mdash; ' + esc(r.multiple_source) + '</dd>' +
      '<dt>Growth multiplier</dt><dd>' + r.growth_multiplier.toFixed(3) + 'x</dd>' +
      '<dt>Maturity multiplier</dt><dd>' + r.maturity_multiplier.toFixed(3) + 'x</dd>' +
      '<dt>Breadth multiplier</dt><dd>' + r.breadth_multiplier.toFixed(3) + 'x (' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</dd>' +
      '</dl>' +
      '<div class="formula">implied = TVL &times; multiple &times; growth &times; maturity &times; breadth<br>' +
      esc(money(r.tvl_usd)) + ' &times; ' + r.multiple.toFixed(3) + ' &times; ' + r.growth_multiplier.toFixed(3) +
      ' &times; ' + r.maturity_multiplier.toFixed(3) + ' &times; ' + r.breadth_multiplier.toFixed(3) +
      ' = ' + esc(money(r.implied_value_usd)) + '</div>' +
      '<p class="note" style="margin-top:12px">Base (TVL &times; multiple) is ' + money(base) + '. The multiple is the ' +
      'median market-cap / TVL of live-token protocols in the same category, read from this snapshot — ' +
      'not a number picked for this protocol.</p></div>' +
      '<div class="card"><h3>Farm plan &mdash; six steps</h3>' +
      '<ol class="steps">' +
      r.farm_steps.map(function (s) {
        var m = s.match(/^(.*?) Cost: (.*?)\. Time: (.*?)\.$/);
        if (!m) return '<li>' + esc(s) + '</li>';
        return '<li>' + esc(m[1]) + '<div class="meta">Cost: ' + esc(m[2]) + ' &middot; Time: ' + esc(m[3]) + '</div></li>';
      }).join('') +
      '</ol>' +
      '<p class="note"><span class="warn">Honest label:</span> ' + esc(r.name) + ' records no token in this ' +
      'snapshot. That is what the record says — not proof it has none, and not a promise it will issue one.</p>' +
      '</div></div>' + footer();
    return h;
  }

  function liveView() {
    var h = header() +
      '<div class="card" style="margin-bottom:12px"><h2>Live tokens</h2>' +
      '<p class="sub">These protocols already trade. They are shown at the market\'s own value — market cap ' +
      'against TVL — and never mixed into the ranked board. Their multiples are the comparables the ' +
      'board\'s model is built from.</p></div>' +
      '<table><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th>' +
      '<th class="num">Market cap</th><th class="num">mcap / TVL</th><th class="num">7d</th></tr></thead><tbody>';
    D.live.forEach(function (r) {
      h += '<tr><td><div class="name">' + esc(r.name) + '</div><div class="slug">' + esc(r.slug) + '</div></td>' +
        '<td>' + catPill(r.category) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + (r.mcap_usd == null ? 'n/a' : money(r.mcap_usd)) + '</td>' +
        '<td class="num mult">' + (r.multiple == null ? 'n/a' : r.multiple.toFixed(2) + 'x') + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    });
    h += '</tbody></table>' + footer();
    return h;
  }

  function methodView() {
    var h = header() +
      '<div class="card method"><h2>How the implied value is derived</h2>' +
      '<p>Every number below is read from the snapshot at run time. No protocol name is special-cased; ' +
      'the same function scores every row.</p>' +
      '<ol>' +
      '<li><b>Multiple by category.</b> For each category, the median market-cap / TVL of the live-token ' +
      'protocols in that category, taken from this snapshot. A category needs at least ' + D.model.min_live_for_category +
      ' live protocols with a market cap; otherwise the global median (' + D.global_multiple.toFixed(3) +
      'x) is used. Multiples are clamped to [' + D.model.multiple_floor + ', ' + D.model.multiple_cap + '].</li>' +
      '<li><b>Base.</b> TVL &times; multiple.</li>' +
      '<li><b>Growth.</b> The 7-day TVL change, clamped to [' + D.model.growth_floor + '%, +' + D.model.growth_cap +
      '%], weighted ' + D.model.growth_weight + ': multiplier = 1 + growth &times; ' + D.model.growth_weight + '.</li>' +
      '<li><b>Maturity.</b> ' + D.model.maturity_floor + ' + min(age, ' + D.model.maturity_days + ' days) / ' +
      D.model.maturity_days + ' &times; ' + D.model.maturity_range + '. Age unknown counts as ' +
      D.model.unknown_age_days + ' days. A protocol that has run longer with no token recorded carries more pent-up launch value.</li>' +
      '<li><b>Breadth.</b> 1 + ' + D.model.breadth_per_chain + ' &times; min(chains &minus; 1, ' + D.model.breadth_max_chains +
      '). More chains, more farmers reached.</li>' +
      '</ol>' +
      '<h3>Multiples used, by category</h3>' +
      '<table><thead><tr><th>Category</th><th class="num">Multiple</th><th class="num">Live comparables</th></tr></thead><tbody>';
    D.multiples.forEach(function (m) {
      h += '<tr><td>' + esc(m.category) + '</td><td class="num">' + m.multiple.toFixed(3) + 'x</td><td class="num">' + m.live_n + '</td></tr>';
    });
    h += '<tr><td>Global fallback</td><td class="num">' + D.global_multiple.toFixed(3) + 'x</td><td class="num">&mdash;</td></tr>';
    h += '</tbody></table>' +
      '<p class="note">Coverage: the board ranks all ' + D.watchlist_size + ' watchlist protocols plus ' +
      D.early_size + ' early pre-token protocols below the $50M floor that pass the same screen — no token ' +
      'recorded, not a CEX, bridge, liquid-staking or restaking product, not a versioned pool, no ' +
      'wrapped / staked / staking name. Live-token protocols are kept apart and shown under Live tokens.</p>' +
      '</div>' + footer();
    return h;
  }

  function render() {
    var view = currentView();
    var h = location.hash || '#board';
    if (view === 'filter') {
      var cat = decodeURIComponent(h.slice('#filter/'.length));
      state.category = cat; state.q = ''; state.chain = ''; state.sort = 'rank';
      main.innerHTML = boardView();
    } else if (view === 'detail') {
      main.innerHTML = detailView(decodeURIComponent(h.slice('#detail/'.length)));
    } else if (view === 'live') {
      main.innerHTML = liveView();
    } else if (view === 'method') {
      main.innerHTML = methodView();
    } else {
      main.innerHTML = boardView();
    }
    main.setAttribute('aria-busy', 'false');
    bind();
  }

  function bind() {
    var tabs = main.querySelectorAll('[data-view]');
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        if (v === 'board') { state.category = ''; state.q = ''; state.chain = ''; state.sort = 'rank'; location.hash = '#board'; }
        else location.hash = '#' + v;
      });
    });
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; rerenderTable(); });
    var cat = document.getElementById('cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; rerenderTable(); });
    var chain = document.getElementById('chain');
    if (chain) chain.addEventListener('change', function () { state.chain = chain.value; rerenderTable(); });
    var sort = document.getElementById('sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; rerenderTable(); });
    main.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = '#detail/' + encodeURIComponent(tr.getAttribute('data-slug')); });
    });
  }

  function rerenderTable() {
    var keep = document.activeElement && document.activeElement.id;
    var pos = keep ? document.activeElement.selectionStart : null;
    render();
    if (keep) {
      var el = document.getElementById(keep);
      if (el) { el.focus(); if (pos != null && el.setSelectionRange) { try { el.setSelectionRange(pos, pos); } catch (e) {} } }
    }
  }

  window.addEventListener('hashchange', render);
  render();
})();
