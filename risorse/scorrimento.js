/* GG84 — effetti allo scorrimento. Niente librerie esterne, niente cookie, niente dati salvati. */
(() => {
  "use strict";
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, d = document) => d.querySelector(s);
  const $$ = (s, d = document) => [...d.querySelectorAll(s)];
  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* quanto una sezione è stata percorsa: 0 quando entra dal basso, 1 quando esce in alto */
  const avanzamento = (el, inizio = 1, fine = 0) => {
    const r = el.getBoundingClientRect(), h = innerHeight;
    return limita((h * inizio - r.top) / (r.height + h * (inizio - fine)));
  };

  document.documentElement.classList.add("pronto");

  /* ── comparse allo scorrimento, a cascata nei gruppi ── */
  const gruppi = new Map();
  $$("[data-rivela]").forEach(el => {
    const g = el.parentElement;
    const i = (gruppi.get(g) || 0); gruppi.set(g, i + 1);
    el.style.setProperty("--ritardo", Math.min(i * 0.09, 0.45) + "s");
  });
  const osserva = new IntersectionObserver(voci => voci.forEach(v => {
    if (v.isIntersecting) { v.target.classList.add("visto"); osserva.unobserve(v.target); }
  }), { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
  $$("[data-rivela]").forEach(el => osserva.observe(el));

  /* ── numeri che contano ── */
  const contatore = new IntersectionObserver(voci => voci.forEach(v => {
    if (!v.isIntersecting) return;
    const el = v.target, fine = +el.dataset.conta; contatore.unobserve(el);
    if (calmo || fine === 0) { el.textContent = fine; return; }
    const t0 = performance.now(), dur = 1400;
    const passo = t => { const k = limita((t - t0) / dur); el.textContent = Math.round(fine * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(passo); };
    el.textContent = "0"; requestAnimationFrame(passo);
  }), { threshold: 0.6 });
  $$("[data-conta]").forEach(el => contatore.observe(el));

  /* ── parole della dichiarazione, una alla volta ── */
  const dich = $("#dichiarazione");
  const spezza = nodo => [...nodo.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement("span"); s.className = "parola"; s.textContent = p; f.appendChild(s);
      });
      n.replaceWith(f);
    } else if (n.nodeType === 1) spezza(n);
  });
  if (dich) spezza(dich);
  const parole = $$(".parola", dich || document);

  /* ── video: parte quando si vede, si ferma quando esce ── */
  const reel = $("#reel"), audio = $("#audio");
  if (reel) {
    new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { reel.preload = "auto"; const p = reel.play(); if (p) p.catch(() => {}); }
      else reel.pause();
    }), { threshold: 0.45 }).observe(reel);
    audio && audio.addEventListener("click", () => {
      reel.muted = !reel.muted;
      audio.setAttribute("aria-pressed", String(!reel.muted));
      audio.textContent = reel.muted ? "Attiva l'audio" : "Disattiva l'audio";
      if (!reel.muted) { const p = reel.play(); if (p) p.catch(() => {}); }
    });
  }

  /* ── tutto ciò che segue lo scorrimento ── */
  const barra = $("#barra"), riga = $(".progresso span"), centro = $(".ingresso-centro");
  const nome = $("#nome"), formula = $("#formula"), tessere = $$("#formula .tessera"), lineaTempo = $("#linea-tempo");
  const principi = $("#principi"), frasi = $$(".principi .frase"), tacche = $$(".tacche i"), anello = $("#anello"), indice = $("#indice");
  const passi = $("#passi"), telefono = $("#telefono"), licenza = $("#licenza");
  const giro = 2 * Math.PI * 92;
  let ultimo = -1;

  const aggiorna = () => {
    const y = scrollY, h = innerHeight, tot = document.documentElement.scrollHeight - h;
    riga && (riga.style.transform = `scaleX(${tot > 0 ? y / tot : 0})`);
    barra && barra.classList.toggle("visibile", y > h * 0.75);

    if (!calmo) {
      /* entrata: sale piano e si dissolve */
      if (centro && y < h * 1.2) {
        const k = limita(y / (h * 0.85));
        centro.style.transform = `translateY(${y * 0.32}px) scale(${1 - k * 0.08})`;
        centro.style.opacity = String(1 - k);
      }
      /* G + G + 84 → GG84: le tre tessere partono lontane e si uniscono */
      if (formula) {
        const r = formula.getBoundingClientRect();
        const k = limita((h * 0.95 - r.top) / (h * 0.55));
        const e = 1 - Math.pow(1 - k, 3), dist = Math.min(innerWidth * 0.22, 240);
        tessere.forEach(t => { t.style.transform = `translateX(${(+t.dataset.da) * dist * (1 - e)}px)`; });
        formula.style.setProperty("--unite", e);
        tessere.forEach(t => { const s = t.querySelector("small"); if (s) s.style.opacity = String(0.35 + 0.65 * e); });
      }
      /* telefono che si raddrizza entrando */
      if (telefono) {
        const k = avanzamento(telefono, 1, 0);
        telefono.style.setProperty("--ry", `${(0.5 - k) * 26}deg`);
        telefono.style.setProperty("--rx", `${(k - 0.5) * 10}deg`);
      }
    }

    /* linea del tempo che si riempie */
    if (lineaTempo) {
      const r = lineaTempo.getBoundingClientRect();
      lineaTempo.style.setProperty("--avanza", limita((h * 0.7 - r.top) / r.height));
    }

    /* principi: palco fermo, una frase ogni quinto di sezione */
    if (principi && !calmo) {
      const r = principi.getBoundingClientRect();
      const k = limita(-r.top / (r.height - h));
      const n = Math.min(frasi.length - 1, Math.floor(k * frasi.length));
      if (n !== ultimo) {
        frasi.forEach((f, i) => { f.classList.toggle("attiva", i === n); f.classList.toggle("passata", i < n); });
        tacche.forEach((t, i) => t.classList.toggle("accesa", i <= n));
        indice && (indice.textContent = String(n + 1).padStart(2, "0"));
        ultimo = n;
      }
      anello && (anello.style.strokeDashoffset = String(giro * (1 - k)));
    }

    /* filo tra i tre passi */
    if (passi) {
      const r = passi.getBoundingClientRect();
      passi.style.setProperty("--avanza", limita((h * 0.85 - r.top) / (h * 0.6)));
    }

    /* licenza: le parole si accendono mentre la frase attraversa lo schermo */
    if (parole.length && licenza) {
      const r = dich.getBoundingClientRect();
      const k = calmo ? 1 : limita((h * 0.85 - r.top) / (h * 0.5));
      const accese = Math.round(k * parole.length);
      parole.forEach((p, i) => p.classList.toggle("accesa", i < accese));
    }
  };

  let inAttesa = false;
  const pianifica = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(() => { inAttesa = false; aggiorna(); }); } };
  addEventListener("scroll", pianifica, { passive: true });
  addEventListener("resize", pianifica);
  aggiorna();

  /* ── sfondo: polvere di bit che sale piano, segue appena lo scorrimento ── */
  const tela = $("#bit");
  if (!tela || calmo) return;
  const ctx = tela.getContext("2d");
  let L, A, dpr, punti = [];
  const prepara = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    L = tela.width = innerWidth * dpr; A = tela.height = innerHeight * dpr;
    const quanti = Math.round(Math.min(90, innerWidth * innerHeight / 16000));
    punti = Array.from({ length: quanti }, () => ({
      x: Math.random() * L, y: Math.random() * A, r: (Math.random() * 1.4 + 0.4) * dpr,
      v: (Math.random() * 0.25 + 0.06) * dpr, a: Math.random() * 0.5 + 0.15, p: Math.random() * 0.6 + 0.2
    }));
  };
  prepara(); addEventListener("resize", prepara);
  let yPrima = scrollY, attivo = true;
  document.addEventListener("visibilitychange", () => { attivo = !document.hidden; if (attivo) requestAnimationFrame(disegna); });
  function disegna() {
    if (!attivo) return;
    const dy = (scrollY - yPrima) * dpr; yPrima = scrollY;
    ctx.clearRect(0, 0, L, A);
    for (const q of punti) {
      q.y -= q.v + dy * q.p * 0.35;
      if (q.y < -10) { q.y = A + 10; q.x = Math.random() * L; }
      if (q.y > A + 10) { q.y = -10; q.x = Math.random() * L; }
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.2832);
      ctx.fillStyle = `rgba(58, 207, 29, ${q.a})`; ctx.shadowColor = "rgba(58, 207, 29, .9)"; ctx.shadowBlur = 8 * dpr; ctx.fill();
    }
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
})();
