/* ============================================================
   用户洞察 V2 · M3 报告呈现器（共享模块）
   ------------------------------------------------------------
   设计约束（PRD 4.4 / 8.3）：
   1. 本模块是纯字符串模板，零 DOM、零依赖。浏览器直接 import 渲染，
      工人用同一份模块产出 HTML —— 两边结果必然一致。
   2. 渲染层不做任何分析。所有结论、数值、排序均来自入参 JSON。
   3. 不可信输入（评论原文）一律先转义再渲染，只允许 **加粗**、`代码`、
      *斜体* 三种显式标记；禁止原文注入 HTML（防 prompt/HTML 注入）。
   4. M6 佐证绑定校验在 render 前执行，缺佐证直接抛错，不允许降级出片。
   ============================================================ */

export const SCHEMA_VERSION = "2.0.0";

/* ---------------- 转义与小标记 ---------------- */

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 系统字段：先转义 → 还原白名单内联标签 → 再放开 **粗** / `码` / *斜* */
const SAFE_CLASS = new Set(["b", "b-red", "b-amber", "b-green", "b-blue", "b-gray", "b-purple", "mini", "mono"]);
const SAFE_STYLE = new Set([
  "color:var(--red)", "color:var(--green)", "color:var(--blue)", "color:var(--amber)",
  "color:var(--ink)", "color:var(--ink2)", "color:var(--ink3)", "font-weight:800",
]);

/** 不可信输入（买家原文、评论标题）：只转义 + 行内标记，绝不还原任何标签 */
export function plain(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function md(s) {
  let out = esc(s);
  out = out
    .replace(/&lt;br\s*\/?&gt;/g, "<br>")
    .replace(/&lt;(\/?)(strong|em|code)&gt;/g, "<$1$2>")
    .replace(/&lt;span class="([^"]*)"&gt;/g, (m, cls) =>
      cls.trim().split(/\s+/).every((c) => SAFE_CLASS.has(c)) ? `<span class="${cls.trim()}">` : "")
    .replace(/&lt;span style="([^"]*)"&gt;/g, (m, st) =>
      SAFE_STYLE.has(st.trim()) ? `<span style="${st.trim()}">` : "")
    .replace(/&lt;\/span&gt;/g, "</span>");
  return out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/* ---------------- 买家名脱敏（PRD 8.5 强制） ---------------- */

const MASKED_RE = /^[^\s]+\s[^\s]\.$/;

export function maskAuthor(name) {
  const raw = String(name ?? "").trim();
  if (!raw || raw === "Anonymous" || raw === "Amazon Customer") return raw || "Anonymous";
  if (MASKED_RE.test(raw)) return raw;
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return raw;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * 判定是否已脱敏。
 * 注意：亚马逊买家昵称常为单段（"Bailey"、"morgan"、"D"），本身不含姓氏，
 * 无进一步可脱敏内容，视为合规；含空格的则必须已收敛为「名 + 姓氏首字母」。
 */
export function isMasked(name) {
  const raw = String(name ?? "").trim();
  if (!raw || raw === "Anonymous" || raw === "Amazon Customer") return true;
  if (!/\s/.test(raw)) return true;
  return MASKED_RE.test(raw);
}

/* ---------------- M6 可信度层校验 ---------------- */

/**
 * 佐证绑定校验 + 结构完整性校验。
 * 返回 { errors[], warnings[] }。errors 非空时渲染层必须拦截。
 */
export function validateReport(r, opt = {}) {
  const requireEvidence = opt.requireEvidence !== false;
  const strictPrivacy = opt.strictPrivacy !== false;
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);

  if (!r || typeof r !== "object") {
    E("报告 JSON 为空或类型错误");
    return { errors, warnings };
  }

  /* --- 1. 数值字段必须存在且为接口原始值（类型校验） --- */
  const nums = [
    ["meta.rating", r?.meta?.rating],
    ["meta.ratingsCount", r?.meta?.ratingsCount],
    ["meta.price", r?.meta?.price],
  ];
  for (const [k, v] of nums) {
    if (typeof v !== "number" || !Number.isFinite(v)) W(`${k} 非数值或缺失 —— 渲染时显示为「—」`);
  }

  /* --- 2. 佐证四要素 --- */
  const checkEvidence = (list, where) => {
    if (!Array.isArray(list) || list.length === 0) {
      if (requireEvidence) E(`${where}：结论未绑定原声佐证（M6 零容忍）`);
      return;
    }
    list.forEach((e, i) => {
      const miss = [];
      if (!e || !e.author) miss.push("买家名");
      if (typeof e?.star !== "number" || e.star < 1 || e.star > 5) miss.push("星级");
      if (!e?.sku) miss.push("所购变体 SKU");
      if (!e?.text) miss.push("英文原文");
      if (miss.length) E(`${where} 佐证[${i}] 缺四要素：${miss.join("、")}`);
      if (strictPrivacy && e?.author && !isMasked(e.author)) {
        E(`${where} 佐证[${i}] 买家名未脱敏：${e.author}（PRD 8.5 强制「名 + 姓氏首字母」）`);
      }
    });
  };

  /* 维度一 卖点：每条 ≥2 条佐证，且必带 buyerValue */
  const d1 = r?.dimensions?.sellingPoints;
  if (d1?.items?.length) {
    d1.items.forEach((it, i) => {
      checkEvidence(it.evidence, `维度一·卖点[${i}]「${it.point || ""}」`);
      if ((it.evidence || []).length < 2) E(`维度一·卖点[${i}] 佐证不足 2 条`);
      if (!it.buyerValue) E(`维度一·卖点[${i}] 缺「买家实际获得的价值」`);
    });
  } else W("维度一·卖点为空");

  /* 维度二 差评：每条必带严重度、提及数、佐证 */
  const d2 = r?.dimensions?.feedback;
  if (d2?.negative?.items?.length) {
    d2.negative.items.forEach((it, i) => {
      checkEvidence(it.evidence, `维度二·差评[${i}]「${it.title || ""}」`);
      if (!it.severity) E(`维度二·差评[${i}] 缺严重度`);
      if (typeof it.mentions !== "number") W(`维度二·差评[${i}] 缺提及条数`);
    });
  } else W("维度二·差评为空");

  /* 维度三 搜索词：流量骨架数值必须来自接口 */
  const sk = r?.dimensions?.keywords?.skeleton;
  if (sk?.rows?.length) {
    sk.rows.forEach((row, i) => {
      if (typeof row.volume !== "number" && row.volume !== null) E(`维度三·骨架[${i}] 月搜索量非数值`);
      if (row.traffic != null && typeof row.traffic !== "number") E(`维度三·骨架[${i}] 流量占比非数值`);
    });
  } else W("维度三·流量骨架为空");

  /* 维度四 场景：必须带置信度与佐证 */
  const d4 = r?.dimensions?.scenes?.rows;
  if (d4?.length) {
    d4.forEach((row, i) => {
      if (!row.confidence) E(`维度四·场景[${i}]「${row.name || ""}」缺置信度`);
      const zero = row.confidenceTone === "red";
      if (!zero) checkEvidence(row.evidence, `维度四·场景[${i}]「${row.name || ""}」`);
    });
  } else W("维度四·场景为空");

  /* 维度五 顾虑：六字段缺一不可 */
  const d5 = r?.dimensions?.concerns?.rows;
  if (d5?.length) {
    d5.forEach((row, i) => {
      const tag = `维度五·顾虑[${i}]「${row.dimension || ""}」`;
      if (!row.dimension) E(`${tag} 缺顾虑维度`);
      if (!row.stage) E(`${tag} 缺阶段标签`);
      checkEvidence(row.evidence, tag);
      if (!row.psychology) E(`${tag} 缺买家心理痛点（须第一人称独白）`);
      if (!row.listingActions?.length) E(`${tag} 缺 Listing 视觉/文案对策`);
      if (!row.supplyActions?.length) E(`${tag} 缺产品/供应链改善对策`);
      if (!row.expectedEffect) E(`${tag} 缺预计效果（须量化或注明「待验证 + 验证方式」）`);
    });
  } else W("维度五·顾虑为空");

  /* 视觉工坊：三件套必须齐 */
  const sc = r?.visual?.scenes;
  if (sc?.length) {
    sc.forEach((s, i) => {
      const tag = `视觉落地·场景[${i}]「${s.title || ""}」`;
      if (!s.en) E(`${tag} 缺英文 Prompt`);
      if (!s.cn?.length) E(`${tag} 缺中文解析`);
      if (!s.caption?.title) E(`${tag} 缺副图标注文案`);
    });
  } else W("视觉落地为空");

  /* 行动清单：每条动作必带预计效果 */
  const acts = r?.actions;
  if (acts) {
    for (const key of ["p0", "p1", "p2"]) {
      const items = acts[key]?.items;
      if (!Array.isArray(items)) continue;
      items.forEach((it, i) => {
        if (!it.text) E(`行动清单 ${key.toUpperCase()}[${i}] 缺动作描述`);
        if (!it.effect) E(`行动清单 ${key.toUpperCase()}[${i}]「${it.text || ""}」缺预计效果`);
      });
    }
    if (!acts.p0?.items?.length) W("行动清单缺 P0");
  } else W("行动清单缺失");

  /* 数据口径章不可省 */
  if (!r?.credibility?.rows?.length) E("数据口径与局限章节缺失（不可裁剪）");

  return { errors, warnings };
}

/* ---------------- 片段渲染 ---------------- */

function tag(b, kind) {
  const map = { red: "b-red", amber: "b-amber", green: "b-green", blue: "b-blue", gray: "b-gray", purple: "b-purple" };
  return `<span class="b ${map[kind] || "b-gray"}">${esc(b)}</span>`;
}

function stars(n) {
  const v = Math.max(1, Math.min(5, Math.round(Number(n) || 0)));
  return `<span class="stars st${v}">${"★".repeat(v)}${v < 5 ? "" : ""}</span>`;
}

function reviewCard(e) {
  const badges = [
    e.vendor ? tag(e.vendor, "blue") : "",
    e.photo ? tag("含买家实拍图", "gray") : "",
  ].filter(Boolean).join("");
  return `<div class="rev">
  <div class="h"><span class="who">${esc(maskAuthor(e.author))}</span>${stars(e.star)}<span class="sku">${esc(e.sku || "")}</span>${badges}</div>
  <div class="q">${plain(e.text)}</div>
  ${e.comment ? `<div class="cn">→ ${md(e.comment)}</div>` : ""}
</div>`;
}

function evidenceList(list) {
  return (list || []).map(reviewCard).join("\n");
}

function num(v, dash = "—") {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : dash;
}

/* ---------------- 章节渲染 ---------------- */

function chHero(m) {
  const chips = (m.chips || []).map((c) => `<span class="chip">${esc(c.k)} <b>${esc(c.v)}</b></span>`).join("");
  return `<div class="hero">
  <div class="tag">${esc(m.tag || "Amazon US · 用户洞察报告")}</div>
  <h1>${esc(m.title)}<small>${md(m.subtitle || "")}</small></h1>
  <div class="meta">${chips}</div>
</div>`;
}

function chVerdict(v) {
  const cards = (v.scorecards || []).map((c) =>
    `<div class="c ${c.tone || ""}"><div class="k">${esc(c.label)}</div><div class="v">${esc(c.value)}</div><div class="d">${md(c.desc)}</div></div>`
  ).join("");
  const ta = v.topAction;
  return `<h2 id="verdict"><span class="n">结论</span>一句话判断</h2>
<p class="lead">${md(v.lead)}</p>
<div class="score">${cards}</div>
${ta ? `<div class="callout ${ta.tone || "warn"}">
  <p class="t">${esc(ta.title)}</p>
  <p>${md(ta.body)}</p>
</div>` : ""}`;
}

function chBasics(b) {
  const rows = (b.rows || []).map((r) => `<tr><th style="width:190px">${esc(r.k)}</th><td>${md(r.v)}</td></tr>`).join("");
  return `<h2 id="basics"><span class="n">01</span>产品与市场基本盘</h2>
<h3>1.1 商品基础信息（asin_detail）</h3>
<table><tbody>${rows}</tbody></table>
${b.variantIntro ? `<h3>1.2 评论样本结构（关键发现）</h3>
<p>${md(b.variantIntro)}</p>` : ""}`;
}

function chVariantLayering(v) {
  const rows = (v.groups || []).map((g) => `<tr>
  <td><strong>${esc(g.label)}</strong></td>
  <td class="num">${esc(g.count)}</td>
  <td class="num">${esc(g.share)}</td>
  <td class="num" style="color:var(--${g.tone || "ink"});font-weight:800">${esc(g.avg)}</td>
  <td>${md(g.dist)}</td>
  <td>${tag(g.noteText, g.noteTone)} ${md(g.note || "")}</td>
</tr>`).join("");
  const t = v.total || {};
  return `<table class="compact table-scroll">
  <thead><tr><th>颜色分组</th><th class="num">评论数</th><th class="num">占比</th><th class="num">平均星级</th><th>星级分布</th><th>结论</th></tr></thead>
  <tbody>${rows}
  <tr style="background:var(--panel);font-weight:700">
    <td>合计</td><td class="num">${esc(t.count)}</td><td class="num">${esc(t.share)}</td><td class="num">${esc(t.avg)}</td>
    <td colspan="2">${md(t.note || "")}</td>
  </tr></tbody>
</table>
${v.callout ? `<div class="callout ${v.callout.tone || "info"}"><p class="t">${esc(v.callout.title)}</p><p>${md(v.callout.body)}</p></div>` : ""}
${v.note ? `<p class="mini">${md(v.note)}</p>` : ""}`;
}

function chDim1(d) {
  const rows = (d.items || []).map((it) => `<tr>
  <td class="num">${esc(it.idx)}</td>
  <td><strong>${md(it.point)}</strong></td>
  <td>${md(it.buyerValue)}</td>
  <td>${(it.evidence || []).map((e) => `<em>${plain(e.text)}</em> —— ${esc(maskAuthor(e.author))}, ${esc(e.star)}★`).join("<br>")}</td>
</tr>`).join("");
  return `<h2 id="d1"><span class="n">02</span>维度一 · 产品核心卖点提炼</h2>
<p>${md(d.intro)}</p>
<div class="table-scroll"><table>
<thead><tr><th style="width:36px">#</th><th style="width:150px">核心卖点</th><th>买家实际获得的价值</th><th style="width:250px">买家原声佐证</th></tr></thead>
<tbody>${rows}</tbody></table></div>
${d.takeaway ? `<div class="callout good"><p class="t">${esc(d.takeaway.title)}</p><p>${md(d.takeaway.body)}</p></div>` : ""}`;
}

function chDim2(d) {
  const posGroups = (d.positive?.groups || []).map((g) =>
    `<h4>${md(g.title)}</h4>\n${evidenceList(g.evidence)}`).join("\n");
  const negItems = (d.negative?.items || []).map((it) => {
    const contrast = (it.contrast || []).length
      ? `<p class="mini">正向对照：${it.contrast.map((c) => `<em>${plain(c.text)}</em>（${esc(maskAuthor(c.author))}, ${esc(c.star)}★, ${esc(c.sku)}）`).join("；")}</p>`
      : "";
    return `<h4>${esc(it.severity)} ${md(it.title)} ${tag(it.scope || "", it.scopeTone || "red")}</h4>
<p>${md(it.desc)}</p>
${evidenceList(it.evidence)}
${contrast}`;
  }).join("\n");
  return `<h2 id="d2"><span class="n">03</span>维度二 · 用户真实反馈总结</h2>
<h3>3.1 好评核心要点</h3>
${d.positive?.intro ? `<p class="mini">${md(d.positive.intro)}</p>` : ""}
${posGroups}
<div class="hr"></div>
<h3>3.2 差评核心要点（按严重程度排序）</h3>
${d.negative?.intro ? `<p class="mini">${md(d.negative.intro)}</p>` : ""}
${negItems}`;
}

function chDim3(d) {
  const sk = d.skeleton || {};
  const rows = (sk.rows || []).map((r) => `<tr>
  <td>${r.strong ? `<strong>${esc(r.kw)}</strong>` : esc(r.kw)}</td>
  <td class="num">${num(r.volume)}</td>
  <td class="num" ${r.rankStrong ? 'style="font-weight:800;color:var(--green)"' : ""}>${esc(r.rank)}</td>
  <td class="num" ${r.trafficStrong ? 'style="font-weight:800"' : ""}>${r.traffic == null ? "—" : r.traffic.toFixed(2) + "%"}</td>
  <td class="num">${r.buyRate == null ? "—" : r.buyRate.toFixed(2) + "%"}</td>
  <td class="num">${r.bid == null ? "—" : "$" + r.bid.toFixed(2)}</td>
  <td>${tag(r.verdictLabel, r.verdictTone)} ${md(r.verdict || "")}</td>
</tr>`).join("");
  const tail = (sk.tail || []).map((r) => `<tr>
  <td style="color:var(--ink3)">${esc(r.kw)}</td>
  <td class="num">${num(r.volume)}</td>
  <td class="num">${esc(r.rank)}</td>
  <td class="num">${r.traffic == null ? "—" : r.traffic.toFixed(2) + "%"}</td>
  <td class="num">${r.buyRate == null ? "—" : r.buyRate.toFixed(2) + "%"}</td>
  <td class="num">${r.bid == null ? "—" : "$" + r.bid.toFixed(2)}</td>
  <td>${tag(r.verdictLabel, r.verdictTone)} ${md(r.verdict || "")}</td>
</tr>`).join("");
  const cats = (d.categories || []).map((c) => {
    const head = (c.cols || []).map((col, i) => `<th${i > 0 ? ' class="num"' : ""}>${esc(col)}</th>`).join("");
    const body = (c.rows || []).map((row) => `<tr>${row.map((cell, i) => `<td${i > 0 && typeof cell === "string" && /^[\d,.$%#]+$/.test(cell) ? ' class="num"' : ""}>${md(cell)}</td>`).join("")}</tr>`).join("");
    return `<h4>${esc(c.tag)} ${md(c.title)}</h4>
${c.desc ? `<p class="mini">${md(c.desc)}</p>` : ""}
<div class="table-scroll"><table class="compact"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }).join("\n");
  const gaps = (d.gaps || []).map((g) => `<h4>${esc(g.tag)} ${md(g.title)}</h4>
${g.desc ? `<p class="mini">${md(g.desc)}</p>` : ""}
<div class="table-scroll"><table class="compact"><thead><tr>${(g.cols || []).map((c, i) => `<th${i > 0 ? ' class="num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead>
<tbody>${(g.rows || []).map((row) => `<tr>${row.map((cell, i) => `<td${i > 0 ? ' class="num"' : ""}>${md(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("\n");
  return `<h2 id="d3"><span class="n">04</span>维度三 · 用户搜索词体系归纳</h2>
<p>${md(d.intro)}</p>
<h3>4.1 本 ASIN 的真实流量骨架（先看钱从哪来）</h3>
<div class="table-scroll"><table class="compact">
<thead><tr><th>关键词</th><th class="num">月搜索量</th><th class="num">本 ASIN 自然排名</th><th class="num">流量占比</th><th class="num">购买率</th><th class="num">PPC 竞价</th><th>判定</th></tr></thead>
<tbody>${rows}
<tr style="background:var(--panel);font-weight:700"><td colspan="3">${esc(sk.summary?.label || "")}</td><td class="num">${esc(sk.summary?.value || "")}</td><td colspan="3">${md(sk.summary?.note || "")}</td></tr>
${tail}</tbody></table></div>
${sk.callout ? `<div class="callout warn"><p class="t">${esc(sk.callout.title)}</p><p>${md(sk.callout.body)}</p></div>` : ""}
<h3>4.2 四类搜索词体系</h3>
${cats}
${gaps}
${d.conclusion ? `<div class="callout info"><p class="t">${esc(d.conclusion.title)}</p><p>${md(d.conclusion.body)}</p></div>` : ""}`;
}

function chDim4(d) {
  const rows = (d.rows || []).map((r) => `<tr>
  <td class="num"><strong>${esc(r.rank)}</strong></td>
  <td><strong>${md(r.name)}</strong>${r.en ? `<br><span class="mini">${esc(r.en)}</span>` : ""}</td>
  <td class="num"><strong>${esc(r.mentions)}</strong><br>${esc(r.share)}</td>
  <td>${tag(r.confidence, r.confidenceTone)}</td>
  <td>${(r.evidence || []).map((e) => `<em>${plain(e.text)}</em> —— ${esc(maskAuthor(e.author))}, ${esc(e.star)}★, ${esc(e.sku)}`).join("<br>")}${r.notes ? `<br>${md(r.notes)}` : ""}</td>
</tr>`).join("");
  return `<h2 id="d4"><span class="n">05</span>维度四 · 典型使用场景梳理</h2>
<p class="mini">${md(d.intro)}</p>
<div class="table-scroll"><table>
<thead><tr><th style="width:44px">排序</th><th style="width:190px">使用场景</th><th class="num" style="width:110px">提及频次 / 占比</th><th style="width:90px">置信度</th><th>真实买家引用佐证</th></tr></thead>
<tbody>${rows}</tbody></table></div>
${d.conclusion ? `<div class="callout good"><p class="t">${esc(d.conclusion.title)}</p><p>${md(d.conclusion.body)}</p></div>` : ""}`;
}

function chDim5(d) {
  const rows = (d.rows || []).map((r) => `<tr>
  <td><strong>${md(r.dimension)}</strong><br>${tag(r.stage, r.stageTone)}${r.mentions ? `<br><span class="mini">${esc(r.mentions)}</span>` : ""}</td>
  <td>${md(r.psychology)}</td>
  <td>${(r.evidence || []).map((e) => `<em>${plain(e.text)}</em> —— ${esc(maskAuthor(e.author))}, ${esc(e.star)}★, ${esc(e.sku)}`).join("<br>")}${(r.contrast || []).length ? `<br><span class="b b-green">正向对照</span> ` + r.contrast.map((c) => `<em>${plain(c.text)}</em> —— ${esc(maskAuthor(c.author))}, ${esc(c.star)}★, ${esc(c.sku)}`).join("；") : ""}</td>
  <td>${(r.listingActions || []).map((a) => md(a)).join("<br><br>")}</td>
  <td>${(r.supplyActions || []).map((a) => md(a)).join("<br><br>")}</td>
</tr>`).join("");
  const p = d.priority || {};
  return `<h2 id="d5"><span class="n">06</span>维度五 · 消费者购买顾虑与对策</h2>
<p class="mini">${md(d.intro)}</p>
<div class="table-scroll"><table>
<thead><tr><th style="width:112px">顾虑维度</th><th style="width:150px">买家心理痛点</th><th style="width:210px">评论依据（原声）</th><th style="width:245px">Listing 视觉 / 文案对策</th><th>产品 / 供应链改善对策</th></tr></thead>
<tbody>${rows}</tbody></table></div>
${p.title ? `<div class="callout warn"><p class="t">${esc(p.title)}</p><p>${["p0", "p1", "p2"].map((k) => p[k] ? `<strong>${k.toUpperCase()}：</strong>${md(p[k])}<br>` : "").join("")}</p></div>` : ""}`;
}

function chVisual(v) {
  const scenes = (v.scenes || []).map((s) => `<div class="prompt" data-scene="${s.idx}">
  <div class="ph"><span style="font-weight:700">场景 ${esc(s.idx)} ${esc(s.title)}</span><span>${esc(s.subtitle || "")}</span>
    <button class="copy-btn no-print" data-copy-scene="${s.idx}" type="button">复制 Prompt</button></div>
  <div class="pb">
    <div class="lbl">English Prompt（nano banana 2）</div>
    <div class="en-wrap"><div class="en">${esc(s.en)}</div></div>
    ${s.negative ? `<div class="lbl">负向提示词</div><div class="neg">${esc(s.negative)}</div>` : ""}
    <div class="lbl">中文解析</div>
    <div class="cnbox">${(s.cn || []).map((c) => `<b>${esc(c.k)}：</b>${md(c.v)}`).join("<br>")}</div>
    <div class="lbl">副图标注文案建议</div>
    <div class="caption">
      <b>主标题：</b>${md(s.caption?.title || "")}<br>
      ${s.caption?.subtitle ? `<b>副标题：</b>${md(s.caption.subtitle)}<br>` : ""}
      ${(s.caption?.badges || []).length ? `<b>角标/徽章：</b>${s.caption.badges.map((b) => esc(b)).join(" ｜ ")}<br>` : ""}
      ${s.caption?.layout ? `<b>排版提示：</b>${md(s.caption.layout)}<br>` : ""}
      ${s.caption?.note ? `<b>时机建议：</b>${md(s.caption.note)}` : ""}
    </div>
  </div>
</div>`).join("\n");
  return `<h2 id="visual"><span class="n">07</span>视觉落地 · Top ${(v.scenes || []).length} 场景副图 AI 摄影提示词</h2>
<p>${md(v.intro)}</p>
${v.sharedNegative ? `<p class="mini">通用负向提示词（各组均适用）：<code>${esc(v.sharedNegative)}</code></p>` : ""}
${scenes}`;
}

function chActions(a) {
  const block = (k, label, tone, when, title) => {
    const items = a[k]?.items || [];
    if (!items.length) return "";
    return `<div class="pr ${k}">
  <div class="t">${tag(label, tone)}${esc(when)}</div>
  <ul>${items.map((it) => `<li>${md(it.text)} —— <span class="mini">预计效果：${md(it.effect)}</span></li>`).join("")}</ul>
</div>`;
  };
  return `<h2 id="actions"><span class="n">08</span>行动清单（直接可批量执行）</h2>
${block("p0", "P0", "red", a.p0?.when || "本周内 · 直接影响评分与退货率")}
${block("p1", "P1", "amber", a.p1?.when || "两周内 · 提升转化率与自然排名")}
${block("p2", "P2", "green", a.p2?.when || "季度级 · 结构性增长机会")}`;
}

function chCredibility(c) {
  const rows = (c.rows || []).map((r) => `<tr><th style="width:170px">${esc(r.k)}</th><td>${md(r.v)}</td></tr>`).join("");
  return `<h2 id="credibility"><span class="n">09</span>数据口径与局限说明</h2>
<table class="compact"><tbody>${rows}</tbody></table>`;
}

function chFoot(f) {
  return `<div class="foot">
  <p><strong>${esc(f.title)}</strong><br>${esc(f.line2)}<br>${esc(f.line3)}</p>
</div>`;
}

/* ---------------- 主入口 ---------------- */

const ANCHORS = [
  ["verdict", "结论"], ["basics", "01 基本盘"], ["d1", "02 卖点"], ["d2", "03 反馈"],
  ["d3", "04 搜索词"], ["d4", "05 场景"], ["d5", "06 顾虑对策"],
  ["visual", "07 视觉落地"], ["actions", "08 行动清单"], ["credibility", "09 数据口径"],
];

/**
 * 渲染完整报告正文（不含 <html>/<head>，可直接内联进页面容器）
 * @param {object} r 报告 JSON
 * @param {object} opt { strict:true 校验失败即抛错；showAnchors:true 输出页内锚点条 }
 * @returns {{html:string, errors:string[], warnings:string[]}}
 */
export function renderReport(r, opt = {}) {
  const strict = opt.strict !== false;
  const { errors, warnings } = validateReport(r, opt);
  if (errors.length && strict) {
    const e = new Error(`M6 可信度层拦截：${errors.length} 项佐证/结构校验未通过`);
    e.code = "EVIDENCE_BINDING_FAILED";
    e.details = errors;
    throw e;
  }
  const parts = [
    chHero(r.meta || {}),
    chVerdict(r.verdict || {}),
    chBasics(r.basics || {}),
    chVariantLayering(r.variantLayering || {}),
    chDim1(r.dimensions?.sellingPoints || {}),
    chDim2(r.dimensions?.feedback || {}),
    chDim3(r.dimensions?.keywords || {}),
    chDim4(r.dimensions?.scenes || {}),
    chDim5(r.dimensions?.concerns || {}),
    chVisual(r.visual || {}),
    chActions(r.actions || {}),
    chCredibility(r.credibility || {}),
    chFoot(r.footer || {}),
  ];
  const anchors = opt.showAnchors === false ? "" : `<div class="anchorbar no-print"><div class="inner">${
    ANCHORS.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join("")
  }</div>`;
  return { html: anchors + `<div class="wrap">${parts.join("\n")}</div>`, errors, warnings };
}

/** 完整 HTML 单文件（供工人产出与导出下载） */
export function renderReportDocument(r, opt = {}) {
  const { html, errors, warnings } = renderReport(r, { ...opt, showAnchors: false });
  const title = `${r?.meta?.asin || ""} 用户洞察报告 | ${r?.meta?.marketplace || "US"}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
${opt.css ? `<style>${opt.css.replace(/<\/style/gi, "<\\/style")}</style>` : '<link rel="stylesheet" href="../assets/tokens.css">'}
<style>body{background:var(--bg);}@media print{.wrap{padding:0;max-width:none;}}</style>
</head>
<body>
${html}
</body>
</html>`;
}

export default { SCHEMA_VERSION, renderReport, renderReportDocument, validateReport, maskAuthor, isMasked, esc, md };
