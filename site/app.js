// Vault Studio Portal prototype: views, routing, simulated live updates, registration wizard.
// Nothing here talks to a server. All data comes from data.js.
(function () {
  const C = window.Charts, D = window.DATA, esc = C.esc, n = C.fmtInt;
  const main = document.getElementById('main');
  const gameBy = (slug) => D.games.find((g) => g.slug === slug) || D.games[0];

  // ---------- small render helpers ----------
  const ICON = { live: '●', pass: '✓', ok: '✓', warn: '!', failed: '✕', fail: '✕', review: '◷', queued: '◷', off: '–', current: '★', previous: '↺' };
  function pill(kind, text) {
    const cls = { live: 'p-ok', pass: 'p-ok', ok: 'p-ok', building: 'p-run', uploading: 'p-run', failed: 'p-bad', fail: 'p-bad', warn: 'p-wait', review: 'p-wait', queued: 'p-wait', off: 'p-off', previous: 'p-off', current: 'p-brass' }[kind] || 'p-off';
    const ic = kind === 'building' || kind === 'uploading' ? '<span class="spin" aria-hidden="true"></span>' : `<span class="ic" aria-hidden="true">${ICON[kind] || '•'}</span>`;
    return `<span class="pill ${cls}">${ic}${esc(text)}</span>`;
  }
  const stateText = (b) => b.state === 'building' ? `Building · ${b.mins} min` : b.state === 'uploading' ? 'Uploading' : b.state === 'failed' ? 'Failed' : 'Live';
  const buildPill = (b) => pill(b.state, stateText(b));
  const testPill = (t) => !t ? '<span class="muted small">—</span>' : t === 'pass' ? pill('pass', 'Tests passed') : t === 'warn' ? pill('warn', 'Warnings') : pill('fail', 'Tests failed');
  const stgUrl = (g, ref) => `cdn.vaultlearninggames-staging.org/fielddaylab/${g.slug}/${ref}/`;
  const prodUrl = (g) => `cdn.vaultlearninggames.org/fielddaylab/${g.slug}/`;
  const card = (title, body, sub = '') => `<div class="card"><h2>${title}${sub ? ` <small>${sub}</small>` : ''}</h2>${body}</div>`;
  const kpis = (items) => `<div class="kpis">${items.map((k) => `<div class="kpi"><div class="v">${k.v}</div><div class="l">${k.l}</div>${k.d ? `<div class="d ${k.dir || ''}">${k.d}</div>` : ''}</div>`).join('')}</div>`;
  const head = (title, sub, actions = '', crumbs = '') => `${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
  const checklist = (items) => `<ul class="checklist">${items.map(([st, t, sm, right]) => `<li><span class="ci ${st}" aria-label="${st}">${{ ok: '✓', bad: '✕', warn: '!', off: '–' }[st]}</span><div>${t}${sm ? `<small>${sm}</small>` : ''}</div><div>${right || ''}</div></li>`).join('')}</ul>`;

  // ---------- simulated live state ----------
  const feed = [
    { c: 'var(--run)', t: 'Aqualab <span class="mono">staging</span> started building', s: '12 min ago · push by a Field Day developer' },
    { c: 'var(--bad)', t: 'Airborne <span class="mono">develop</span> failed: no free Unity license seat', s: '40 min ago · <a href="#tests">view run</a>' },
    { c: 'var(--brass)', t: 'Vault claimed Aqualab <span class="mono">m3.2</span> for review', s: '2 h ago' },
    { c: 'var(--ok)', t: 'Aqualab <span class="mono">develop</span> is live on staging · tests passed', s: '2 h ago · 142 MB' },
    { c: 'var(--wait)', t: 'Headlines <span class="mono">playtest-oct</span>: 2 test warnings', s: '3 d ago · <a href="#tests">view run</a>' },
    { c: 'var(--off)', t: 'Spacefab <span class="mono">feature_hud</span> preview removed', s: 'yesterday · branch deleted' },
  ];
  function tick() {
    let changed = false;
    D.games.forEach((g) => g.staging.forEach((b) => {
      if (b.state === 'building') {
        b.mins += 3; changed = true;
        if (b.mins >= 45) { b.state = 'uploading'; }
      } else if (b.state === 'uploading') {
        b.state = 'live'; b.ago = 'just now'; b.size = g.slug === 'spacefab' ? '212 MB' : '143 MB'; b.tests = 'pass'; changed = true;
        feed.unshift({ c: 'var(--ok)', t: `${esc(g.title)} <span class="mono">${esc(b.ref)}</span> is live on staging · tests passed`, s: 'just now · ' + b.size });
      }
    }));
    if (changed) {
      document.querySelectorAll('[data-live]').forEach((el) => {
        const [slug, ref] = el.getAttribute('data-live').split('|');
        const b = gameBy(slug).staging.find((x) => x.ref === ref);
        if (b) el.innerHTML = el.classList.contains('with-ref') ? `${buildPill(b)} ${esc(b.ref)}` : buildPill(b);
      });
      const f = document.getElementById('feed'); if (f) f.innerHTML = feedHtml();
      const bn = document.getElementById('building-now'); if (bn) bn.textContent = buildingCount();
    }
  }
  const buildingCount = () => D.games.reduce((a, g) => a + g.staging.filter((b) => b.state === 'building' || b.state === 'uploading').length, 0);
  const feedHtml = () => feed.slice(0, 7).map((e) => `<div class="ev"><span class="dot" style="background:${e.c}"></span><div>${e.t}<small>${e.s}</small></div></div>`).join('');

  // ---------- views ----------
  function overview() {
    const live = D.games.reduce((a, g) => a + g.staging.filter((b) => b.state === 'live').length, 0);
    const series = D.studioSeries;
    const rows = D.games.map((g) => {
      const shown = g.staging.slice(0, 2);
      const more = g.staging.length - shown.length;
      const stg = g.staging.length ? `<div class="stack">${shown.map((b) => `<span class="ref"><span data-live="${g.slug}|${b.ref}">${buildPill(b)}</span> ${esc(b.ref)}</span>`).join('')}${more > 0 ? `<span class="muted small">+ ${more} more</span>` : ''}</div>` : '<span class="muted small">No staging builds</span>';
      const prod = g.prod ? `<div class="stack"><span class="rel">${esc(g.prod)}</span>${g.review ? pill('review', `${g.review} in review`) : ''}</div>` : '<span class="muted small">Not released</span>';
      return `<tr><td class="proj"><a href="#game.${g.slug}"><b>${esc(g.title)}</b></a><span>${esc(g.engine)} · ${esc(g.source)}</span></td><td>${stg}</td><td>${prod}</td><td class="r num">${g.sessions30 ? n(g.sessions30) : '<span class="muted">—</span>'}</td></tr>`;
    }).join('');
    const health = D.games.filter((g) => g.prod).map((g, i) => {
      const p75 = [9.8, 7.2, 5.1, 6.4, 8.8, 4.2][i];
      const warn = g.slug === 'headlines';
      return `<tr><td><a href="#game.${g.slug}">${esc(g.title)}</a></td><td class="rel">${esc(g.prod)}</td><td class="r num">${warn ? '99.62%' : ['99.98%', '99.99%', '99.97%', '99.99%', '', '99.95%'][i]}</td><td class="r num">${p75.toFixed(1)} s</td><td>${warn ? pill('warn', 'Slow on Chromebooks') : pill('ok', 'Healthy')}</td></tr>`;
    }).join('');
    return head('Field Day Lab', 'Everything your studio has on Vault: what’s building, what’s on staging for testing, and what’s live for classrooms.',
      `<a class="btn" href="#register.3">Upload a test version</a><a class="btn pri" href="#register">Register a game</a>`) +
      kpis([
        { v: '92,480', l: 'Plays in the last 30 days', d: '+318% since school started', dir: 'up' },
        { v: '3,140', l: 'Classroom sessions (est.)', d: 'groups playing together at school' },
        { v: '6', l: 'Games live for classrooms', d: '1 release in Vault review' },
        { v: `${live} <span class="muted" style="font-size:14px;font-weight:400">+ <span id="building-now">${buildingCount()}</span> building</span>`, l: 'Test versions on staging' },
        { v: '99.97%', l: 'Game loads that succeeded', d: 'all games, last 7 days' },
      ]) +
      `<div class="grid g-main">
        <div class="grid">
          ${card('Plays per day, all games', C.line({ series: [{ name: 'Plays', color: 'var(--s1)', values: series }], labels: D.labels, area: true }), 'last 90 days · schools started in late August')}
          <div class="tbl-wrap"><table><thead><tr><th>Game</th><th>Staging (testing)</th><th>Production (classrooms)</th><th class="r">Plays, 30 d</th></tr></thead><tbody>${rows}</tbody></table></div>
          ${card('Production health', `<div class="tbl-wrap"><table><thead><tr><th>Game</th><th>Current release</th><th class="r">Loads OK, 30 d</th><th class="r">Load time (p75)</th><th>Status</th></tr></thead><tbody>${health}</tbody></table></div>`, 'checked every 5 minutes · <a href="#protocols">how</a>')}
        </div>
        <div class="grid" style="align-content:start">
          ${card('Needs attention', checklist([
            ['bad', '<a href="#game.airborne-prototype">Airborne</a> <span class="mono">develop</span> failed', 'No free Unity license seat. Re-run when another build finishes.', '<a class="btn sm" href="#tests">Re-run</a>'],
            ['warn', '<a href="#tests">Aqualab m3.2</a>: 3 test warnings', 'Near the Chromebook memory budget, an undeclared web font, one image missing alt text.'],
            ['warn', 'Headlines loads slowly on Chromebooks', '16.2 s p75 vs 15 s budget. Consider Brotli compression.'],
          ]))}
          <div class="card feed"><h2>Activity <span class="live-dot">live</span></h2><div id="feed">${feedHtml()}</div></div>
          ${card('Vault review', `<div class="small">Aqualab <b>m3.2</b> was claimed by a Vault reviewer 2 h ago. Typical turnaround: 3 school days.</div><div style="margin-top:10px">${pill('review', 'In review · device testing')}</div>`)}
        </div>
      </div>`;
  }

  function gamesList() {
    const rows = D.games.map((g) => `<tr><td class="proj"><a href="#game.${g.slug}"><b>${esc(g.title)}</b></a><span>${esc(g.slug)}</span></td><td class="small">${esc(g.source)}<br><span class="muted mono">${esc(g.repo)}</span></td><td class="small">${esc(g.engine)}</td><td class="small">${esc(g.grades)} · ${esc(g.subject)}</td><td>${g.staging.length}</td><td>${g.prod ? `<span class="rel">${esc(g.prod)}</span>` : '<span class="muted small">—</span>'}</td><td>${g.ogd ? `<span class="tag">${esc(g.ogd)}</span>` : '<span class="muted small">off</span>'}</td></tr>`).join('');
    return head('Games', `${D.games.length} games registered to Field Day Lab.`, `<a class="btn pri" href="#register">Register a game</a>`) +
      `<div class="tbl-wrap"><table><thead><tr><th>Game</th><th>How builds arrive</th><th>Engine</th><th>Audience</th><th>Test versions</th><th>Live release</th><th>OpenGameData</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function game(slug) {
    const g = gameBy(slug);
    const stg = g.staging.length ? g.staging.map((b) => `<tr>
      <td><span class="mono">${esc(b.ref)}</span> ${b.kind ? `<span class="tag">${b.kind}</span>` : ''}${b.frozen ? ` ${pill('review', 'Frozen for review')}` : ''}</td>
      <td data-live="${g.slug}|${b.ref}">${buildPill(b)}</td>
      <td>${b.state === 'failed' ? `<span class="small muted">${esc(b.why)}</span>` : testPill(b.tests)}</td>
      <td class="small"><span class="mono">${esc(b.sha)}</span>${b.size ? `<br><span class="muted num">${b.size}</span>` : ''}</td>
      <td class="small">${b.state === 'failed' ? '<span class="muted">previous build still served</span>' : `<a href="#game.${g.slug}">Open ↗</a> · <a href="#game.${g.slug}">Copy</a>`}</td>
      <td class="r">${b.kind === 'tag' || b.frozen ? '<span class="btn sm brass">Release…</span>' : ''}</td></tr>`).join('')
      : `<tr><td colspan="6" class="muted">No test versions yet. <a href="#register.3">Connect GitHub or upload a zip</a>.</td></tr>`;
    const rel = g.releases.length ? g.releases.map((r) => `<tr><td class="mono">${esc(r.v)}</td><td>${r.status === 'current' ? pill('current', 'Current') : r.status === 'review' ? pill('review', 'In Vault review') : pill('previous', 'Previous')}</td><td class="small">${esc(r.when)}${r.by ? ` · ${esc(r.by)}` : ''}</td><td class="small mono">${r.status === 'review' ? '<span class="muted">—</span>' : `…/${esc(g.slug)}/${esc(r.v)}/`}</td><td class="r">${r.status === 'previous' ? '<span class="btn sm">Roll back…</span>' : r.status === 'review' ? '<span class="btn sm">Withdraw</span>' : ''}</td></tr>`).join('')
      : `<tr><td colspan="5" class="muted">Nothing released yet. Push a version tag or pick a test version and choose <b>Request release</b>.</td></tr>`;
    return head(esc(g.title), `${esc(g.engine)} · ${esc(g.source)}${g.repo !== '—' ? ` · <span class="mono">${esc(g.repo)}</span>` : ''} · grades ${esc(g.grades)} · ${esc(g.subject)}`,
      `<a class="btn" href="#register.3">Upload a test version</a><a class="btn brass" href="#tests">Request release</a>`, `<a href="#games">Games</a> / ${esc(g.title)}`) +
      `<div class="tabs"><a class="on" href="#game.${g.slug}">Builds &amp; releases</a><a href="#tests">Test runs</a><a href="#analytics">Play analytics</a><a href="#ogd">OpenGameData</a><a href="#register.3">Setup</a></div>
      <div class="grid g-main">
        <div class="grid">
          ${card('Staging · test versions', `<div class="tbl-wrap"><table><thead><tr><th>Version</th><th>State</th><th>Tests</th><th>Commit</th><th>Preview</th><th></th></tr></thead><tbody>${stg}</tbody></table></div>`, 'only your studio and Vault can change these · kept 90 days after the last push')}
          ${card('Production · released versions', `<div class="tbl-wrap"><table><thead><tr><th>Release</th><th>Status</th><th>Approved</th><th>Link</th><th></th></tr></thead><tbody>${rel}</tbody></table></div>`, 'only Vault can change these')}
        </div>
        <div class="grid" style="align-content:start">
          ${card('Links to share', `<div class="small stack" style="gap:10px">
            <div><div class="muted">Game page (share this one)</div><span class="mono">vaultlearninggames.org/games/fielddaylab/${esc(g.slug)}</span></div>
            <div><div class="muted">Play directly (always the current release)</div><span class="mono">${prodUrl(g)}</span></div>
            <div><div class="muted">Teacher links pinned to a release</div>${g.prod ? `14 links pinned to <span class="rel">${esc(g.prod)}</span>, ending Oct 30 – Dec 18` : '—'}</div></div>`)}
          ${g.prod ? card('Production health', checklist([
            ['ok', 'Loads to first frame', 'synthetic check 3 min ago · 6.1 s'],
            ['ok', 'Real-player load success', '99.98% over 30 days'],
            ['ok', 'Status page', `status.vaultlearninggames.org/${esc(g.slug)}`],
          ])) : ''}
          ${card('Next release window', `<div class="small">Tonight, 8 pm – 6 am Central. Approved releases go live then unless marked urgent.</div>`)}
        </div>
      </div>`;
  }

  // ----- play analytics -----
  let aGame = 'all', aRange = 90;
  function analytics() {
    const sel = `<select class="sel" id="a-game" aria-label="Game"><option value="all">All games</option><option value="aqualab">Aqualab</option><option value="jowilder">Jo Wilder</option></select>`;
    const seg = `<div class="seg" role="group" aria-label="Date range"><button data-r="30">30 days</button><button data-r="90">90 days</button></div>`;
    return head('Play analytics', 'How classrooms are using your games. Counts are of plays and devices, never of students: Vault stores no student identities.', '<span class="btn">Export CSV</span>') +
      `<div class="filters">${sel}${seg}<span class="muted small">Example data</span></div><div id="a-body"></div>`;
  }
  function analyticsBody() {
    const base = aGame === 'aqualab' ? D.aqualabSeries : aGame === 'jowilder' ? D.jowilderSeries : D.studioSeries;
    const k = aGame === 'aqualab' ? 0.42 : aGame === 'jowilder' ? 0.23 : 1;
    const series = base.slice(-aRange), labels = D.labels.slice(-aRange);
    const total = series.reduce((a, b) => a + b, 0);
    const hm = D.heat(aGame.length * 7, 900 * k);
    const dev = [['Chromebook', 61], ['iPad', 17], ['Windows PC', 13], ['Mac', 6], ['Other', 3]];
    const verSeries = D.labels.map((l, i) => { const t = i - 50; const v = t < 0 ? 0 : Math.min(92, 20 + t * 9); return v; });
    const states = [['Wisconsin', 18.4], ['California', 11.2], ['Texas', 8.9], ['New York', 7.1], ['Illinois', 5.6], ['Minnesota', 4.8], ['Other US', 36.9], ['Outside US', 7.1]];
    const hist = [['0–5', 9], ['5–10', 14], ['10–15', 16], ['15–20', 18], ['20–30', 22], ['30–45', 14], ['45+', 7]];
    return kpis([
      { v: n(total), l: `Plays, last ${aRange} days` },
      { v: n(total * 0.034), l: 'Classroom sessions (est.)', d: '5+ plays from one school within 10 min' },
      { v: n(total * 0.47), l: 'Devices (unique)' },
      { v: '22 min', l: 'Median play session' },
      { v: '42%', l: 'Devices that came back', d: 'within 7 days' },
    ]) +
      `<div class="grid g2">
        <div class="span2">${card('Plays per day', C.line({ series: [{ name: 'Plays', color: 'var(--s1)', values: series }], labels, area: true, tickEvery: aRange > 40 ? 14 : 5 }), 'weekdays dominate; weekends and summer are quiet')}</div>
        ${card('When classes play', C.heat({ W: 460, rows: hm.rows, cols: hm.cols, values: hm.values, colLabel: D.hourLabel, unit: ' plays / hour, avg' }), 'weekday × hour, school’s local time')}
        ${card('Devices', C.hbar({ W: 460, rows: dev.map(([l, v], i) => ({ label: l, value: v, display: v + '%', color: 'var(--s1)' })), max: 100, labelW: 120, table: true, head: ['Device', 'Share of plays'] }), 'share of plays')}
        ${card('Load time by device (p75)', C.hbar({ W: 460, rows: [['Chromebook', 11.2], ['iPad', 8.9], ['Windows PC', 5.4], ['Mac', 4.7], ['Other', 9.8]].map(([l, v]) => ({ label: l, value: v, display: v.toFixed(1) + ' s' })), max: 20, budget: { value: 15, label: '15 s budget' }, labelW: 120 }), 'time from page open to first frame')}
        ${card('From opening to playing', C.hbar({ W: 460, rows: [['Opened play page', 100], ['Game files loaded', 96.8], ['First frame drawn', 95.9], ['Reached main menu', 95.1], ['Started playing', 88.4]].map(([l, v]) => ({ label: l, value: v, display: v.toFixed(1) + '%' })), max: 100, labelW: 150, table: true, head: ['Step', 'Share of opens'] }), 'where players drop off')}
        ${card('Release adoption · Aqualab', C.line({ W: 460, tickEvery: 21, series: [{ name: 'm3.1', color: 'var(--s1)', values: verSeries }, { name: 'm3 (pinned links)', color: 'var(--s2)', values: verSeries.map((v, i) => (i < 50 ? 100 : 100 - v)) }], labels: D.labels, yMax: 100, yFmt: (v) => Math.round(v) + '%', table: false }), 'm3.1 went live Aug 14 · share of plays')}
        ${card('Where plays come from', C.hbar({ W: 460, rows: states.map(([l, v]) => ({ label: l, value: v, display: v + '%' })), max: 40, labelW: 120 }), 'by school location (from network, not students)')}
        ${card('Play session length', C.cols({ W: 460, bars: hist.map(([l, v]) => ({ label: l + ' min', value: v, tip: `<b>${l} minutes</b><br>${v}% of sessions` })), yFmt: (v) => Math.round(v) + '%', height: 190 }), 'share of sessions · a class period is ~45 min')}
      </div>`;
  }
  function wireAnalytics() {
    const g = document.getElementById('a-game'); g.value = aGame;
    const draw = () => { document.getElementById('a-body').innerHTML = analyticsBody(); document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', +b.dataset.r === aRange)); };
    g.onchange = () => { aGame = g.value; draw(); };
    document.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => { aRange = +b.dataset.r; draw(); }; });
    draw();
  }

  // ----- OpenGameData analytics -----
  function ogdView() {
    const o = D.ogd;
    const jobRows = o.jobs.map((j) => ({ label: j.id, value: (100 * j.completed) / j.accepted, display: `${Math.round((100 * j.completed) / j.accepted)}%`, tip: `<b>${j.id}</b><br>${n(j.accepted)} accepted · ${n(j.completed)} completed` }));
    const boxRows = o.jobs.map((j) => ({ label: j.id, min: j.q[0], q1: j.q[1], med: j.q[2], q3: j.q[3], max: j.q[4], n: j.completed }));
    const feat = o.features.map((r) => `<tr><td class="mono small">${r[0]}</td><td class="mono small">${r[1]}</td><td class="r num">${r[2]}</td><td class="r num">${r[3].toFixed(1)}</td><td class="r num">${r[4]}</td><td class="r num">${r[5]}</td><td class="r num">${r[6]}%</td></tr>`).join('');
    const ex = o.exports.map((r) => `<tr><td class="mono">${r[0]}</td><td class="mono small">${r[1]}</td><td class="small">${r[2]}</td><td class="small num">${r[3]}</td><td>${r[4] === 'Ready' ? pill('ok', 'Ready') : pill('queued', r[4])}</td><td class="r">${r[4] === 'Ready' ? '<span class="btn sm">Download</span>' : ''}</td></tr>`).join('');
    return head('OpenGameData · Aqualab', `Research-grade event data from every play session, logged through <a href="https://opengamedata.io" target="_blank" rel="noopener">OpenGameData</a>. Player codes are pseudonymous; no names or accounts are logged.`,
      '<span class="btn">Open in BigQuery</span><span class="btn">Event dictionary</span>', '<a href="#game.aqualab">Aqualab</a> / OpenGameData') +
      `<div class="filters"><select class="sel" aria-label="Game"><option>Aqualab · AQUALAB</option><option>Jo Wilder · JOWILDER</option><option>Bloom · BLOOM</option></select><div class="seg"><button class="on">Last 30 days</button><button>This school year</button><button>All time</button></div><span class="tag">log_version ${o.logVersion}</span><span class="muted small">Example data</span></div>` +
      kpis([
        { v: '4.13M', l: 'Events logged, 30 days' },
        { v: n(o.sessions30), l: 'Sessions with events' },
        { v: n(o.players30), l: 'Player codes', d: 'pseudonymous' },
        { v: o.activeMin + ' min', l: 'Median active time', d: 'idle time excluded' },
        { v: o.quality + '%', l: 'Events matching schema', d: 'last 7 days' },
      ]) +
      `<div class="grid g2">
        <div class="span2">${card('Events per day', C.line({ series: [{ name: 'Events', color: 'var(--s1)', values: o.eventsPerDay }], labels: D.labels, area: true, yFmt: (v) => v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v) }), 'all event types')}</div>
        ${card('Most common events', C.hbar({ W: 460, rows: o.topEvents.map(([e, v]) => ({ label: e, value: v, display: v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v / 1000) + 'k' })), labelW: 150, table: true, head: ['Event', 'Count, 30 days'] }), 'top 10 of 38 event types')}
        ${card('Job completion', C.hbar({ W: 460, rows: jobRows, max: 100, labelW: 170, table: true, head: ['Job', 'Completed'] }), 'share of players who accepted each job and completed it')}
        <div class="span2">${card('Time to complete each job', C.box({ rows: boxRows }), 'bar = middle half of players · tick = median · line = full range')}</div>
        ${card('Detectors', checklist([
          ['warn', '<b>Stuck on an experiment</b> fired in 8.2% of sessions', 'Most often in <span class="mono">coral-fishy-bizz</span>: 3+ failed experiments in a row with no bestiary visit.', '<span class="btn sm">Sessions</span>'],
          ['ok', '<b>Guessing on arguments</b> fired in 3.1% of sessions', 'Rapid claim changes without new facts. Down from 4.4% in m3.'],
          ['off', '<b>Idle mid-job</b> fired in 12.6% of sessions', 'Often at the bell: sessions end within 2 min of 10:50 and 1:50.'],
        ]), 'patterns computed by OpenGameData from event sequences')}
        ${card('Data quality', checklist([
          ['ok', '99.6% of events match the event dictionary', '0.4% are <span class="mono">scan_object</span> missing <span class="mono">node_id</span> (m3.1 only)'],
          ['ok', 'Sequence numbers unbroken in 99.9% of sessions'],
          ['ok', 'No personal data found', 'weekly scan for names, emails and free text'],
          ['warn', 'Clock skew over 5 min in 1.2% of sessions', 'Chromebooks with wrong system time; server time is used instead'],
        ]))}
        <div class="span2">${card('Per-session features', `<div class="tbl-wrap"><table><thead><tr><th>Session</th><th>Player code</th><th class="r">Jobs completed</th><th class="r">Active min</th><th class="r">Experiments</th><th class="r">Scans</th><th class="r">Idle</th></tr></thead><tbody>${feat}</tbody></table></div>`, 'computed by OpenGameData feature extractors · sample rows')}</div>
        <div class="span2">${card('Datasets for researchers', `<div class="tbl-wrap"><table><thead><tr><th>Month</th><th>Dataset</th><th>Sessions</th><th>Size</th><th>Status</th><th></th></tr></thead><tbody>${ex}</tbody></table></div>`, 'events, sessions and features as monthly files; open to approved research partners')}</div>
      </div>`;
  }

  // ----- test run report -----
  function tests() {
    const stages = [
      ['1', 'Build', 'ok', '43 min', 'from GitHub Actions run'], ['2', 'Publish to staging', 'ok', '48 s', '139 MB · 214 files'], ['3', 'Smoke test', 'ok', '1 min', 'loads, first frame, headers'],
      ['4', 'Device matrix', 'warn', '9 min', '4 devices · 1 warning'], ['5', 'Performance', 'ok', '4 min', 'all budgets met'], ['6', 'Outside hosts blocked', 'ok', '3 min', 'still playable'],
      ['7', 'Accessibility', 'warn', '2 min', '1 warning'], ['8', 'OpenGameData', 'ok', '6 min', '<a href="#ogdtests">412 events valid</a>'], ['9', 'Privacy scan', 'warn', '1 min', '1 undeclared host'], ['10', 'Save compatibility', 'ok', '2 min', 'm3.1 saves load'],
    ];
    const pipe = `<div class="pipeline">${stages.map(([i, t, s, d, note]) => `<div class="stage ${s}"><div class="n">Step ${i}</div><b>${t}</b>${pill(s === 'ok' ? 'pass' : s, s === 'ok' ? 'Passed' : 'Warning')}<div class="t">${d} · ${note}</div></div>`).join('')}</div>`;
    const kelp = (lefts) => lefts.map((l, i) => `<i class="kelp" style="left:${l}%;height:${22 + (i % 3) * 9}%"></i>`).join('');
    const shot = () => `<div class="shot"><div class="sun"></div><div class="ttl">AQUALAB</div><div class="btns"><i></i><i></i></div>${kelp([6, 10, 84, 90, 94])}</div>`;
    const devs = [
      ['Chromebook · 4 GB', 'Chrome 129 · ChromeOS', 'warn', '11.8 s', '612 / 700 MB', 'Near memory budget'],
      ['iPad (9th gen)', 'Safari 18 · iPadOS 18', 'pass', '9.4 s', '480 MB', 'Passed'],
      ['Windows 11 laptop', 'Chrome 129', 'pass', '5.1 s', '530 MB', 'Passed'],
      ['MacBook Air', 'Safari 18', 'pass', '4.8 s', '505 MB', 'Passed'],
    ].map(([d, b, s, t, m, l]) => `<div class="device">${shot()}<div class="meta"><b>${d}</b><div>${pill(s, l)}</div><div class="row muted"><span>${b}</span></div><div class="row"><span class="muted">First frame</span><span class="num">${t}</span></div><div class="row"><span class="muted">Peak memory</span><span class="num">${m}</span></div></div></div>`).join('');
    const perf = [['Download size (compressed)', 139, 250, 'MB'], ['First frame, Chromebook p75', 11.8, 15, 's'], ['Main menu, Chromebook p75', 14.1, 20, 's'], ['Peak memory, Chromebook', 612, 700, 'MB'], ['Frame rate in play, Chromebook', 44, 30, 'fps', true]]
      .map(([l, v, b, u, higher]) => { const ok = higher ? v >= b : v <= b; const pct = Math.min(100, (v / (higher ? v * 1.2 : b)) * 100); return `<tr><td>${l}</td><td class="r num">${v} ${u}</td><td class="r num muted">${higher ? '≥' : '≤'} ${b} ${u}</td><td style="width:34%"><div style="height:8px;background:var(--sunk);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${ok ? (pct > 85 && !higher ? 'var(--wait)' : 'var(--ok)') : 'var(--bad)'}"></div></div></td><td>${ok ? (pct > 85 && !higher ? pill('warn', 'Close') : pill('pass', 'OK')) : pill('fail', 'Over')}</td></tr>`; }).join('');
    const hosts = [['cdn.vaultlearninggames.org', 'Game files', 'Vault', 'ok'], ['ogd.fielddaylab.wisc.edu', 'OpenGameData logging', 'Declared', 'ok'], ['saves.aqualab.fielddaylab.wisc.edu', 'Cloud saves (player codes)', 'Declared', 'ok'], ['fonts.gstatic.com', 'Web font', 'Not declared', 'warn']]
      .map(([h, p, d, s]) => `<tr><td class="mono small">${h}</td><td class="small">${p}</td><td>${s === 'ok' ? pill('pass', d) : pill('warn', d)}</td></tr>`).join('');
    const history = [['#214', 'm3.2', 'Release candidate', 'warn', '3 warnings', '1 h ago'], ['#213', 'develop', 'Push', 'pass', 'Passed', '2 h ago'], ['#212', 'feature_new-map', 'Push', 'fail', 'Build failed: compile error', '5 h ago'], ['#211', 'playtest-oct', 'Zip upload', 'pass', 'Passed', '3 d ago'], ['#210', 'hotfix', 'Push', 'pass', 'Passed', '4 d ago']]
      .map(([id, ref, why, s, t, when]) => `<tr><td class="mono">${id}</td><td class="mono">${ref}</td><td class="small">${why}</td><td>${pill(s, t)}</td><td class="small muted">${when}</td></tr>`).join('');
    return head('Test run #214 · Aqualab m3.2', 'Release candidate requested Sep 21. Every step ran against the frozen snapshot that would ship.',
      `<a class="btn" href="#protocols">What each step checks</a><span class="btn brass">Send to Vault review</span>`, '<a href="#game.aqualab">Aqualab</a> / Test runs') +
      `<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">${pill('warn', 'Ready for review · 3 warnings')}<span class="small">47 checks passed, 3 warnings, 0 failed · 71 min total · snapshot <span class="mono">_rc/aqualab/m3.2-r1</span></span></div>
      ${pipe}
      <h3 class="sec">Device matrix</h3><div class="devices">${devs}</div>
      <div class="grid g2" style="margin-top:16px">
        ${card('Performance budgets', `<div class="tbl-wrap"><table><thead><tr><th>Measure</th><th class="r">Result</th><th class="r">Budget</th><th>Use of budget</th><th></th></tr></thead><tbody>${perf}</tbody></table></div>`, 'school Chromebook on a 10 Mbps connection')}
        ${card('Outside hosts and privacy', `<div class="tbl-wrap"><table><thead><tr><th>Host contacted</th><th>Purpose</th><th>Declared?</th></tr></thead><tbody>${hosts}</tbody></table></div><p class="small muted" style="margin:12px 0 0">No personal data in requests. Web font isn’t in the data questionnaire: declare it or bundle the font.</p>`)}
        ${card('Outside hosts blocked', checklist([
          ['ok', 'Game starts and reaches the main menu', 'with every non-Vault host blocked'],
          ['ok', 'Cloud saves pause with a friendly message', '“Saving is offline; your progress is kept on this device.”'],
          ['ok', 'OpenGameData events buffer and send later', '38 events held, delivered after reconnect'],
        ]), 'simulates a district filter or an outage')}
        ${card('Accessibility', checklist([
          ['ok', 'Menus reachable with keyboard only'],
          ['ok', 'Audio can be muted from the first screen'],
          ['ok', 'Text contrast in UI at least 4.5:1', '12 screens sampled'],
          ['warn', '1 image missing alt text on the loading page', '<span class="mono">loading-hero.png</span>'],
        ]))}
        ${card('Console during the smoke test', `<div class="log"><span class="o">[vault] first frame at 5.08 s</span>
[unity] Loading Aqualab m3.2 (5be8d3f)
[unity] Initialized WebGL 2.0 context
<span class="w">[unity] Warning: AudioContext was not allowed to start (resumes on first click)</span>
[ogd] session 2609211442-3c1d started, log_version 5
<span class="o">[vault] main menu reached at 7.31 s</span></div>`)}
        ${card('Recent runs', `<div class="tbl-wrap"><table><thead><tr><th>Run</th><th>Version</th><th>Trigger</th><th>Result</th><th>When</th></tr></thead><tbody>${history}</tbody></table></div>`)}
      </div>`;
  }

  // ----- protocols -----
  function protocols() {
    const P = [
      { t: 'Build check', when: ['Every push'], who: 'Studio CI', gate: 'Blocks: nothing reaches staging', items: ['Unity/engine build completes', 'Output has index.html at its root', 'Size within studio quota'] },
      { t: 'Smoke test', when: ['Every push', 'Pull requests', 'Zip uploads'], who: 'Vault', gate: 'Marks the test version failed; the previous one stays up', items: ['Loads in headless Chrome to the first frame', 'No uncaught errors in the console', 'Correct headers and compression for every file', 'Preview link works'] },
      { t: 'Device matrix', when: ['Release request'], who: 'Vault device lab', gate: 'Blocks: approval', items: ['4 GB Chromebook, iPad Safari, Windows Chrome, Mac Safari', 'Reaches main menu and first gameplay on each', 'Screenshot and peak memory per device'] },
      { t: 'Performance budgets', when: ['Release request', 'Nightly on production'], who: 'Vault', gate: 'Blocks: approval · alerts in production', items: ['Download ≤ 250 MB', 'First frame ≤ 15 s p75 on a Chromebook at 10 Mbps', 'Peak memory ≤ 700 MB', 'Frame rate ≥ 30 fps in play'] },
      { t: 'Outside hosts blocked', when: ['Release request'], who: 'Vault', gate: 'Blocks: approval', items: ['Every host outside Vault is blocked', 'Game must still start and be playable', 'Saves and logging degrade gracefully'] },
      { t: 'Privacy scan', when: ['Release request'], who: 'Vault', gate: 'Blocks: approval', items: ['Every contacted host is in the data questionnaire', 'No names, emails or free text leave the device', 'No ad or third-party tracking scripts'] },
      { t: 'OpenGameData integration', when: ['Every push (if enabled)', 'Release request'], who: 'Vault + OpenGameData', gate: 'Blocks: approval when enabled', items: ['Scripted playthrough logs events', 'Events match the event dictionary', 'Required events present; sequence unbroken', 'Feature extractors run on the test session'], link: '#ogdtests' },
      { t: 'Accessibility', when: ['Release request'], who: 'Vault reviewer', gate: 'Warnings go to the reviewer', items: ['Keyboard reachable menus', 'Mute control on first screen', 'Contrast and alt text sampled'] },
      { t: 'Save compatibility', when: ['Release request'], who: 'Vault', gate: 'If saves break: release only between units', items: ['A save from the current release loads', 'Progress carries over correctly'] },
      { t: 'Production monitoring', when: ['Every 5 minutes'], who: 'Vault', gate: 'Pages the on-call release manager', items: ['Each current release loads to first frame', 'Real-player load errors below 0.5%', 'Status page updated automatically'] },
    ];
    const triggers = ['Every push', 'Pull requests', 'Zip uploads', 'Release request', 'Nightly on production', 'Every 5 minutes'];
    const matrix = P.map((p) => `<tr><td><b>${p.t}</b></td>${triggers.map((t) => `<td class="c">${p.when.some((w) => w.startsWith(t)) ? '<span class="cell-ok" aria-label="runs">●</span>' : '<span class="cell-off" aria-label="does not run">·</span>'}</td>`).join('')}<td class="small">${p.gate}</td></tr>`).join('');
    const cards = P.map((p) => `<div class="card proto"><h4>${p.t}</h4><div class="small muted">Run by ${p.who}</div><div class="when">${p.when.map((w) => `<span class="tag">${w}</span>`).join('')}</div><ul>${p.items.map((i) => `<li>${i}</li>`).join('')}</ul><div class="gate"><b>If it fails:</b> ${p.gate.replace(/^Blocks: /, 'blocks ')}${p.link ? ` · <a href="${p.link}">see an example run</a>` : ''}</div></div>`).join('');
    return head('Test protocols', 'The same checks run for every studio. Studios see results on every push; Vault uses the full set to decide what reaches classrooms.', '<a class="btn" href="#tests">Example run</a>') +
      `<div class="tbl-wrap matrix"><table><thead><tr><th>Protocol</th>${triggers.map((t) => `<th class="c">${t}</th>`).join('')}<th>If it fails</th></tr></thead><tbody>${matrix}</tbody></table></div>
      <h3 class="sec">Each protocol</h3><div class="protos">${cards}</div>`;
  }

  // ----- OGD integration test -----
  function ogdTests() {
    const steps = [['1', 'Launch build', 'ok', 'headless Chrome'], ['2', 'Scripted playthrough', 'ok', '6 min 12 s · 2 jobs'], ['3', 'Capture events', 'ok', '412 events'], ['4', 'Validate against dictionary', 'warn', '2 events flagged'], ['5', 'Offline test', 'ok', '30 s cut, all delivered'], ['6', 'Feature dry run', 'ok', '14 features computed']];
    const pipe = `<div class="pipeline six">${steps.map(([i, t, s, d]) => `<div class="stage ${s}"><div class="n">Step ${i}</div><b>${t}</b>${pill(s === 'ok' ? 'pass' : s, s === 'ok' ? 'Passed' : 'Warning')}<div class="t">${d}</div></div>`).join('')}</div>`;
    const cov = [
      ['session_start', true, 1, 'ok'], ['accept_job', true, 2, 'ok'], ['switch_job', false, 1, 'ok'], ['scan_object', true, 57, 'warn'], ['click_bestiary', false, 38, 'ok'], ['select_species', false, 29, 'ok'],
      ['begin_experiment', true, 6, 'ok'], ['end_experiment', true, 6, 'ok'], ['receive_fact', true, 11, 'ok'], ['begin_argument', true, 1, 'ok'], ['complete_argument', true, 1, 'ok'], ['complete_job', true, 2, 'ok'], ['begin_model', false, 0, 'off'], ['session_end', true, 1, 'ok'],
    ].map(([e, req, cnt, s]) => `<tr><td class="mono small">${e}</td><td class="c">${req ? 'Required' : '<span class="muted">Optional</span>'}</td><td class="r num">${cnt}</td><td>${s === 'ok' ? pill('pass', 'Valid') : s === 'warn' ? pill('warn', '2 of 57 missing node_id') : pill('off', 'Not reached by script')}</td></tr>`).join('');
    const rate = Array.from({ length: 37 }, (_, i) => { const r = D.rng(99 + i)(); const cut = i >= 22 && i <= 24; return { label: `${Math.floor(i / 6)}:${String((i % 6) * 10).padStart(2, '0')}`, value: cut ? 0 : i === 25 ? 38 : Math.round(6 + r * 12 + (i % 9 === 0 ? 10 : 0)), color: i === 25 ? 'var(--s2)' : 'var(--s1)', tip: cut ? '<b>Network cut</b><br>events buffered on device' : i === 25 ? '<b>Reconnected</b><br>38 buffered events delivered' : undefined }; });
    const stream = [
      [401, '14:48:02.114', 'scan_object', '{"node_id":"urchin-purple","new":true}', 'ok'],
      [402, '14:48:03.870', 'receive_fact', '{"fact_id":"urchin-eats-kelp"}', 'ok'],
      [403, '14:48:09.402', 'scan_object', '{"new":false}', 'warn'],
      [404, '14:48:15.017', 'begin_experiment', '{"tank":"observation","species":["urchin","kelp"]}', 'ok'],
      [405, '14:49:41.263', 'end_experiment', '{"tank":"observation","facts_found":1}', 'ok'],
      [406, '14:49:44.590', 'complete_job', '{"job_id":"kelp-urchin-barren","time_s":382}', 'ok'],
    ].map(([seq, t, e, d, s]) => `<tr><td class="r num mono small">${seq}</td><td class="mono small">${t}</td><td class="mono small">${e}</td><td class="mono small" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d)}</td><td>${s === 'ok' ? pill('pass', 'Valid') : pill('warn', 'Missing node_id')}</td></tr>`).join('');
    return head('OpenGameData integration test · Aqualab m3.2', 'A scripted player works through two jobs while every logged event is checked against Aqualab’s event dictionary. Runs on every push for games with OpenGameData enabled, and on every release request.',
      '<a class="btn" href="#protocols">All protocols</a><span class="btn">Download event log</span>', '<a href="#tests">Test run #214</a> / OpenGameData') +
      `<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">${pill('warn', 'Passed with 1 warning')}<span class="small">412 events · 31 of 38 event types exercised · 12 of 12 required types seen · app <span class="mono">AQUALAB</span> · app_version <span class="mono">m3.2</span> · log_version 5</span></div>
      ${pipe}
      <div class="grid g2" style="margin-top:16px">
        ${card('Checks', checklist([
          ['ok', 'Logger reached OpenGameData', '412 of 412 requests accepted (HTTP 200)'],
          ['ok', 'Every required event type was logged', '12 of 12'],
          ['warn', 'Events match the event dictionary', '410 of 412 valid · <span class="mono">scan_object</span> sent without <span class="mono">node_id</span> twice'],
          ['ok', 'Sequence index unbroken and increasing', '1 → 412, no gaps or repeats'],
          ['ok', 'Timestamps plausible', 'client clock within 2 s of server'],
          ['ok', 'app_version matches the build', '<span class="mono">m3.2</span> (tag) · commit 5be8d3f'],
          ['ok', 'No personal data in events', 'no names, emails or free text; player code format only'],
          ['ok', 'Events survive a network cut', '38 events buffered for 30 s, delivered in order'],
        ]))}
        ${card('Event coverage', `<div class="tbl-wrap"><table><thead><tr><th>Event type</th><th class="c">In dictionary</th><th class="r">Seen</th><th>Result</th></tr></thead><tbody>${cov}</tbody></table></div>`, 'from Aqualab’s event dictionary · 14 of 38 shown')}
        <div class="span2">${card('Events per 10 seconds during the test', C.cols({ bars: rate, height: 170, tickEvery: 6 }) + C.legend([{ name: 'Events received', color: 'var(--s1)', kind: 'sq' }, { name: 'Buffered events delivered after reconnect', color: 'var(--s2)', kind: 'sq' }]), 'network cut from 3:40 to 4:10')}</div>
        <div class="span2">${card('Event stream (last 6)', `<div class="tbl-wrap"><table><thead><tr><th class="r">Seq</th><th>Client time</th><th>Event</th><th>event_data</th><th>Result</th></tr></thead><tbody>${stream}</tbody></table></div>`)}</div>
        ${card('Feature dry run', `<div class="tbl-wrap"><table><thead><tr><th>Feature</th><th class="r">Value</th><th>Expected</th></tr></thead><tbody>
          <tr><td class="mono small">JobsCompleted</td><td class="r num">2</td><td>${pill('pass', '2')}</td></tr>
          <tr><td class="mono small">SessionDuration</td><td class="r num">372 s</td><td>${pill('pass', '300–420 s')}</td></tr>
          <tr><td class="mono small">ExperimentsRun</td><td class="r num">3</td><td>${pill('pass', '≥ 1')}</td></tr>
          <tr><td class="mono small">JobActiveTime[kelp-urchin-barren]</td><td class="r num">382 s</td><td>${pill('pass', 'present')}</td></tr>
          <tr><td class="mono small">IdlePercent</td><td class="r num">4%</td><td>${pill('pass', '≤ 20%')}</td></tr></tbody></table></div>`, 'OpenGameData feature extractors run on the test session')}
        ${card('How the script plays', `<ol class="small" style="margin:0;padding-left:18px">
          <li>Opens the build with a test player code (<span class="mono">VAULT-TEST-214</span>) that is excluded from datasets.</li>
          <li>Follows the studio’s scripted path for 2 jobs (a list of scene hooks the studio provides once).</li>
          <li>Cuts the network for 30 s mid-job, then restores it.</li>
          <li>Ends the session and compares everything logged with the event dictionary.</li></ol>`)}
      </div>`;
  }

  // ----- registration wizard -----
  let regStep = 1;
  const STEPS = ['About the game', 'Players & data', 'How builds arrive', 'OpenGameData', 'Review & submit'];
  function register(arg) {
    regStep = Math.min(5, Math.max(1, +arg || 1));
    const stepBtns = STEPS.map((s, i) => `<button type="button" data-step="${i + 1}"><b>${i + 1}</b><span>${s}</span></button>`).join('');
    const yn = (name, yes = false) => `<div class="yn"><label><input type="radio" name="${name}" value="yes" ${yes ? 'checked' : ''}>Yes</label><label><input type="radio" name="${name}" value="no" ${yes ? '' : 'checked'}>No</label></div>`;
    const q = (name, t, h, yes) => `<div class="q"><div><div class="t">${t}</div>${h ? `<div class="h">${h}</div>` : ''}</div>${yn(name, yes)}</div>`;
    return head('Register a game', 'Takes about ten minutes. You can save and come back; nothing is public until Vault approves a release.', '', '<a href="#games">Games</a> / Register') +
      `<form id="reg" class="wizard" novalidate>
        <nav class="steps" aria-label="Steps">${stepBtns}</nav>
        <div>
          <section class="form-card" data-pane="1">
            <h2>About the game</h2><p>The basics. You can change all of this later except the web address.</p>
            <div class="fields">
              <div class="field"><label for="f-title">Game title</label><input type="text" id="f-title" placeholder="e.g. Tidepool" autocomplete="off"><span class="hint" id="f-title-err"></span></div>
              <div class="field"><label for="f-slug">Web address</label><input type="text" id="f-slug" placeholder="tidepool" autocomplete="off"><span class="hint" id="f-slug-hint">Lowercase letters, numbers and dashes.</span></div>
              <div class="field full"><label for="f-desc">One-paragraph description</label><textarea id="f-desc" placeholder="What players do, and what they learn."></textarea><span class="hint">Shown on the game’s public page once released.</span></div>
              <div class="field"><label for="f-engine">Made with</label><select id="f-engine"><option>Unity</option><option>Godot</option><option>Construct</option><option>GameMaker</option><option>Twine</option><option>HTML5 / JavaScript</option><option>Other</option></select></div>
              <div class="field"><label for="f-email">Contact email for Vault</label><input type="email" id="f-email" placeholder="team@studio.org"></div>
              <div class="field full"><span class="lab">Grades</span><div class="chips">${['K–2', '3–5', '6–8', '9–12', 'College'].map((g) => `<label><input type="checkbox" name="grades" value="${g}">${g}</label>`).join('')}</div></div>
              <div class="field full"><span class="lab">Subjects</span><div class="chips">${['Life science', 'Earth science', 'Physical science', 'Math', 'History', 'Civics', 'ELA', 'Computer science', 'Other'].map((g) => `<label><input type="checkbox" name="subjects" value="${g}">${g}</label>`).join('')}</div></div>
            </div>
          </section>

          <section class="form-card" data-pane="2" hidden>
            <h2>Players &amp; data</h2><p>Plain questions about what your game does. Vault uses the answers to handle student-privacy rules (FERPA, COPPA) for you; you don’t need to know them.</p>
            ${q('d-names', 'Does the game ask players for their name or email?', 'Including “type your name” screens.', false)}
            ${q('d-accounts', 'Do players need to sign in or create an account?', '', false)}
            ${q('d-server', 'Does the game send anything to a server while playing?', 'Saves, scores, analytics, logging…', true)}
            <div class="field" style="margin:4px 0 8px"><label for="d-hosts">Which servers, and what for?</label><textarea id="d-hosts">saves.tidepool.example.org — saved progress by player code
OpenGameData — gameplay events for research</textarea></div>
            ${q('d-ogd', 'Log gameplay events with OpenGameData?', 'Free research-grade analytics for your game. Set up in step 4.', true)}
            ${q('d-ads', 'Any ads, social sharing or third-party analytics?', 'Vault doesn’t release games with ads.', false)}
            ${q('d-offline', 'Does the game still work if its server is unreachable?', 'Tested automatically before release.', true)}
            ${q('d-keyboard', 'Can menus be used with a keyboard only?', '', true)}
            <div class="fix" style="margin-top:10px"><b>What happens with this:</b> Vault compares your answers with what the game actually does in testing. If they differ, we’ll ask before release. Nothing here is shown publicly.</div>
          </section>

          <section class="form-card" data-pane="3" hidden>
            <h2>How builds arrive</h2><p>Pick what fits how you work today. You can switch later.</p>
            <div class="choices">
              <label class="choice"><input type="radio" name="src" value="zip" checked><div><b>Upload a zip</b><span>Export your game and drag it in. No repository or tools.</span><span class="for">Best for small teams</span></div></label>
              <label class="choice"><input type="radio" name="src" value="gh"><div><b>GitHub · build in CI</b><span>Every push builds and publishes a test version. Pull requests get previews.</span><span class="for">Best for Unity teams on GitHub</span></div></label>
              <label class="choice"><input type="radio" name="src" value="ghc"><div><b>GitHub · build is in the repo</b><span>The repository already holds your exported game folder.</span><span class="for">Best for older games</span></div></label>
              <label class="choice"><input type="radio" name="src" value="api"><div><b>Our own pipeline</b><span>GitLab, Jenkins, Unity Build Automation… call the Vault CLI or API.</span><span class="for">Best for larger studios</span></div></label>
            </div>
            <div id="src-instr"></div>
          </section>

          <section class="form-card" data-pane="4" hidden>
            <h2>OpenGameData</h2><p>Log what players do, get the analytics and research datasets shown under <a href="#ogd">OpenGameData</a>, and have logging tested on every build.</p>
            <div class="fields">
              <div class="field"><label for="o-app">OpenGameData app ID</label><input type="text" id="o-app" value="TIDEPOOL"><span class="hint">Used in every event. Uppercase, set once.</span></div>
              <div class="field"><label for="o-dict">Event dictionary</label><input type="file" id="o-dict" accept=".json"><span class="hint">JSON list of your event types and their fields. <a href="#ogdtests">Example</a></span></div>
            </div>
            <div id="ogd-instr"></div>
            <div class="instr"><div class="instr-h">Send test events <span class="muted small" id="ogd-status">Waiting for events from your build</span></div><div class="instr-b">
              <p class="small" style="margin-top:0">Run any build that includes the logger (in the editor is fine). Events show up here within seconds, checked against your dictionary.</p>
              <button type="button" class="btn" id="ogd-sim">Simulate test events</button>
              <div id="ogd-events" style="margin-top:10px"></div></div></div>
          </section>

          <section class="form-card" data-pane="5" hidden>
            <h2>Review &amp; submit</h2><p>Check the details. Registering creates your game’s staging space; nothing is public yet.</p>
            <div id="summary"></div>
            <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-top:14px"><input type="checkbox" id="agree" style="margin-top:3px"> I understand my studio controls staging, and that releases to classrooms need Vault review and testing.</label>
          </section>

          <div class="form-foot"><button type="button" class="btn" id="back">Back</button><button type="button" class="btn pri" id="next">Next</button></div>
        </div>
      </form>`;
  }

  const Y = (s) => s; // YAML/shell snippets are plain strings so GitHub's ${{ }} isn't interpolated
  const SNIP = {
    gh: Y('<span class="c"># .github/workflows/vault.yml</span>\n<span class="k">on:</span> { push: {}, pull_request: {}, delete: {}, workflow_dispatch: {} }\n<span class="k">permissions:</span> { contents: read, id-token: write, pull-requests: write }\n<span class="k">jobs:</span>\n  <span class="k">build:</span>\n    if: github.event_name != \'delete\'\n    uses: fielddaylab/vault-publisher/.github/workflows/unity-build.yml@v1\n    secrets: inherit\n  <span class="k">preview:</span>\n    needs: build\n    uses: fielddaylab/vault-publisher/.github/workflows/publish-preview.yml@v1\n    with: { game: SLUG, artifact: ${{ needs.build.outputs.artifact }} }\n  <span class="k">smoke-test:</span>\n    needs: preview\n    uses: fielddaylab/vault-publisher/.github/workflows/smoke-test.yml@v1\n    with: { url: ${{ needs.preview.outputs.url }} }\n  <span class="k">remove-preview:</span>\n    if: github.event_name == \'delete\'\n    uses: fielddaylab/vault-publisher/.github/workflows/publish-preview.yml@v1\n    with: { game: SLUG }'),
    ghc: Y('<span class="c"># .github/workflows/vault.yml</span>\n<span class="k">on:</span> { push: {}, delete: {}, workflow_dispatch: {} }\n<span class="k">permissions:</span> { contents: read, id-token: write }\n<span class="k">jobs:</span>\n  <span class="k">preview:</span>\n    uses: fielddaylab/vault-publisher/.github/workflows/publish-preview.yml@v1\n    with: { game: SLUG, path: WebGL }   <span class="c"># folder with index.html</span>'),
    api: Y('<span class="c"># Install once</span>\nnpm install -g @vaultlearninggames/cli\n\n<span class="c"># In your build job, after exporting to ./build</span>\nvault upload --studio STUDIO --game SLUG --name "$CI_COMMIT_REF_SLUG" ./build\nvault test   --game SLUG --name "$CI_COMMIT_REF_SLUG" --wait\n\n<span class="c"># Release candidates: open a release request for Vault review</span>\nvault request-release --game SLUG --from "$CI_COMMIT_TAG" --notes CHANGELOG.md'),
  };
  const ENGINE_GUIDE = {
    Unity: ['File → Build Settings → WebGL → Switch Platform.', 'Player Settings → Publishing Settings: Compression Format <b>Brotli</b>, tick <b>Decompression Fallback</b>.', 'Player Settings → Resolution and Presentation: WebGL template <b>Minimal</b> (or Vault’s template).', 'Build to a new folder, then zip the <i>contents</i> of that folder.'],
    Godot: ['Project → Export → Add… → Web.', 'Turn off <b>Thread Support</b> unless you need it (school iPads).', 'Export Project to an empty folder; make sure it contains <span class="mono">index.html</span>.', 'Zip the folder’s contents.'],
    Construct: ['Menu → Project → Export → Web (HTML5).', 'Leave “Minify script” on.', 'Download the zip Construct produces. Upload it as is.'],
    GameMaker: ['Target: GX.games is not used; choose <b>HTML5</b>.', 'Build → Create Executable → zip.', 'Upload the zip as is.'],
    Twine: ['Library → your story → Publish to File.', 'Put the .html file in a folder and rename it <span class="mono">index.html</span>, with any images next to it.', 'Zip the folder’s contents.'],
    'HTML5 / JavaScript': ['Run your production build (e.g. <span class="mono">npm run build</span>).', 'Zip the output folder’s contents, with <span class="mono">index.html</span> at the top.'],
    Other: ['Export a web (HTML5/WebGL) build.', 'Zip it so <span class="mono">index.html</span> is at the top level.'],
  };
  function srcInstr(src, engine, slug) {
    const s = (t) => t.replace(/SLUG/g, slug || 'tidepool').replace(/STUDIO/g, 'fielddaylab');
    if (src === 'zip') {
      const steps = ENGINE_GUIDE[engine] || ENGINE_GUIDE.Other;
      return `<div class="instr"><div class="instr-h">Export from ${esc(engine)} <a href="#register.3" class="small">Screenshots</a></div><div class="instr-b"><ol>${steps.map((x) => `<li>${x}</li>`).join('')}</ol></div></div>
        <div class="instr"><div class="instr-h">Upload your first test version</div><div class="instr-b">
          <div class="drop"><b>Drag your zip here</b><span class="small">or <label style="color:var(--slate);cursor:pointer;text-decoration:underline">choose a file<input type="file" id="zip" accept=".zip" hidden></label> · up to 500 MB</span></div>
          <div id="zip-result"></div></div></div>`;
    }
    if (src === 'gh' || src === 'ghc') {
      return `<div class="instr"><div class="instr-h">Connect GitHub</div><div class="instr-b">
        <div class="fields"><div class="field"><label for="gh-repo">Repository</label><select id="gh-repo"><option>fielddaylab/tidepool</option><option>fielddaylab/wake</option><option>fielddaylab/spacefab</option></select><span class="hint">Listed through the Vault GitHub App.</span></div>
        ${src === 'ghc' ? '<div class="field"><label for="gh-path">Folder with index.html</label><input type="text" id="gh-path" value="WebGL"></div>' : '<div class="field"><span class="lab">Unity license (org secrets)</span><span class="small">✓ UNITY_EMAIL · ✓ UNITY_PASSWORD · ✓ UNITY_SERIAL</span><span class="hint">Found on the fielddaylab organization.</span></div>'}</div>
        <p class="small" style="margin:14px 0 4px">We’ll open a pull request adding this file:</p>
        <div class="code">${s(SNIP[src])}</div>
        <div class="actions"><button type="button" class="btn pri" id="gh-pr">Open pull request</button><button type="button" class="btn" id="gh-copy">Copy the file instead</button></div>
        <div id="gh-result"></div></div></div>`;
    }
    return `<div class="instr"><div class="instr-h">Call Vault from your pipeline</div><div class="instr-b">
      <p class="small" style="margin-top:0">GitLab CI, CircleCI and Azure Pipelines sign in with their own OIDC tokens; for anything else, create an upload token (staging only, revocable).</p>
      <div class="code">${s(SNIP.api)}</div>
      <div class="actions"><button type="button" class="btn" id="tok">Create upload token</button><a class="btn" href="#protocols">API reference</a></div><div id="tok-result"></div></div></div>`;
  }
  function ogdInstr(engine) {
    const unity = '<span class="c">// Packages/manifest.json → "dependencies"</span>\n"com.fieldday.opengamedata": "https://github.com/opengamedata/opengamedata-unity.git"\n\n<span class="c">// Once, at startup</span>\nOGDLog log = new OGDLog("APP", Application.version);\nlog.SetUserId(playerCode);\n\n<span class="c">// Anywhere an event happens</span>\nusing (var e = log.NewEvent("accept_job")) {\n    e.Param("job_id", job.Id);\n}';
    const js = '<span class="c">// npm install opengamedata-js</span>\nimport { OGDLogger } from "opengamedata-js";\nconst log = new OGDLogger({ appId: "APP", appVersion: BUILD_VERSION });\n\nlog.event("accept_job", { job_id: job.id });';
    const code = (engine === 'Unity' ? unity : js).replace(/APP/g, (document.getElementById('o-app')?.value || 'TIDEPOOL'));
    return `<div class="instr"><div class="instr-h">Add the logger (${engine === 'Unity' ? 'Unity' : 'JavaScript'}) <span class="muted small">illustrative API</span></div><div class="instr-b"><div class="code">${code}</div></div></div>`;
  }

  function wireRegister() {
    const form = document.getElementById('reg');
    const $ = (id) => document.getElementById(id);
    const title = $('f-title'), slug = $('f-slug'), engine = $('f-engine');
    let slugTouched = false;
    const taken = D.games.map((g) => g.slug);
    const slugHint = () => {
      const v = slug.value;
      $('f-slug-hint').innerHTML = !v ? 'Lowercase letters, numbers and dashes.' : taken.includes(v) ? `<span style="color:var(--bad)">✕ “${esc(v)}” is already used by a Field Day game</span>` : `<span class="ok">✓ available · vaultlearninggames.org/games/fielddaylab/${esc(v)}</span>`;
    };
    title.addEventListener('input', () => { if (!slugTouched) { slug.value = title.value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); slugHint(); } $('o-app').value = (slug.value || 'tidepool').replace(/-/g, '_').toUpperCase(); });
    slug.addEventListener('input', () => { slugTouched = true; slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); slugHint(); });
    const drawSrc = () => {
      const src = form.querySelector('input[name=src]:checked').value;
      $('src-instr').innerHTML = srcInstr(src, engine.value, slug.value);
      const zip = $('zip');
      if (zip) zip.onchange = () => {
        const f = zip.files[0]; if (!f) return;
        const mb = (f.size / 1e6).toFixed(1);
        $('zip-result').innerHTML = `<div style="margin-top:12px" class="small"><b>${esc(f.name)}</b> · ${mb} MB</div>` + checklist([
          ['ok', 'Your game’s start page (index.html) was found'], ['ok', 'Size fits school Chromebooks'], ['ok', 'No programs or server scripts inside'],
          ['warn', 'No decompression fallback', 'Fine for testing. Before release: Player Settings → Publishing Settings → tick Decompression Fallback.'],
        ]) + `<div style="margin-top:8px">${pill('uploading', 'Uploading… (prototype: nothing is sent)')}</div>`;
      };
      const pr = $('gh-pr');
      if (pr) pr.onclick = () => { $('gh-result').innerHTML = `<div style="margin-top:12px">${pill('pass', 'Pull request #12 opened on ' + ($('gh-repo')?.value || 'your repo'))} <span class="small muted">Merge it and your first test version appears here about 45 minutes later.</span></div>`; };
      const cp = $('gh-copy');
      if (cp) cp.onclick = () => { const txt = document.querySelector('#src-instr .code').innerText; navigator.clipboard?.writeText(txt).then(() => { cp.textContent = 'Copied'; }).catch(() => { cp.textContent = 'Select the text above to copy'; }); };
      const tok = $('tok');
      if (tok) tok.onclick = () => { $('tok-result').innerHTML = `<div class="code">VAULT_UPLOAD_TOKEN=vlt_stg_2f9c…(shown once in the real portal)</div><div class="small muted">Staging only · for ${esc(slug.value || 'tidepool')} · revoke any time</div>`; };
    };
    form.querySelectorAll('input[name=src]').forEach((r) => r.addEventListener('change', drawSrc));
    engine.addEventListener('change', () => { drawSrc(); $('ogd-instr').innerHTML = ogdInstr(engine.value); });
    $('ogd-instr').innerHTML = ogdInstr(engine.value);
    $('o-app').addEventListener('input', () => { $('ogd-instr').innerHTML = ogdInstr(engine.value); });
    $('ogd-sim').onclick = () => {
      const evs = [['session_start', 'ok'], ['accept_job', 'ok'], ['scan_object', 'ok'], ['scan_object', 'warn'], ['complete_job', 'ok']];
      const box = $('ogd-events'); box.innerHTML = ''; $('ogd-status').textContent = 'Receiving…';
      evs.forEach(([e, s], i) => setTimeout(() => {
        box.insertAdjacentHTML('beforeend', `<div class="small" style="display:flex;gap:10px;align-items:center;padding:5px 0;border-top:1px solid var(--line-2)"><span class="mono">${e}</span>${s === 'ok' ? pill('pass', 'Matches dictionary') : pill('warn', 'Missing field node_id')}</div>`);
        if (i === evs.length - 1) $('ogd-status').innerHTML = '<span class="live-dot">5 events received · 1 warning</span>';
      }, 450 * (i + 1)));
    };
    const show = () => {
      form.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = +p.dataset.pane !== regStep; });
      form.querySelectorAll('.steps button').forEach((b) => { const s = +b.dataset.step; b.classList.toggle('on', s === regStep); b.classList.toggle('done', s < regStep); b.setAttribute('aria-current', s === regStep ? 'step' : 'false'); });
      $('back').disabled = regStep === 1;
      $('next').textContent = regStep === 5 ? 'Register game' : 'Next';
      if (regStep === 3) drawSrc();
      if (regStep === 5) {
        const pick = (name) => [...form.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value).join(', ') || '—';
        const src = { zip: 'Zip upload', gh: 'GitHub · build in CI', ghc: 'GitHub · committed build', api: 'Own pipeline (CLI/API)' }[form.querySelector('input[name=src]:checked').value];
        $('summary').innerHTML = `<div class="tbl-wrap"><table><tbody>
          <tr><th>Title</th><td>${esc(title.value || '—')}</td></tr><tr><th>Web address</th><td class="mono">vaultlearninggames.org/games/fielddaylab/${esc(slug.value || '—')}</td></tr>
          <tr><th>Engine</th><td>${esc(engine.value)}</td></tr><tr><th>Grades</th><td>${esc(pick('grades'))}</td></tr><tr><th>Subjects</th><td>${esc(pick('subjects'))}</td></tr>
          <tr><th>Builds</th><td>${src}</td></tr><tr><th>OpenGameData</th><td class="mono">${esc($('o-app').value)}</td></tr>
          <tr><th>Test versions at</th><td class="mono">cdn.vaultlearninggames-staging.org/fielddaylab/${esc(slug.value || '—')}/…</td></tr></tbody></table></div>`;
      }
      window.scrollTo({ top: 0 });
    };
    const go = (s) => {
      if (s > 1 && !title.value.trim()) { regStep = 1; show(); $('f-title-err').innerHTML = '<span style="color:var(--bad)">Add a title to continue.</span>'; title.focus(); return; }
      if (taken.includes(slug.value)) { regStep = 1; show(); slug.focus(); return; }
      $('f-title-err').textContent = ''; regStep = s; show(); history.replaceState(null, '', `#register.${s}`);
    };
    form.querySelectorAll('.steps button').forEach((b) => { b.onclick = () => go(+b.dataset.step); });
    $('back').onclick = () => go(regStep - 1);
    $('next').onclick = () => {
      if (regStep < 5) return go(regStep + 1);
      if (!$('agree').checked) { $('agree').focus(); $('agree').parentElement.style.color = 'var(--bad)'; return; }
      form.outerHTML = `<div class="form-card done-box"><div class="big-check">✓</div><h2>${esc(title.value)} is registered</h2><p class="muted">Its staging space is ready. Here’s what happens next.</p>
        <div class="next-list">${checklist([
          ['ok', 'Staging space created', `cdn.vaultlearninggames-staging.org/fielddaylab/${esc(slug.value)}/`],
          ['off', 'First test version', 'Appears on your dashboard as soon as it arrives, with smoke-test results.'],
          ['off', 'OpenGameData check', 'Runs on every build once events arrive.'],
          ['off', 'Request a release', 'When a test version is ready for classrooms, Vault reviews and tests it.'],
        ])}</div><div class="actions" style="justify-content:center;margin-top:18px"><a class="btn" href="#overview">Back to dashboard</a><a class="btn pri" href="#game.aqualab">See an example game</a></div></div>`;
    };
    if (regStep > 1 && !title.value) { title.value = 'Tidepool'; slug.value = 'tidepool'; slugHint(); }
    show();
  }

  // ---------- router ----------
  const ROUTES = {
    overview: [overview, 'overview', 'Overview'], games: [gamesList, 'games', 'Games'], game: [game, 'games', 'Game'],
    register: [register, 'register', 'Register a game'], analytics: [analytics, 'analytics', 'Play analytics'], ogd: [ogdView, 'ogd', 'OpenGameData'],
    tests: [tests, 'tests', 'Test runs'], protocols: [protocols, 'protocols', 'Test protocols'], ogdtests: [ogdTests, 'ogdtests', 'OpenGameData tests'],
  };
  function route() {
    const h = (location.hash || '#overview').slice(1);
    const dot = h.indexOf('.');
    const name = dot === -1 ? h : h.slice(0, dot), arg = dot === -1 ? '' : h.slice(dot + 1);
    const [view, nav, title] = ROUTES[name] || ROUTES.overview;
    main.innerHTML = view(arg);
    document.title = `${name === 'game' ? gameBy(arg).title : title} · Vault Studio Portal`;
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === nav));
    document.querySelector('.side').classList.remove('open');
    if (name === 'analytics') wireAnalytics();
    if (name === 'register') wireRegister();
    if (!(name === 'register' && arg)) window.scrollTo({ top: 0 });
    main.focus({ preventScroll: true });
  }

  C.wire();
  window.addEventListener('hashchange', route);
  document.getElementById('menu').onclick = () => document.querySelector('.side').classList.toggle('open');
  route();
  setInterval(tick, 4000);
})();
