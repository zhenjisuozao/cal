// Variables used by Scriptable.
// icon-color: deep-gray; icon-glyph: th-large;
// 「聚焦」四象限小组件 — 数据来自日程看板
const BASE = "https://zhenjisuozao.github.io/cal/653744dd8e57200a0666cdc5/";
const DATA_URL = BASE + "data.json";
const CACHE_KEY = "focus_widget_cache_v1";
const Q = {
  1: { name: "重要且紧急", color: "#ef4444" },
  2: { name: "重要不紧急", color: "#22c55e" },
  3: { name: "紧急不重要", color: "#eab308" },
  4: { name: "不重要不紧急", color: "#9ca3af" },
};
const fg = Color.dynamic(new Color("#111827"), new Color("#f3f4f6"));
const sub = Color.dynamic(new Color("#6b7280"), new Color("#9ca3af"));
const bg = Color.dynamic(new Color("#ffffff"), new Color("#111111"));

function bj(d) { // 北京时间各字段
  const t = new Date(d.getTime() + 8 * 3600e3);
  const p = n => String(n).padStart(2, "0");
  return { date: `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`, hm: `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}` };
}
async function load() {
  let data = null, offline = false;
  try {
    const r = new Request(DATA_URL + "?t=" + Date.now());
    r.timeoutInterval = 10;
    data = await r.loadJSON();
    if (!data || !Array.isArray(data.tasks)) throw new Error("bad");
    Keychain.set(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    offline = true;
    if (Keychain.contains(CACHE_KEY)) data = JSON.parse(Keychain.get(CACHE_KEY));
    else data = { tasks: [] };
  }
  return { data, offline };
}
function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function fmt(t, today) {
  let pre = "";
  if (t.date && t.date !== today) pre = t.date.slice(5).replace("-", "/") + " ";
  return pre + (t.time ? t.time + " " : "") + t.title;
}

async function main() {
  const { data, offline } = await load();
  const now = bj(new Date());
  const today = now.date;
  const tasks = (data.tasks || []).filter(t => !t.done && (!t.date || t.date >= today))
    .sort((a, b) => ((a.date || "9999") + (a.time || "99")).localeCompare((b.date || "9999") + (b.time || "99")));
  const fam = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.backgroundColor = bg;
  w.url = BASE;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60e3);
  w.setPadding(10, 10, 10, 10);

  const head = w.addText(`聚焦 · 更新 ${now.hm}${offline ? " · 离线" : ""}`);
  head.font = Font.mediumSystemFont(10); head.textColor = sub;
  w.addSpacer(4);

  if (fam === "small") {
    const up = tasks.filter(t => t.date === today && (!t.time || t.time >= now.hm)).slice(0, 3);
    const tt = w.addText("今天接下来"); tt.font = Font.boldSystemFont(13); tt.textColor = fg;
    w.addSpacer(4);
    if (!up.length) { const e = w.addText("今天没有更多日程"); e.font = Font.systemFont(12); e.textColor = sub; }
    for (const t of up) {
      const row = w.addStack(); row.centerAlignContent();
      const bar = row.addStack(); bar.size = new Size(3, 26); bar.backgroundColor = new Color(Q[t.q || 4].color); bar.cornerRadius = 1.5;
      row.addSpacer(5);
      const col = row.addStack(); col.layoutVertically();
      const a = col.addText(t.time || "全天"); a.font = Font.semiboldSystemFont(11); a.textColor = new Color(Q[t.q || 4].color);
      const b = col.addText(trunc(t.title, 14)); b.font = Font.systemFont(11); b.textColor = fg; b.lineLimit = 1;
      w.addSpacer(4);
    }
    w.addSpacer();
  } else {
    const max = fam === "large" ? 6 : 2;
    const tl = fam === "large" ? 20 : 14;
    const grid = w.addStack(); grid.layoutVertically();
    for (const pair of [[1, 2], [3, 4]]) {
      const r = grid.addStack();
      for (const q of pair) {
        const c = r.addStack(); c.layoutVertically();
        c.size = new Size(0, 0);
        c.backgroundColor = new Color(Q[q].color, 0.14); c.cornerRadius = 8; c.setPadding(5, 6, 5, 6);
        const h = c.addText(Q[q].name); h.font = Font.boldSystemFont(10); h.textColor = new Color(Q[q].color);
        const list = tasks.filter(t => (t.q || 4) === q);
        if (!list.length) { const e = c.addText("—"); e.font = Font.systemFont(10); e.textColor = sub; }
        for (const t of list.slice(0, max)) {
          const x = c.addText(trunc(fmt(t, today), tl)); x.font = Font.systemFont(10); x.textColor = fg; x.lineLimit = 1;
        }
        if (list.length > max) { const m = c.addText(`+${list.length - max}`); m.font = Font.mediumSystemFont(10); m.textColor = sub; }
        c.addSpacer();
        r.addSpacer(q % 2 ? 6 : 0);
      }
      grid.addSpacer(6);
    }
  }
  if (config.runsInWidget) Script.setWidget(w);
  else if (fam === "small") await w.presentSmall();
  else if (fam === "large") await w.presentLarge();
  else await w.presentMedium();
  Script.complete();
}
await main();
