(() => {
  // 언어: 한 페이지 안에서 전환. 글자는 data-l 쌍을 CSS 로 숨기고, 속성은 data-*-en 으로 바꾼다
  const root = document.documentElement;
  const ATTRS = ["src", "alt", "aria-label", "href", "content"];
  const langBtns = [...document.querySelectorAll("[data-set-lang]")];
  function setLang(l) {
    root.dataset.lang = l; root.lang = l;
    document.querySelectorAll(ATTRS.map(a => `[data-${a}-en]`).join(",")).forEach(el => {
      ATTRS.forEach(a => {
        const en = el.getAttribute(`data-${a}-en`);
        if (en === null) return;
        if (!el.hasAttribute(`data-${a}-ko`)) el.setAttribute(`data-${a}-ko`, el.getAttribute(a) || "");
        el.setAttribute(a, l === "en" ? en : el.getAttribute(`data-${a}-ko`));
      });
    });
    langBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.setLang === l));
    try { localStorage.setItem("cellfie-lang", l); } catch (e) {}
  }
  let saved = null;
  try { saved = localStorage.getItem("cellfie-lang"); } catch (e) {}
  setLang(saved || ((navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en"));
  langBtns.forEach(b => b.addEventListener("click", () => setLang(b.dataset.setLang)));

  const DUR = 7000;
  const slides = [...document.querySelectorAll(".slide")];
  const shots = [...document.querySelectorAll(".screen img")];
  const heads = [...document.querySelectorAll(".hero-text h1")];
  const tabs = [...document.querySelectorAll(".hero-tabs .pill")];
  const bar = document.getElementById("bar");
  const cur = document.getElementById("cur");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx = 0, timer = null;

  function runBar() {
    bar.classList.remove("run");
    bar.style.setProperty("--dur", DUR + "ms");
    void bar.offsetWidth;
    if (!reduce) bar.classList.add("run");
  }
  function restart() {
    clearTimeout(timer);
    runBar();
    if (!reduce) timer = setTimeout(() => go((idx + 1) % slides.length), DUR);
  }
  function go(n) {
    if (n === idx) return;
    const prev = heads[idx];
    prev.classList.remove("on"); prev.classList.add("out"); prev.setAttribute("aria-hidden", "true");
    setTimeout(() => prev.classList.remove("out"), 650);
    slides[idx].classList.remove("on");
    shots[idx].classList.remove("on");
    idx = n;
    slides[idx].classList.add("on");
    shots[idx].classList.add("on");
    heads[idx].classList.add("on"); heads[idx].removeAttribute("aria-hidden");
    tabs.forEach((t, i) => t.setAttribute("aria-selected", i === idx));
    cur.textContent = String(idx + 1).padStart(2, "0");
    restart();
  }
  tabs.forEach((t, i) => t.addEventListener("click", () => go(i)));
  document.addEventListener("visibilitychange", () => document.hidden ? clearTimeout(timer) : restart());
  restart();

  // 헤더: 히어로를 지나면 흰 배경
  const gnb = document.getElementById("gnb"), hero = document.querySelector(".hero");
  const onScroll = () => gnb.classList.toggle("solid", scrollY > hero.offsetHeight - 80);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // 모바일 메뉴
  const menu = document.getElementById("menu");
  menu.addEventListener("click", () => menu.setAttribute("aria-expanded", gnb.classList.toggle("open")));
  gnb.querySelectorAll("nav a").forEach(a => a.addEventListener("click", () => { gnb.classList.remove("open"); menu.setAttribute("aria-expanded", false); }));

  // 화면 밖 요소만 스크롤 등장
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll(".fx").forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); }
  });
})();
