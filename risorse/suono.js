/* GG84 — un «ping» di sonar a ogni scorrimento. Nessun dato salvato.
   I browser permettono l'audio solo dopo un gesto del visitatore: ad ogni tocco, clic o tasto si prova ad accenderlo,
   finché il browser non lo concede (la sola rotellina del mouse, per i browser, non basta). */
(() => {
  "use strict";
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const prova = /[?&]prova-suono\b/.test(location.search);
  const VOLUME = 0.1;     // molto soft: il ping si sente appena
  const PAUSA = 350;      // ms senza scorrere: oltre, il prossimo scorrimento è un gesto nuovo
  const DISTANZA = 1250;  // ms minimi tra un ping e l'altro
  let ctx = null, uscita, ping = null, acceso = false;

  /* il file si scarica subito (40 kB); si decodifica quando il browser concede l'audio */
  const file = fetch("risorse/sonar.mp3").then(r => r.arrayBuffer()).catch(() => null);

  const GESTI = ["pointerdown", "pointerup", "mousedown", "touchstart", "touchend", "click", "keydown"];
  const prova_accendere = () => {
    if (acceso) return;
    if (!ctx) {
      ctx = new AC();
      uscita = ctx.createGain(); uscita.gain.value = VOLUME;
      const ovatta = ctx.createBiquadFilter(); ovatta.type = "lowpass"; ovatta.frequency.value = 1400; ovatta.Q.value = 0.5;   // toglie la punta acuta
      uscita.connect(ovatta).connect(ctx.destination);
      file.then(dati => dati && ctx.decodeAudioData(dati.slice(0), b => { ping = b; }, () => {}));
    }
    const via = () => {
      if (ctx.state !== "running" || acceso) return;
      acceso = true;
      GESTI.forEach(t => removeEventListener(t, prova_accendere, true));
      if (prova) document.documentElement.dataset.suono = "acceso";
    };
    const r = ctx.resume();
    r && r.then ? r.then(via, () => {}) : via();
  };
  GESTI.forEach(t => addEventListener(t, prova_accendere, { capture: true, passive: true }));

  /* un ping all'inizio di ogni scorrimento, con un'unica regola:
     - suono acceso e pronto;
     - è un gesto nuovo (prima almeno PAUSA ms fermi), non uno scatto della rotellina;
     - nessun ping sta ancora suonando, e dall'ultimo sono passati almeno DISTANZA ms.
     Per non stancare, ping vicini uno all'altro si fanno via via più leggeri (fino a un terzo);
     dopo qualche secondo di quiete il ping torna al suo livello. */
  let ultimoScorrimento = 0, ultimoPing = 0, fatica = 0, suonando = false;
  addEventListener("scroll", () => {
    const ora = performance.now(), gestoNuovo = ora - ultimoScorrimento > PAUSA;
    ultimoScorrimento = ora;
    if (!(acceso && ping && ctx.state === "running" && gestoNuovo && !suonando && ora - ultimoPing > DISTANZA)) return;
    fatica = Math.max(0, fatica - (ora - ultimoPing) / 3000); ultimoPing = ora;
    const g = ctx.createGain(); g.gain.value = Math.max(0.33, 1 - fatica * 0.25);
    fatica = Math.min(fatica + 1, 3);
    const s = ctx.createBufferSource(); s.buffer = ping; s.connect(g).connect(uscita);
    suonando = true; s.onended = () => { suonando = false; };
    s.start();
    if (prova) document.documentElement.dataset.ping = String(+(document.documentElement.dataset.ping || 0) + 1);
  }, { passive: true });

  /* scheda nascosta: silenzio */
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !acceso) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  /* se parte l'audio del video, il ping si abbassa */
  const reel = document.getElementById("reel");
  reel && reel.addEventListener("volumechange", () => {
    if (ctx) uscita.gain.setTargetAtTime(reel.muted ? VOLUME : VOLUME * 0.25, ctx.currentTime, 0.2);
  });
})();
