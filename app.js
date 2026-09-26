// Tofi Quant vault site — pulls live data from the public ApeX Omni API.
const VAULT_ID = "2102639973684609024";
const API = "https://omni.apex.exchange/api/v3/vault";
// ApeX uses different vault routes on desktop and mobile, and its desktop site
// bounces phones to the mobile trade page — so link straight to the right one.
// Same mobile check ApeX's own redirect uses.
const IS_MOBILE = window.innerWidth < 1200 &&
  (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const VAULT_URL = IS_MOBILE
  ? "https://m.omni.apex.exchange/en-US/vault/info/" + VAULT_ID
  : "https://omni.apex.exchange/vaultInfo/" + VAULT_ID;
const REFRESH_MS = 60_000;

const I18N = {
  bg: {
    navPerf: "Резултати", navJoin: "Как да се включа", navFaq: "Въпроси",
    eyebrow: "Активен фонд в ApeX Omni", vault: "Фонд",
    lead: "Систематична стратегия с ясни правила за търговия с перпетюъл фючърси в ApeX Omni. Внасяш USDT във фонда, получаваш дялове, а стратегията търгува вместо теб — прозрачно, on-chain и с възможност за изтегляне по всяко време.",
    ctaJoin: "Присъедини се →", ctaPerf: "Виж резултатите",
    tvl: "Активи (TVL)", nav: "Цена на дял (NAV)", ret: "Доходност от старта", mdd: "Макс. спад",
    depositors: "Вложители", age: "Работи от",
    perfTitle: "История на цената на дела", r7: "7Д", r30: "30Д", rAll: "Всичко",
    loading: "Зареждане на живи данни…", updated: "Живи данни от ApeX Omni. Обновено",
    termsTitle: "Условия", tProfit: "Дял от печалбата за мениджъра", tFee: "Такса при внасяне",
    tAsset: "Валута за внасяне", tWithdraw: "Изтегляне", tWithdrawV: "По всяко време, чрез обратно изкупуване на дялове",
    tAddr: "Адрес на фонда",
    whyTitle: "Защо този фонд",
    why1: "Систематична стратегия — без емоционални, импулсивни сделки.",
    why2: "Без попечителство: средствата стоят във фонд-акаунта в ApeX, а не при мениджъра.",
    why3: "Пълна прозрачност: всяка позиция, сделка и стойност на дела са публични в ApeX.",
    why4: "Мениджърът печели само процент от печалбата — интересите ни съвпадат.",
    joinTitle: "Как да се включиш в 4 стъпки",
    s1t: "Отвори фонда", s1d: "Натисни „Присъедини се“, за да отвориш страницата на фонда в ApeX Omni.",
    s2t: "Свържи портфейл", s2d: "Свържи MetaMask, OKX, Bybit или друг поддържан портфейл и създай акаунт в ApeX Omni.",
    s3t: "Внеси USDT", s3d: "Внеси USDT в ApeX акаунта си от която и да е поддържана мрежа.",
    s4t: "Купи дялове", s4d: "На страницата на фонда натисни „Deposit“, въведи сума и потвърди. Дяловете ти следват стойността (NAV) на фонда.",
    faqTitle: "Често задавани въпроси",
    q1: "Кой държи парите ми?", a1: "Депозитът ти стои във фонд-акаунта в ApeX Omni. Мениджърът може да търгува с него, но не може да го изтегли в своя портфейл.",
    q2: "Как да изтегля?", a2: "На страницата на фонда избери „Withdraw“ и продай дяловете си. Стойността им в USDT по текущия NAV се връща в ApeX акаунта ти.",
    q3: "Колко печели мениджърът?", a3: "Процент от печалбата, която ти реализираш (виж Условия). Ако нямаш печалба, мениджърът не взима нищо от теб.",
    q4: "Има ли минимален депозит?", a4: "Минималните суми се определят от ApeX и се виждат на екрана за внасяне във фонда.",
    risk: "Предупреждение за риск: търговията с деривати на криптовалути с ливъридж е силно рискова. Стойността на дяловете може да се понижи и можеш да загубиш част или целия си депозит. Минали резултати не гарантират бъдещи. Нищо в този сайт не е финансов съвет.",
    days: "д", hours: "ч", err: "Неуспешно зареждане на данните. Виж живите резултати директно в",
  },
};

let lang = "en";
const EN = { err: "Could not load live data. See the latest results directly on", days: "d", hours: "h" };
let profile = null;
let series = [];
let range = 0;

const $ = (id) => document.getElementById(id);
const t = (k) => (lang === "bg" ? I18N.bg[k] : EN[k]) ?? EN[k] ?? k;
const pct = (x, digits = 2) => (x >= 0 ? "+" : "") + (x * 100).toFixed(digits) + "%";
const usd = (x) => "$" + Number(x).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const sign = (el, x) => { el.classList.toggle("pos", x > 0); el.classList.toggle("neg", x < 0); };

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (!(k in EN)) EN[k] = el.textContent;
    el.textContent = t(k);
  });
  $("langBtn").textContent = lang === "bg" ? "EN" : "BG";
  if (profile) renderProfile();
  if (series.length) renderChart();
}

function age(ms) {
  const h = Math.floor((Date.now() - ms) / 3_600_000);
  const d = Math.floor(h / 24);
  const dl = lang === "bg" ? t("days") : "d";
  const hl = lang === "bg" ? t("hours") : "h";
  return d > 0 ? `${d}${dl} ${h % 24}${hl}` : `${h}${hl}`;
}

function renderProfile() {
  const v = profile.vault;
  document.querySelectorAll("[data-vault-name]").forEach((el) => (el.textContent = v.name || "Tofi Quant"));
  $("sTvl").textContent = usd(v.tvl);
  $("sNav").textContent = Number(profile.netValue).toFixed(4);
  const all = Number(profile.rateAll);
  $("sRet").textContent = pct(all);
  sign($("sRet"), all);
  $("sMdd").textContent = "-" + (Number(v.maxDrawDown) * 100).toFixed(2) + "%";
  $("sUsers").textContent = profile.vaultUserCount;
  $("sAge").textContent = age(v.createdTime);
  $("tProfit").textContent = (Number(v.shareProfitRatio) * 100).toFixed(0) + "%";
  $("tFee").textContent = (Number(v.purchaseFeeRate) * 100).toFixed(2) + "%";
  $("tAddr").textContent = v.vaultEthAddress;
  $("statusDot").classList.toggle("live", v.status === "VAULT_IN_PROCESS");

  const rows = [["7D", "rate7Day"], ["30D", "rate30Day"], ["90D", "rate90Day"], ["180D", "rate180Day"], ["1Y", "rate365Day"]];
  $("returns").innerHTML = rows.map(([label, key]) => {
    const x = Number(profile[key]);
    const cls = x > 0 ? "pos" : x < 0 ? "neg" : "";
    return `<div><span>${label}</span><b class="${cls}">${pct(x)}</b></div>`;
  }).join("");
}

function renderChart() {
  const box = $("chart");
  const cutoff = range ? Date.now() - range * 86_400_000 : 0;
  const pts = series.filter((p) => p.t >= cutoff);
  if (pts.length < 2) { box.innerHTML = `<p class="muted center">—</p>`; return; }

  const W = box.clientWidth || 800, H = box.clientHeight || 280;
  const pad = { l: 48, r: 8, t: 10, b: 24 };
  const xs = pts.map((p) => p.t), ys = pts.map((p) => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = (y1 - y0) * 0.1 || 0.01; y0 -= m; y1 += m;
  const X = (x) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - (y - y0) / (y1 - y0)) * (H - pad.t - pad.b);

  const up = ys[ys.length - 1] >= ys[0];
  const col = up ? "var(--accent)" : "var(--neg)";
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");
  const area = `${line}L${X(x1)},${H - pad.b}L${X(x0)},${H - pad.b}Z`;

  const ticks = 4;
  let grid = "", yl = "", xl = "";
  for (let i = 0; i <= ticks; i++) {
    const yv = y0 + ((y1 - y0) * i) / ticks, yy = Y(yv);
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/>`;
    yl += `<text x="${pad.l - 6}" y="${yy + 4}" text-anchor="end">${yv.toFixed(3)}</text>`;
  }
  const fmt = new Intl.DateTimeFormat(lang === "bg" ? "bg-BG" : "en-US", { month: "short", day: "numeric" });
  for (let i = 0; i <= 3; i++) {
    const xv = x0 + ((x1 - x0) * i) / 3;
    const anchor = i === 0 ? "start" : i === 3 ? "end" : "middle";
    xl += `<text x="${X(xv)}" y="${H - 6}" text-anchor="${anchor}">${fmt.format(xv)}</text>`;
  }

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Share price chart">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${col}" stop-opacity=".25"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
      </linearGradient></defs>
      <g class="grid">${grid}</g>
      <path d="${area}" fill="url(#g)"/>
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <g class="axis">${yl}${xl}</g>
      <circle id="hov" r="4" fill="${col}" style="display:none"/>
    </svg><div class="tip" id="tip"></div>`;

  const svg = box.querySelector("svg"), tip = $("tip"), hov = $("hov");
  const full = new Intl.DateTimeFormat(lang === "bg" ? "bg-BG" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (W / r.width);
    let best = pts[0];
    for (const p of pts) if (Math.abs(X(p.t) - cx) < Math.abs(X(best.t) - cx)) best = p;
    hov.setAttribute("cx", X(best.t)); hov.setAttribute("cy", Y(best.v)); hov.style.display = "";
    tip.style.display = "block";
    tip.style.left = (X(best.t) * r.width) / W + "px";
    tip.style.top = (Y(best.v) * r.height) / H + "px";
    tip.innerHTML = `<b>${best.v.toFixed(4)}</b> · ${usd(best.tv)}<br><span class="muted">${full.format(best.t)}</span>`;
  };
  const leave = () => { tip.style.display = "none"; hov.style.display = "none"; };
  svg.addEventListener("mousemove", move);
  svg.addEventListener("touchmove", move, { passive: true });
  svg.addEventListener("mouseleave", leave);
  svg.addEventListener("touchend", leave);
}

async function getJSON(path, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(`${API}/${path}?vaultId=${VAULT_ID}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.data) throw new Error(j.msg || "No data");
      return j.data;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 1500 * i));
    }
  }
}

async function load() {
  try {
    const [p, nv] = await Promise.all([getJSON("profile"), getJSON("fund-net-values")]);
    profile = p;
    series = (nv.timeValue || []).map((x) => ({ t: x.timestamp, v: Number(x.netValue), tv: Number(x.totalValue) }));
    renderProfile();
    renderChart();
    $("updated").textContent = new Date().toLocaleTimeString(lang === "bg" ? "bg-BG" : "en-US");
  } catch (e) {
    console.error(e);
    if (!profile) $("chart").innerHTML = `<p class="muted center">${t("err")} <a href="${VAULT_URL}" target="_blank" rel="noopener">ApeX Omni →</a></p>`;
  }
}

document.querySelectorAll("[data-vault-link]").forEach((a) => (a.href = VAULT_URL));
$("year").textContent = new Date().getFullYear();
$("rangeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  range = Number(b.dataset.range);
  $("rangeSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  renderChart();
});
$("langBtn").addEventListener("click", () => {
  lang = lang === "bg" ? "en" : "bg";
  try { localStorage.setItem("tq-lang", lang); } catch {}
  applyLang();
});
window.addEventListener("resize", () => series.length && renderChart());

try { lang = localStorage.getItem("tq-lang") || ((navigator.language || "").startsWith("bg") ? "bg" : "en"); } catch {}
applyLang();
load();
setInterval(load, REFRESH_MS);
