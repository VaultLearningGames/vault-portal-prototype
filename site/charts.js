// Tiny SVG chart helpers for the prototype. Each returns an HTML string.
// Colors come from CSS tokens (--s1.. series, --seq-* sequential), so both themes work.
// Hover: any element with data-tip shows the shared #tip tooltip; line charts also move a crosshair.
(function () {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
    return step * p;
  }

  function legend(items) {
    return `<div class="legend">${items.map((i) =>
      `<span><i class="${i.kind || ''}" style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;
  }

  function dataTable(head, rows) {
    return `<details class="data-table"><summary>Show as table</summary><div class="tbl-wrap"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }

  // Line chart over a shared x axis. series: [{name, color, values}], labels: x labels.
  function line({ W = 800, series, labels, height = 220, yFmt = fmtInt, tickEvery = 14, area = false, budget = null, table = true, yMax = null }) {
    const H = height, L = 46, R = 14, T = 12, B = 26;
    const all = series.flatMap((s) => s.values);
    const max = yMax || niceMax(Math.max(...all, budget ? budget.value : 0) * 1.05);
    const n = labels.length;
    const x = (i) => L + (i * (W - L - R)) / (n - 1);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4, yy = y(v);
      g += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${esc(yFmt(v))}</text>`;
    }
    for (let i = 0; i < n; i += tickEvery) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
    let paths = '';
    series.forEach((s, si) => {
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      if (area && si === 0) paths += `<path d="${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z" style="fill:${s.color};opacity:.12"/>`;
      paths += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const lv = s.values[n - 1];
      paths += `<circle cx="${x(n - 1)}" cy="${y(lv)}" r="4" style="fill:${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
    });
    if (budget) paths += `<line class="budget" x1="${L}" x2="${W - R}" y1="${y(budget.value)}" y2="${y(budget.value)}"/><text x="${W - R}" y="${y(budget.value) - 5}" text-anchor="end" class="lbl">${esc(budget.label)}</text>`;
    let hits = '';
    const bw = (W - L - R) / (n - 1);
    for (let i = 0; i < n; i++) {
      const tip = `<b>${esc(labels[i])}</b><br>` + series.map((s) => `<span class="sw" style="background:${s.color}"></span>${esc(s.name)}: <b>${esc(yFmt(s.values[i]))}</b>`).join('<br>');
      hits += `<rect class="hit" x="${x(i) - bw / 2}" y="${T}" width="${bw}" height="${H - T - B}" data-tip="${esc(tip)}" data-cx="${x(i)}"/>`;
    }
    const cross = `<line class="cross" x1="-10" x2="-10" y1="${T}" y2="${H - B}" style="opacity:0"/>`;
    const lg = series.length > 1 ? legend(series.map((s) => ({ name: s.name, color: s.color }))) : '';
    const tbl = table ? dataTable(['Date', ...series.map((s) => s.name)], labels.map((l, i) => [l, ...series.map((s) => yFmt(s.values[i]))])) : '';
    return `<div class="chart">${lg}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))} over time">${g}${paths}${cross}${hits}</svg>${tbl}</div>`;
  }

  // Horizontal bars. rows: [{label, value, display?, color?, tip?, sub?}]
  function hbar({ W = 800, rows, max = null, budget = null, fmt = fmtInt, color = 'var(--s1)', labelW = 150, barH = 18, gap = 12, table = false, head = ['Item', 'Value'] }) {
    const L = labelW, R = 64;
    const m = max || niceMax(Math.max(...rows.map((r) => r.value), budget ? budget.value : 0) * 1.02);
    const H = rows.length * (barH + gap) + (budget ? 22 : 6);
    const x = (v) => L + (W - L - R) * (v / m);
    let s = '';
    rows.forEach((r, i) => {
      const yy = i * (barH + gap) + (budget ? 18 : 2);
      const w = Math.max(2, x(r.value) - L);
      const tip = r.tip || `<b>${esc(r.label)}</b><br>${esc(r.display || fmt(r.value))}`;
      s += `<text x="${L - 10}" y="${yy + barH / 2 + 4}" text-anchor="end" class="lbl">${esc(r.label)}</text>`;
      s += `<rect x="${L}" y="${yy}" width="${w}" height="${barH}" rx="4" style="fill:${r.color || color}" data-tip="${esc(tip)}"/>`;
      s += `<text x="${L + w + 6}" y="${yy + barH / 2 + 4}" class="val">${esc(r.display || fmt(r.value))}</text>`;
    });
    if (budget) {
      const bx = x(budget.value);
      s += `<line class="budget" x1="${bx}" x2="${bx}" y1="12" y2="${H}"/><text x="${bx}" y="9" text-anchor="middle" class="lbl">${esc(budget.label)}</text>`;
    }
    const tbl = table ? dataTable(head, rows.map((r) => [r.label, r.display || fmt(r.value)])) : '';
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${s}</svg>${tbl}</div>`;
  }

  // Heatmap: rows x cols matrix, sequential single-hue ramp.
  function heat({ W = 800, rows, cols, values, fmt = fmtInt, colLabel = (c) => c, unit = '' }) {
    const L = 44, T = 4, B = 22, cw = (W - L - 4) / cols.length, ch = 26;
    const H = T + rows.length * ch + B;
    const max = Math.max(...values.flat());
    const steps = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)'];
    let s = '';
    rows.forEach((r, ri) => {
      s += `<text x="${L - 8}" y="${T + ri * ch + ch / 2 + 4}" text-anchor="end" class="lbl">${esc(r)}</text>`;
      cols.forEach((c, ci) => {
        const v = values[ri][ci];
        const k = v <= 0 ? 0 : Math.min(6, 1 + Math.floor((v / max) * 5.999));
        s += `<rect x="${L + ci * cw + 1}" y="${T + ri * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" style="fill:${steps[k]}" data-tip="${esc(`<b>${r} ${colLabel(c)}</b><br>${fmt(v)}${unit}`)}"/>`;
      });
    });
    cols.forEach((c, ci) => { if (ci % 2 === 0) s += `<text x="${L + ci * cw + cw / 2}" y="${H - 6}" text-anchor="middle">${esc(colLabel(c))}</text>`; });
    const scale = `<div class="heat-scale">Fewer${steps.slice(1).map((c) => `<i style="background:${c}"></i>`).join('')}More</div>`;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Heatmap">${s}</svg>${scale}</div>`;
  }

  // Box plots, one per row. rows: [{label, min, q1, med, q3, max, n}]
  function box({ W = 800, rows, unit = ' min', labelW = 170, max = null }) {
    const L = labelW, R = 20, rh = 30, T = 6, B = 24;
    const m = max || niceMax(Math.max(...rows.map((r) => r.max)));
    const H = T + rows.length * rh + B;
    const x = (v) => L + (W - L - R) * (v / m);
    let s = '';
    for (let k = 0; k <= 5; k++) { const v = (m * k) / 5; s += `<line class="gridl" x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}"/><text x="${x(v)}" y="${H - 6}" text-anchor="middle">${Math.round(v)}${unit}</text>`; }
    rows.forEach((r, i) => {
      const cy = T + i * rh + rh / 2;
      const tip = `<b>${esc(r.label)}</b><br>median ${r.med}${unit} · middle half ${r.q1}–${r.q3}${unit}<br>range ${r.min}–${r.max}${unit}${r.n ? ` · ${fmtInt(r.n)} players` : ''}`;
      s += `<text x="${L - 10}" y="${cy + 4}" text-anchor="end" class="lbl">${esc(r.label)}</text>`;
      s += `<line x1="${x(r.min)}" x2="${x(r.max)}" y1="${cy}" y2="${cy}" style="stroke:var(--axis)" stroke-width="1.5"/>`;
      s += `<rect x="${x(r.q1)}" y="${cy - 8}" width="${x(r.q3) - x(r.q1)}" height="16" rx="4" style="fill:var(--s1);opacity:.28;stroke:var(--s1)" stroke-width="1.5" data-tip="${esc(tip)}"/>`;
      s += `<line x1="${x(r.med)}" x2="${x(r.med)}" y1="${cy - 8}" y2="${cy + 8}" style="stroke:var(--s1)" stroke-width="3" stroke-linecap="round"/>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribution">${s}</svg></div>`;
  }

  // Vertical columns (histograms, event rates). bars: [{label, value, tip?}]
  function cols({ W = 800, bars, height = 180, color = 'var(--s1)', fmt = fmtInt, tickEvery = 1, yFmt = fmtInt }) {
    const H = height, L = 42, R = 8, T = 10, B = 24;
    const max = niceMax(Math.max(...bars.map((b) => b.value)) * 1.05);
    const bw = (W - L - R) / bars.length;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let s = '';
    for (let k = 0; k <= 4; k++) { const v = (max * k) / 4; s += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`; }
    bars.forEach((b, i) => {
      const h = Math.max(1, y(0) - y(b.value));
      s += `<rect x="${L + i * bw + 1}" y="${y(0) - h}" width="${Math.max(1, bw - 2)}" height="${h}" rx="${bw > 10 ? 3 : 1}" style="fill:${b.color || color}" data-tip="${esc(b.tip || `<b>${esc(b.label)}</b><br>${fmt(b.value)}`)}"/>`;
      if (i % tickEvery === 0) s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Column chart">${s}</svg></div>`;
  }

  // Tooltip + crosshair wiring (once).
  function wire() {
    const tip = document.getElementById('tip');
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-tip]');
      if (!t) { tip.classList.remove('on'); return; }
      tip.innerHTML = t.getAttribute('data-tip');
      tip.classList.add('on');
      const cx = t.getAttribute('data-cx');
      const svg = t.closest('svg');
      if (cx && svg) { const c = svg.querySelector('.cross'); if (c) { c.setAttribute('x1', cx); c.setAttribute('x2', cx); c.style.opacity = 1; } }
    });
    document.addEventListener('mousemove', (e) => {
      if (!tip.classList.contains('on')) return;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let lx = e.clientX + 14, ly = e.clientY + 14;
      if (lx + w > window.innerWidth - 8) lx = e.clientX - w - 14;
      if (ly + h > window.innerHeight - 8) ly = e.clientY - h - 14;
      tip.style.left = lx + 'px'; tip.style.top = ly + 'px';
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest('[data-cx]');
      if (t) { const c = t.closest('svg')?.querySelector('.cross'); if (c) c.style.opacity = 0; }
    });
  }

  window.Charts = { line, hbar, heat, box, cols, legend, dataTable, wire, niceMax, fmtInt, esc };
})();
