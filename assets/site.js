// 모든 페이지 공용: 용어 팝오버, 회차 페이지 목차·이전/다음, 목차 페이지, 용어 사전 페이지.
(function () {
  const root = document.body.dataset.root || ".";
  const T = window.TERMS || {};
  const S = window.SESSIONS || [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const fmtDate = iso => { const d = new Date(iso + "T00:00:00"); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`; };
  const now = new Date(), pad = n => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  /* 용어 팝오버 */
  const pop = document.createElement("div");
  pop.id = "pop"; pop.hidden = true; pop.setAttribute("role", "dialog");
  document.body.appendChild(pop);
  let anchor = null;
  function show(btn) {
    const g = T[btn.dataset.t]; if (!g) return;
    anchor = btn;
    pop.innerHTML = `<div class="pk">${esc(g.c)}</div><div class="pn">${esc(g.n)}</div><div>${esc(g.d)}</div><div class="pg"><a href="${root}/glossary.html#${btn.dataset.t}">용어 사전에서 보기</a></div>`;
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = Math.min(Math.max(16, r.left), innerWidth - pw - 16) + "px";
    let y = r.bottom + 8; if (y + ph > innerHeight - 16) y = Math.max(16, r.top - ph - 8);
    pop.style.top = y + "px";
  }
  const hide = () => { pop.hidden = true; anchor = null; };
  document.addEventListener("click", e => {
    const t = e.target.closest("button.t");
    if (t) { e.preventDefault(); anchor === t ? hide() : show(t); return; }
    if (!e.target.closest("#pop")) hide();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
  addEventListener("scroll", () => { if (!pop.hidden) hide(); }, { passive: true });

  /* 회차 페이지 목차: .part 와 section.ch 에서 자동 생성 */
  const toc = document.getElementById("toc");
  if (toc) {
    const nodes = [...document.querySelectorAll("main .part, main section.ch")];
    toc.innerHTML = nodes.map(n => {
      const h = n.querySelector("h2").textContent;
      if (n.classList.contains("part")) return `<li class="top"><a href="#${n.id}">${esc(n.querySelector(".pk").textContent.replace("PART ", ""))}. ${esc(h)}</a></li>`;
      return `<li class="sub"><a href="#${n.id}">${esc(n.querySelector(".ch-num").textContent)} ${esc(h)}</a></li>`;
    }).join("");
    const links = [...toc.querySelectorAll("a")];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(l => l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-30% 0px -60% 0px" });
    nodes.forEach(n => io.observe(n));
    if (innerWidth <= 900) toc.closest("details").open = false;
  }

  /* 회차 페이지 이전/다음 */
  const pager = document.getElementById("pager");
  if (pager) {
    const no = +pager.dataset.no, done = S.filter(s => s.page);
    const i = done.findIndex(s => s.no === no);
    const link = (s, label) => s ? `<a href="${root}/${s.page}"><small>${label}</small>${s.no}회차 · ${esc(s.topics)}</a>` : "<span></span>";
    pager.innerHTML = link(done[i - 1], "이전 회차") + link(done[i + 1], "다음 회차");
  }

  /* 목차 페이지 */
  const app = document.getElementById("sessions-app");
  if (app) {
    const next = S.find(s => s.meet >= today);
    const tracks = [...new Set(S.map(s => s.track))];
    document.getElementById("stats").innerHTML =
      `<span><b>${S.length}</b>회차</span><span><b>${tracks.length}</b>개 주제</span><span>자료 <b>${S.filter(s => s.page).length}</b>개 공개</span><span>용어 <b>${Object.keys(T).length}</b>개</span>` +
      (next ? `<span>다음 모임 <b>${next.no}회차 · ${fmtDate(next.meet)}</b></span>` : "");
    app.innerHTML = tracks.map(tr => `<section class="track"><h2>${esc(tr)}</h2><div class="tbl"><table>
      <thead><tr><th>회차</th><th>다루는 내용</th><th>모임일</th><th>자료</th></tr></thead><tbody>${
        S.filter(s => s.track === tr).map(s => `<tr><td>${s.no}회차</td><td>${esc(s.topics)}${next && next.no === s.no ? '<span class="badge">다음 모임</span>' : ""}</td><td class="when">${fmtDate(s.meet)}</td><td>${s.page ? `<a href="${s.page}">자료 보기</a>` : '<span class="soon">준비 중</span>'}</td></tr>`).join("")
      }</tbody></table></div></section>`).join("");
  }

  /* 용어 사전 페이지 */
  const gl = document.getElementById("glossary-app");
  if (gl) {
    const q = document.getElementById("g-q"), cats = document.getElementById("g-cats"), cnt = document.getElementById("g-count");
    const CATS = ["전체", ...new Set(Object.values(T).map(x => x.c))];
    let cat = "전체";
    const sessionLink = n => { const s = S.find(x => x.no === n); return s && s.page ? `<a href="${s.page}">${n}회차</a>` : `${n}회차`; };
    function render() {
      cats.innerHTML = CATS.map(c => `<button class="chip${c === cat ? " on" : ""}" data-c="${esc(c)}" type="button">${esc(c)}</button>`).join("");
      const k = q.value.trim().toLowerCase();
      const items = Object.entries(T)
        .filter(([, g]) => (cat === "전체" || g.c === cat) && (!k || g.n.toLowerCase().includes(k) || g.d.toLowerCase().includes(k)))
        .sort((a, b) => a[1].n.localeCompare(b[1].n, "ko"));
      cnt.textContent = items.length ? `${items.length}개 용어` : "일치하는 용어가 없습니다. 다른 단어로 검색해 보세요.";
      gl.innerHTML = items.map(([key, g]) => `<article id="${key}"><div class="c">${esc(g.c)}</div><h3>${esc(g.n)}</h3><p>${esc(g.d)}</p><div class="s muted">나온 회차: ${(g.s || []).map(sessionLink).join(", ")}</div></article>`).join("");
    }
    cats.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; render(); } });
    q.addEventListener("input", render);
    render();
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("hit"); } }
  }
})();
