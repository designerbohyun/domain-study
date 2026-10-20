// 모든 페이지 공용: 헤더 도구(용어 검색, 테마), 용어 서랍·팝오버, 회차 페이지(목차, 진행 막대, 이전/다음), 목차 페이지, 용어 사전 페이지.
(function () {
  const root = document.body.dataset.root || ".";
  const T = window.TERMS || {};
  const S = window.SESSIONS || [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const fmtDate = iso => { const d = new Date(iso + "T00:00:00"); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`; };
  const now = new Date(), pad = n => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };

  const pager = document.getElementById("pager");
  const cur = pager ? S.find(s => s.no === +pager.dataset.no) : null;
  const glossaryPage = document.getElementById("glossary-app");
  const CATS = ["전체", ...new Set(Object.values(T).map(x => x.c))];
  const sessionLink = n => { const s = S.find(x => x.no === n); return s && s.page ? `<a href="${root}/${s.page}">${n}회차</a>` : `${n}회차`; };
  const inPage = key => document.querySelector(`main button.t[data-t="${key}"]`);
  const termsOf = no => Object.keys(T).filter(k => (T[k].s || []).includes(no));

  function filterTerms({ q = "", cat = "전체", only = null }) {
    const k = q.trim().toLowerCase();
    return Object.entries(T)
      .filter(([key, g]) => (cat === "전체" || g.c === cat) && (!only || (g.s || []).includes(only)) &&
        (!k || key === k || g.n.toLowerCase().includes(k) || g.d.toLowerCase().includes(k)))
      .sort((a, b) => {
        if (k) { const an = a[1].n.toLowerCase().includes(k), bn = b[1].n.toLowerCase().includes(k); if (an !== bn) return an ? -1 : 1; }
        return a[1].n.localeCompare(b[1].n, "ko");
      });
  }
  function mark(text, k) {
    const s = esc(text); if (!k) return s;
    const i = s.toLowerCase().indexOf(esc(k).toLowerCase()); if (i < 0) return s;
    return s.slice(0, i) + "<mark>" + s.slice(i, i + k.length) + "</mark>" + s.slice(i + k.length);
  }
  function termCard(key, g, k, withId) {
    const find = !glossaryPage && inPage(key) ? `<button class="linkish" type="button" data-find="${key}">본문에서 찾기</button>` : "";
    return `<article${withId ? ` id="${key}"` : ""} data-key="${key}"><div class="c">${esc(g.c)}</div><h3>${mark(g.n, k.trim())}</h3><p>${mark(g.d, k.trim())}</p>
      <div class="s"><span class="muted">나온 회차:</span> ${(g.s || []).map(sessionLink).join(", ") || "아직 없음"} · <a href="${root}/structure.html#t=${key}">구조도에서 위치 보기</a>${find ? " · " + find : ""}</div></article>`;
  }

  /* 테마 */
  const THEMES = [["", "시스템"], ["light", "라이트"], ["dark", "다크"]];
  const applyTheme = t => { t ? document.documentElement.setAttribute("data-theme", t) : document.documentElement.removeAttribute("data-theme"); };
  applyTheme(store.get("theme") || "");

  /* 헤더 도구 */
  const navUl = document.querySelector("header.site nav ul:last-child");
  navUl.querySelectorAll("li").forEach(li => { if (li.textContent.trim() === "스터디 목차") li.classList.add("nav-index"); });
  navUl.insertAdjacentHTML("beforeend",
    `<li><button class="hbtn" id="open-gl" type="button" aria-label="용어 검색"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="lbl">용어 검색</span><kbd>/</kbd></button></li>
     <li><button class="hbtn" id="theme" type="button"></button></li>`);
  const themeBtn = document.getElementById("theme");
  const paintTheme = () => { const t = store.get("theme") || ""; const label = THEMES.find(x => x[0] === t)[1]; themeBtn.textContent = { "": "◐", light: "☀", dark: "☾" }[t]; themeBtn.setAttribute("aria-label", `테마: ${label} (눌러서 바꾸기)`); themeBtn.title = `테마: ${label}`; };
  themeBtn.addEventListener("click", () => { const t = store.get("theme") || ""; const n = THEMES[(THEMES.findIndex(x => x[0] === t) + 1) % THEMES.length][0]; store.set("theme", n); applyTheme(n); paintTheme(); });
  paintTheme();

  /* 용어 서랍 (용어 사전 페이지 밖) */
  let drawer = null, openDrawer = () => {}, closeDrawer = () => {};
  if (!glossaryPage) {
    document.body.insertAdjacentHTML("beforeend", `<aside id="gl-drawer" hidden role="dialog" aria-modal="false" aria-labelledby="gl-title">
      <div class="dh"><h2 id="gl-title">용어 사전</h2><div><a href="${root}/glossary.html" class="dl-link">전체 페이지</a><button class="iconbtn" id="gl-close" type="button" aria-label="용어 사전 닫기">×</button></div></div>
      <div class="dt"><input id="d-q" type="search" placeholder="단어나 설명으로 검색" aria-label="용어 검색" autocomplete="off">
      ${cur ? `<div class="seg" id="d-scope"><button class="chip" data-o="${cur.no}" type="button">이 회차 용어</button><button class="chip" data-o="" type="button">전체 용어</button></div>` : ""}
      <div class="seg cats" id="d-cats"></div><div class="note" id="d-count"></div></div>
      <div class="dl" id="d-list"></div></aside>`);
    drawer = document.getElementById("gl-drawer");
    const q = document.getElementById("d-q"), cats = document.getElementById("d-cats"), list = document.getElementById("d-list"), cnt = document.getElementById("d-count"), scope = document.getElementById("d-scope");
    const st = { cat: "전체", only: cur ? cur.no : null };
    const render = () => {
      if (scope) scope.querySelectorAll(".chip").forEach(b => b.classList.toggle("on", (+b.dataset.o || null) === st.only));
      cats.innerHTML = CATS.map(c => `<button class="chip${c === st.cat ? " on" : ""}" data-c="${esc(c)}" type="button">${esc(c)}</button>`).join("");
      const items = filterTerms({ q: q.value, cat: st.cat, only: st.only });
      cnt.textContent = items.length ? `${items.length}개 용어` : "일치하는 용어가 없습니다." + (st.only ? " 전체 용어에서 찾아보세요." : " 다른 단어로 검색해 보세요.");
      list.innerHTML = items.map(([k, g]) => termCard(k, g, q.value, false)).join("");
      list.scrollTop = 0;
    };
    q.addEventListener("input", render);
    cats.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { st.cat = b.dataset.c; render(); } });
    if (scope) scope.addEventListener("click", e => { const b = e.target.closest("[data-o]"); if (b) { st.only = +b.dataset.o || null; render(); } });
    list.addEventListener("click", e => {
      const b = e.target.closest("[data-find]"); if (!b) return;
      const t = inPage(b.dataset.find); if (!t) return;
      if (innerWidth <= 900) closeDrawer(false);
      t.scrollIntoView({ block: "center", behavior: "smooth" });
      t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash");
    });
    document.getElementById("gl-close").addEventListener("click", () => closeDrawer(true));
    openDrawer = (opts = {}) => {
      if ("q" in opts) q.value = opts.q;
      if ("only" in opts) st.only = opts.only;
      st.cat = "전체"; render();
      drawer.hidden = false; document.body.classList.add("drawer-open");
      document.getElementById("open-gl").setAttribute("aria-expanded", "true");
      q.focus(); q.select();
    };
    closeDrawer = refocus => {
      drawer.hidden = true; document.body.classList.remove("drawer-open");
      const ob = document.getElementById("open-gl"); ob.setAttribute("aria-expanded", "false"); if (refocus) ob.focus();
    };
  }
  document.getElementById("open-gl").addEventListener("click", () => {
    if (glossaryPage) { const g = document.getElementById("g-q"); g.focus(); g.select(); return; }
    drawer.hidden ? openDrawer() : closeDrawer(true);
  });

  /* 용어 팝오버 */
  const pop = document.createElement("div");
  pop.id = "pop"; pop.hidden = true; pop.setAttribute("role", "dialog");
  document.body.appendChild(pop);
  let anchor = null;
  function show(btn) {
    const key = btn.dataset.t, g = T[key]; if (!g) return;
    anchor = btn;
    const more = drawer ? `<button class="linkish" type="button" data-open-term="${key}">용어 사전에서 보기</button>` : `<a href="${root}/glossary.html#${key}">용어 사전에서 보기</a>`;
    const onStructure = document.getElementById("structure-app");
    const loc = onStructure ? `<button class="linkish" type="button" data-locate="${key}">구조도에서 위치 보기</button>` : `<a href="${root}/structure.html#t=${key}">구조도에서 위치 보기</a>`;
    pop.innerHTML = `<div class="pk">${esc(g.c)}</div><div class="pn">${esc(g.n)}</div><div>${esc(g.d)}</div><div class="pg">${more} · ${loc}</div>`;
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
    const o = e.target.closest("[data-open-term]");
    if (o) { hide(); openDrawer({ q: T[o.dataset.openTerm].n.split(" (")[0], only: null }); return; }
    if (e.target.closest("[data-open-scope]")) { openDrawer({ q: "", only: cur ? cur.no : null }); return; }
    if (!e.target.closest("#pop")) hide();
  });
  addEventListener("scroll", () => { if (!pop.hidden) hide(); }, { passive: true });
  document.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); document.getElementById("open-gl").click(); }
    else if (e.key === "Escape") { if (!pop.hidden) hide(); else if (drawer && !drawer.hidden) closeDrawer(true); }
  });

  /* 회차 페이지 */
  if (cur) {
    const h1 = document.querySelector(".doc-head h1");
    h1.insertAdjacentHTML("afterend", `<p class="meta"><span>${cur.no}회차 · ${esc(cur.track)}</span><span>모임 ${fmtDate(cur.meet)}</span><button class="linkish" type="button" data-open-scope>이 회차 용어 ${termsOf(cur.no).length}개 보기</button></p>`);
    document.body.insertAdjacentHTML("afterbegin", '<div id="progress" aria-hidden="true"></div>');
    const bar = document.getElementById("progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    document.querySelectorAll("main .part, main section.ch").forEach(n => {
      n.querySelector("h2").insertAdjacentHTML("beforeend", ` <a class="anchor" href="#${n.id}" aria-label="이 부분 링크">#</a>`);
    });
  }

  /* 회차 목차: .part 와 section.ch 에서 자동 생성, 읽는 중인 파트만 펼침 */
  const toc = document.getElementById("toc");
  if (toc) {
    const nodes = [...document.querySelectorAll("main .part, main section.ch")];
    let p = -1;
    toc.innerHTML = nodes.map(n => {
      const h = n.querySelector("h2").firstChild.textContent.trim();
      if (n.classList.contains("part")) { p++; return `<li class="top" data-p="${p}"><a href="#${n.id}">${esc(n.querySelector(".pk").textContent.replace("PART ", ""))}. ${esc(h)}</a></li>`; }
      return `<li class="sub" data-p="${p}"><a href="#${n.id}">${esc(n.querySelector(".ch-num").textContent)} ${esc(h)}</a></li>`;
    }).join("");
    const links = [...toc.querySelectorAll("a")];
    const openPart = pp => toc.querySelectorAll("li.sub").forEach(li => li.classList.toggle("open", li.dataset.p === pp));
    openPart("0");
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => {
        const on = l.getAttribute("href") === "#" + e.target.id;
        l.classList.toggle("on", on);
        if (on) openPart(l.parentElement.dataset.p);
      });
    }), { rootMargin: "-30% 0px -60% 0px" });
    nodes.forEach(n => io.observe(n));
    toc.addEventListener("click", e => { const li = e.target.closest("li"); if (li) openPart(li.dataset.p); if (innerWidth <= 900) toc.closest("details").open = false; });
    if (innerWidth <= 900) toc.closest("details").open = false;
  }

  /* 이전/다음 회차 */
  if (pager) {
    const done = S.filter(s => s.page), i = done.findIndex(s => s.no === cur.no);
    const link = (s, label, cls) => s ? `<a class="${cls}" href="${root}/${s.page}"><small>${label}</small>${s.no}회차 · ${esc(s.topics)}</a>` : "<span></span>";
    pager.innerHTML = link(done[i - 1], "← 이전 회차", "prev") + link(done[i + 1], "다음 회차 →", "next");
  }

  /* 목차 페이지 */
  const app = document.getElementById("sessions-app");
  if (app) {
    const next = S.find(s => s.meet >= today);
    const done = S.filter(s => s.page), latest = done[done.length - 1];
    const tracks = [...new Set(S.map(s => s.track))];
    document.getElementById("stats").innerHTML =
      `<div class="prog"><div class="prog-bar"><i style="width:${done.length / S.length * 100}%"></i></div><span>자료 <b>${done.length}</b> / ${S.length}회차 공개</span></div>
       <div class="facts"><span><b>${tracks.length}</b>개 주제</span><span>용어 <b>${Object.keys(T).length}</b>개</span>${next ? `<span>다음 모임 <b>${next.no}회차 · ${fmtDate(next.meet)}</b></span>` : ""}</div>`;
    document.getElementById("cta").innerHTML =
      (latest ? `<a role="button" href="${latest.page}">최신 자료: ${latest.no}회차 보기</a>` : "") +
      `<a role="button" class="secondary outline" href="${done[0] ? done[0].page : "#"}">1회차부터 읽기</a><button type="button" class="secondary outline" data-open-gl>용어 검색</button>`;
    document.getElementById("cta").addEventListener("click", e => { if (e.target.closest("[data-open-gl]")) openDrawer(); });
    app.innerHTML = tracks.map(tr => {
      const rows = S.filter(s => s.track === tr);
      const pub = rows.filter(s => s.page).length;
      return `<section class="track"><h2>${esc(tr)} <small class="muted">${rows[0].no}~${rows[rows.length - 1].no}회차${pub ? ` · ${pub}개 공개` : ""}</small></h2><div class="tbl"><table>
      <thead><tr><th>회차</th><th>다루는 내용</th><th class="when">모임일</th><th>자료</th></tr></thead><tbody>${
        rows.map(s => `<tr${s.page ? ' class="pub"' : ""}><td>${s.no}회차</td><td>${s.page ? `<a href="${s.page}">${esc(s.topics)}</a>` : esc(s.topics)}${next && next.no === s.no ? '<span class="badge">다음 모임</span>' : ""}<span class="when-sm">${fmtDate(s.meet)}</span></td><td class="when">${fmtDate(s.meet)}</td><td>${s.page ? `<a href="${s.page}">자료 보기</a>` : '<span class="soon">준비 중</span>'}</td></tr>`).join("")
      }</tbody></table></div></section>`;
    }).join("");
  }

  /* 용어 사전 페이지 */
  if (glossaryPage) {
    const q = document.getElementById("g-q"), cats = document.getElementById("g-cats"), cnt = document.getElementById("g-count"), ses = document.getElementById("g-ses");
    const st = { cat: "전체", only: null };
    const used = [...new Set(Object.values(T).flatMap(g => g.s || []))].sort((a, b) => a - b);
    ses.innerHTML = `<button class="chip" data-o="" type="button">모든 회차</button>` + used.map(n => `<button class="chip" data-o="${n}" type="button">${n}회차</button>`).join("");
    function render() {
      ses.querySelectorAll(".chip").forEach(b => b.classList.toggle("on", (+b.dataset.o || null) === st.only));
      cats.innerHTML = CATS.map(c => `<button class="chip${c === st.cat ? " on" : ""}" data-c="${esc(c)}" type="button">${esc(c)}</button>`).join("");
      const items = filterTerms({ q: q.value, cat: st.cat, only: st.only });
      cnt.textContent = items.length ? `${items.length}개 용어` : "일치하는 용어가 없습니다. 다른 단어로 검색해 보세요.";
      glossaryPage.innerHTML = items.map(([k, g]) => termCard(k, g, q.value, true)).join("");
    }
    cats.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { st.cat = b.dataset.c; render(); } });
    ses.addEventListener("click", e => { const b = e.target.closest("[data-o]"); if (b) { st.only = +b.dataset.o || null; render(); } });
    q.addEventListener("input", render);
    render();
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("hit"); } }
  }
})();
