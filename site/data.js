// Example data for the prototype. Seeded, so it's stable between reloads.
// Shapes follow real classroom use (school-day peaks, summer lull, school starting in late August),
// but every number here is illustrative.
(function () {
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const END = new Date(Date.UTC(2026, 8, 23)); // Sep 23, 2026
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function days(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = new Date(END); d.setUTCDate(END.getUTCDate() - i); out.push(d); }
    return out;
  }
  const label = (d) => `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;

  // Daily sessions: summer lull, schools start mid-Aug to early Sep, weekends low.
  function sessionsSeries(seed, peak, n = 91) {
    const r = rng(seed);
    return days(n).map((d) => {
      const m = d.getUTCMonth(), dd = d.getUTCDate();
      let season;
      if (m < 7 || (m === 7 && dd < 10)) season = 0.10 + r() * 0.03;             // summer
      else if (m === 7) season = 0.10 + ((dd - 10) / 21) * 0.62;                 // Aug ramp
      else season = 0.72 + Math.min(1, dd / 20) * 0.28;                          // Sep
      const dow = d.getUTCDay();
      const wk = dow === 0 || dow === 6 ? 0.13 : dow === 5 ? 0.78 : 1;
      const holiday = m === 8 && dd === 7 ? 0.15 : 1;                            // Labor Day
      return Math.round(peak * season * wk * holiday * (0.9 + r() * 0.2));
    });
  }

  // Weekday x hour heatmap (local time), 6am-9pm.
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
  function heatmap(seed, scale) {
    const r = rng(seed);
    const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const values = rows.map((row, ri) => HOURS.map((h) => {
      const school = h >= 8 && h <= 15;
      let v = school ? (h === 10 || h === 13 ? 1 : h === 12 ? 0.62 : 0.84) : h === 16 ? 0.3 : h >= 17 && h <= 20 ? 0.16 : 0.05;
      if (ri === 4) v *= 0.8; if (ri >= 5) v = school ? 0.07 : 0.05;
      return Math.round(scale * v * (0.85 + r() * 0.3));
    }));
    return { rows, cols: HOURS, values };
  }
  const hourLabel = (h) => (h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`);

  const games = [
    { slug: 'aqualab', title: 'Aqualab', repo: 'fielddaylab/wake', engine: 'Unity 2019.4', source: 'GitHub · CI build', grades: '6–8', subject: 'Life science',
      prod: 'm3.1', review: 'm3.2', ogd: 'AQUALAB', sessions30: 38420,
      staging: [
        { ref: 'staging', state: 'building', mins: 12, sha: 'a41c09e' },
        { ref: 'develop', state: 'live', ago: '2 h', sha: '7d02b11', size: '142 MB', tests: 'pass' },
        { ref: 'm3.2', kind: 'tag', state: 'live', ago: '2 d', sha: '5be8d3f', size: '139 MB', tests: 'warn', frozen: true },
        { ref: 'feature_new-map', state: 'failed', ago: '5 h', sha: 'c1e2f90', why: 'Build project step' },
        { ref: 'hotfix', state: 'live', ago: '4 d', sha: 'e5a7713', size: '141 MB', tests: 'pass' },
        { ref: 'playtest-oct', kind: 'zip', state: 'live', ago: '3 d', sha: '—', size: '138 MB', tests: 'pass' },
      ],
      releases: [
        { v: 'm3.2', status: 'review', when: 'requested Sep 21' },
        { v: 'm3.1', status: 'current', when: 'Aug 14', by: 'Vault QA' },
        { v: 'm3', status: 'previous', when: 'Jun 2', by: 'Vault QA' },
        { v: 'm2', status: 'previous', when: 'Feb 10', by: 'Vault QA' },
      ] },
    { slug: 'jowilder', title: 'Jo Wilder and the Capitol Case', repo: 'fielddaylab/jowilder', engine: 'Unity 2021.3', source: 'GitHub · committed build', grades: '3–6', subject: 'History',
      prod: '2.4', ogd: 'JOWILDER', sessions30: 21150,
      staging: [{ ref: 'main', state: 'live', ago: '6 d', sha: '9ac0e21', size: '96 MB', tests: 'pass' }],
      releases: [{ v: '2.4', status: 'current', when: 'Sep 2', by: 'Vault QA' }, { v: 'legacy-2026-09', status: 'previous', when: 'Sep 1', by: 'Import' }] },
    { slug: 'lakeland', title: 'Lakeland', repo: '—', engine: 'HTML5', source: 'Imported from DoIT', grades: '6–8', subject: 'Earth science',
      prod: 'legacy-2026-09', ogd: 'LAKELAND', sessions30: 9870, staging: [],
      releases: [{ v: 'legacy-2026-09', status: 'current', when: 'Sep 1', by: 'Import' }] },
    { slug: 'bloom', title: 'Bloom', repo: 'fielddaylab/bloom', engine: 'Unity 2021.3', source: 'GitHub · committed build', grades: '6–9', subject: 'Environmental science',
      prod: 'legacy-2026-09', ogd: 'BLOOM', sessions30: 11240,
      staging: [{ ref: 'main', state: 'live', ago: '6 d', sha: '44b91d0', size: '88 MB', tests: 'pass' }],
      releases: [{ v: 'legacy-2026-09', status: 'current', when: 'Sep 1', by: 'Import' }] },
    { slug: 'headlines', title: 'Headlines', repo: '—', engine: 'Unity 2021.3', source: 'Zip upload', grades: '7–12', subject: 'Media literacy',
      prod: 'legacy-2026-09', ogd: 'HEADLINES', sessions30: 6310,
      staging: [{ ref: 'playtest-oct', kind: 'zip', state: 'live', ago: '3 d', sha: '—', size: '118 MB', tests: 'warn' }],
      releases: [{ v: 'legacy-2026-09', status: 'current', when: 'Sep 1', by: 'Import' }] },
    { slug: 'mashopolis', title: 'Mashopolis', repo: '—', engine: 'HTML5', source: 'Imported from DoIT', grades: '4–8', subject: 'Civics',
      prod: 'legacy-2026-09', ogd: null, sessions30: 4480, staging: [],
      releases: [{ v: 'legacy-2026-09', status: 'current', when: 'Sep 1', by: 'Import' }] },
    { slug: 'spacefab', title: 'Spacefab', repo: 'fielddaylab/spacefab', engine: 'Unity 2022.3', source: 'GitHub · CI build', grades: '6–10', subject: 'Engineering',
      prod: null, ogd: 'SPACEFAB', sessions30: 0,
      staging: [
        { ref: 'develop', state: 'building', mins: 31, sha: '6fbe4d7' },
        { ref: 'dev-vault-staging', state: 'live', ago: '1 d', sha: 'f008889', size: '211 MB', tests: 'pass' },
      ], releases: [] },
    { slug: 'airborne-prototype', title: 'Airborne', repo: 'fielddaylab/airborne-prototype', engine: 'Unity 2022.3', source: 'GitHub · CI build', grades: '9–12', subject: 'Environmental health',
      prod: null, ogd: null, sessions30: 0,
      staging: [
        { ref: 'develop', state: 'failed', ago: '40 min', sha: 'c28f1bf', why: 'No free Unity license seat' },
        { ref: 'dev-vault-staging', state: 'live', ago: '1 d', sha: '50c1e6b', size: '174 MB', tests: 'pass' },
      ], releases: [] },
    { slug: 'ais-prototype', title: 'AIS', repo: 'fielddaylab/ais-prototype', engine: 'Unity 2022.3', source: 'GitHub · CI build', grades: '9–12', subject: 'Data science',
      prod: null, ogd: null, sessions30: 0,
      staging: [{ ref: 'dev-vault-staging', state: 'live', ago: '1 d', sha: '3bd8c7c', size: '163 MB', tests: 'pass' }], releases: [] },
  ];

  const dayList = days(91);
  const labels = dayList.map(label);
  const studioSeries = sessionsSeries(7, 5200);
  const aqualabSeries = sessionsSeries(11, 2150);
  const jowilderSeries = sessionsSeries(23, 1180);

  // ---------- OpenGameData (Aqualab) ----------
  const ogd = {
    appId: 'AQUALAB', logVersion: 5, events30: 4126300, sessions30: 38420, players30: 17960, activeMin: 23.4, quality: 99.6,
    eventsPerDay: sessionsSeries(31, 245000),
    topEvents: [
      ['scan_object', 812400], ['click_bestiary', 544100], ['select_species', 431900], ['begin_experiment', 298700], ['end_experiment', 281200],
      ['receive_fact', 262500], ['accept_job', 118300], ['switch_job', 64900], ['complete_job', 71400], ['begin_argument', 52100],
    ],
    jobs: [
      { id: 'kelp-welcome', accepted: 16920, completed: 15880, q: [4, 7, 9, 12, 21] },
      { id: 'kelp-urchin-barren', accepted: 13110, completed: 10270, q: [8, 13, 17, 24, 41] },
      { id: 'bayou-shrimp-tank', accepted: 11040, completed: 8730, q: [6, 10, 14, 19, 33] },
      { id: 'coral-fishy-bizz', accepted: 9120, completed: 6010, q: [11, 18, 24, 31, 52] },
      { id: 'arctic-missing-whale', accepted: 6340, completed: 3690, q: [14, 22, 29, 38, 60] },
      { id: 'bayou-oxygen-model', accepted: 4020, completed: 1730, q: [17, 26, 35, 47, 72] },
    ],
    features: [
      ['2609181014-a7f3', 'WET-FISH-42', 3, 38.2, 6, 41, 12],
      ['2609181022-19bc', 'KELP-OTTER-7', 1, 21.7, 2, 18, 31],
      ['2609181031-f0e2', 'SALTY-SEAL-15', 4, 44.9, 9, 57, 8],
      ['2609181047-6d11', 'CORAL-CRAB-3', 0, 9.3, 0, 6, 64],
      ['2609181102-b832', 'TIDE-TURTLE-28', 2, 31.0, 4, 33, 19],
      ['2609181115-c47a', 'REEF-RAY-11', 2, 27.6, 3, 29, 22],
    ],
    exports: [
      ['2026-08', 'AQUALAB_20260801_to_20260831', '11,204 sessions', '1.2 GB', 'Ready'],
      ['2026-07', 'AQUALAB_20260701_to_20260731', '2,310 sessions', '240 MB', 'Ready'],
      ['2026-06', 'AQUALAB_20260601_to_20260630', '5,882 sessions', '630 MB', 'Ready'],
      ['2026-09', 'AQUALAB_20260901_to_20260930', 'in progress', '—', 'Builds Oct 1'],
    ],
  };

  window.DATA = {
    rng, games, labels, studioSeries, aqualabSeries, jowilderSeries,
    heat: heatmap, hourLabel, sessionsSeries, ogd, DOW,
  };
})();
