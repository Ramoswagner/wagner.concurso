// ══════════════════════════════════════════════════
// Wagner.Concurso — Contagem 2026, Engenheiro Civil
// app.js
// ══════════════════════════════════════════════════

const CAT_ICONS = {
  portugues:   `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
  raciocinio:  `<circle cx="12" cy="12" r="9"/><path d="M9 9.5a3 3 0 115.2 2C13 12.5 12 13 12 14.5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/>`,
  gerais:      `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  especificos: `<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>`,
  leis:        `<path d="M12 3v18M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0z"/><path d="M5 7h14M9 21h6"/>`
};

const MATERIA_KEYS = ['portugues', 'raciocinio', 'gerais', 'especificos', 'leis'];

let CATS = {};

const S = {
  cat: null, idx: 0, flipped: false,
  mode: 'study', qScore: 0, qTotal: 0, qAnswered: false,
  activeCards: [], selectedTemas: {},
  prog: {}, streak: 0, lastDate: null, daily: {}
};

const _charts = {};

// ── Conquistas ──────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_card', name: 'Primeiro passo',  desc: 'Responda sua primeira questão',    icon: '🎓', condition: s => Object.values(s.prog).length >= 1 },
  { id: 'master_25',  name: 'Candidato',       desc: 'Domine 25 questões',               icon: '🌟', condition: s => Object.values(s.prog).filter(p => p.conf === 'easy').length >= 25 },
  { id: 'master_100', name: 'Aprovado',        desc: 'Domine 100 questões',              icon: '🏆', condition: s => Object.values(s.prog).filter(p => p.conf === 'easy').length >= 100 },
  { id: 'streak_7',   name: 'Disciplina',      desc: 'Estude 7 dias seguidos',           icon: '🔥', condition: s => s.streak >= 7 },
  { id: 'streak_30',  name: 'Reta final',      desc: 'Estude 30 dias seguidos',          icon: '⚡', condition: s => s.streak >= 30 },
  { id: 'quiz_100',   name: 'Simulado de aço', desc: 'Acerte 100 questões no simulado',  icon: '🧠', condition: s => Object.values(s.prog).reduce((a, p) => a + (p.qc || 0), 0) >= 100 }
];
let unlockedAchievements = [];

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!unlockedAchievements.includes(ach.id) && ach.condition(S)) {
      unlockedAchievements.push(ach.id);
      toast(`🏆 ${ach.name}`, 'achievement');
      saveAchievements();
    }
  });
}
function saveAchievements() { try { localStorage.setItem('wc_ach', JSON.stringify(unlockedAchievements)); } catch(e){} }
function loadAchievements() { try { const s = localStorage.getItem('wc_ach'); if (s) unlockedAchievements = JSON.parse(s); } catch(e){} }

// ── Load data ───────────────────────────────────────────────
async function loadAllCategories() {
  try {
    const results = await Promise.all(MATERIA_KEYS.map(async c => {
      const r = await fetch(`data/${c}.json`);
      if (!r.ok) throw new Error(`Falha: ${c}.json`);
      return { [c]: await r.json() };
    }));
    CATS = Object.assign({}, ...results);
    initApp();
  } catch(err) {
    console.error(err);
    document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;color:#FF7A85;">Erro ao carregar. Verifique a pasta /data e recarregue.</div>';
  }
}

function initApp() {
  load();
  loadAchievements();
  updateTotalCount();
  renderHome();
}

// ── Persistence ─────────────────────────────────────────────
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('wc_data') || '{}');
    S.prog = d.prog || {}; S.streak = d.streak || 0;
    S.lastDate = d.lastDate || null; S.daily = d.daily || {};
  } catch(e) {}
  checkStreak();
}
function save() {
  try { localStorage.setItem('wc_data', JSON.stringify({ prog: S.prog, streak: S.streak, lastDate: S.lastDate, daily: S.daily })); } catch(e) {}
}
function checkStreak() {
  const today = new Date().toDateString();
  const yest  = new Date(Date.now() - 864e5).toDateString();
  if (S.lastDate === today) return;
  if (S.lastDate === yest)  S.streak++;
  else if (!S.lastDate)     S.streak = 1;
  else                      S.streak = 0;
  S.lastDate = today; save();
}
function markSeen(id) {
  if (!S.prog[id]) S.prog[id] = { seen: true, conf: null, qc: 0, qt: 0 };
  S.prog[id].seen = true;
  const today = new Date().toDateString();
  S.lastDate = today;
  if (!S.daily) S.daily = {};
  S.daily[today] = (S.daily[today] || 0) + 1;
  save();
}
function updateTotalCount() {
  const total = Object.values(CATS).reduce((a, c) => a + c.cards.length, 0);
  const el = document.getElementById('hs-total-cards');
  if (el) el.textContent = total;
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast on ' + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ── Navigation ───────────────────────────────────────────────
function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nv').forEach(el => el.classList.remove('active'));
  const vEl = document.getElementById('view-' + v);
  if (vEl) vEl.classList.add('active');
  const map = { home: 'nb-home', progress: 'nb-prog', study: 'nb-home', filter: 'nb-home' };
  const btn = document.getElementById(map[v]);
  if (btn) btn.classList.add('active');
  if (v === 'home')     renderHome();
  if (v === 'progress') renderProgress();
}
function goHome() { showView('home'); }

// ── Home ─────────────────────────────────────────────────────
function renderHome() {
  updateHdr();
  const pv = Object.values(S.prog);
  const studied = pv.filter(p => p.seen).length;
  const mastered = pv.filter(p => p.conf === 'easy').length;
  const tQ = pv.reduce((a, p) => a + (p.qt || 0), 0);
  const cQ = pv.reduce((a, p) => a + (p.qc || 0), 0);
  document.getElementById('ov-studied').textContent  = studied;
  document.getElementById('ov-mastered').textContent = mastered;
  document.getElementById('ov-streak').textContent   = S.streak;
  document.getElementById('ov-acc').textContent      = tQ ? Math.round((cQ/tQ)*100)+'%' : '—';

  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  MATERIA_KEYS.forEach((key, i) => {
    const cat = CATS[key];
    const total = cat.cards.length;
    const seen  = cat.cards.filter(c => S.prog[c.id]?.seen).length;
    const mCat  = cat.cards.filter(c => S.prog[c.id]?.conf === 'easy').length;
    const pct   = total ? Math.round((mCat/total)*100) : 0;
    const el = document.createElement('div');
    el.className = 'cat-card';
    el.style.setProperty('--cc', cat.color);
    el.setAttribute('data-num', String(i + 1).padStart(2,'0'));
    el.onclick = () => openMateria(key);
    el.innerHTML = `
      <div class="cc-top">
        <div class="cc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[key]}</svg>
        </div>
        <div class="cc-stat">
          <div class="cc-cnt">${seen}/${total}</div>
          <div class="cc-pct">${pct}%</div>
        </div>
      </div>
      <div class="cc-name">${cat.pt}</div>
      <div class="cc-desc">${cat.desc}</div>
      <div class="cc-bar"><div class="cc-fill" style="width:${pct}%"></div></div>
    `;
    grid.appendChild(el);
  });
}
function updateHdr() {
  const mc = Object.values(S.prog).filter(p => p.conf === 'easy').length;
  document.getElementById('streak-n').textContent = S.streak;
  const mp = document.getElementById('mastery-pill');
  if (mp) mp.innerHTML = `<span>${mc}</span> dominadas`;
}

// ── Tema filter ──────────────────────────────────────────────
function openMateria(catKey) {
  S.cat = catKey;
  if (!S.selectedTemas[catKey]) {
    S.selectedTemas[catKey] = new Set(CATS[catKey].temas.map(t => t.id)); // todos selecionados por padrao
  }
  document.getElementById('ft-title').textContent = CATS[catKey].pt;
  renderTemaGrid();
  showView('filter');
}
function renderTemaGrid() {
  const cat = CATS[S.cat];
  const sel = S.selectedTemas[S.cat];
  const grid = document.getElementById('tema-grid');
  grid.innerHTML = '';
  cat.temas.forEach(t => {
    const n = cat.cards.filter(c => c.tema === t.id).length;
    const row = document.createElement('div');
    row.className = 'tema-row' + (sel.has(t.id) ? ' sel' : '');
    row.innerHTML = `
      <div class="tema-check"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6l3 3 5-6"/></svg></div>
      <div class="tema-name">${t.nome}</div>
      <div class="tema-cnt">${n}</div>
    `;
    row.onclick = () => { if (sel.has(t.id)) sel.delete(t.id); else sel.add(t.id); renderTemaGrid(); };
    grid.appendChild(row);
  });
  const count = cat.cards.filter(c => sel.has(c.tema)).length;
  document.getElementById('ft-count').textContent = `${count} questões selecionadas`;
}
function toggleAllTemas(all) {
  const cat = CATS[S.cat];
  S.selectedTemas[S.cat] = new Set(all ? cat.temas.map(t => t.id) : []);
  renderTemaGrid();
}
function startFromFilter(mode) {
  const cat = CATS[S.cat];
  const sel = S.selectedTemas[S.cat];
  const cards = cat.cards.filter(c => sel.has(c.tema));
  if (!cards.length) { toast('Selecione pelo menos um tema', 'err'); return; }
  S.activeCards = shuffle(cards.slice());
  S.idx = 0; S.flipped = false; S.qScore = 0; S.qTotal = 0;
  document.getElementById('sh-title').textContent = cat.pt;
  showView('study'); setMode(mode);
}
function backToFilter() { renderTemaGrid(); showView('filter'); }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

// ── Study ────────────────────────────────────────────────────
function setMode(mode) {
  S.mode = mode; S.flipped = false;
  document.getElementById('tab-study').classList.toggle('active', mode === 'study');
  document.getElementById('tab-quiz').classList.toggle('active', mode === 'quiz');
  document.getElementById('pane-study').style.display = mode === 'study' ? 'block' : 'none';
  document.getElementById('pane-quiz').style.display  = mode === 'quiz'  ? 'block' : 'none';
  document.getElementById('sh-sub').textContent = mode === 'study' ? 'flashcard' : 'quiz';
  renderCard();
}
function renderCard() {
  const cards = S.activeCards, card = cards[S.idx];
  const dots = document.getElementById('prog-dots');
  if (dots) {
    dots.innerHTML = '';
    const vis = Math.min(cards.length, 14);
    for (let i = 0; i < vis; i++) {
      const d = document.createElement('div');
      d.className = 'pdot' + (i === S.idx ? ' cur' : S.prog[cards[i]?.id]?.seen ? ' done' : '');
      dots.appendChild(d);
    }
  }
  document.getElementById('sh-cnt').textContent = `${S.idx + 1} / ${cards.length}`;
  if (S.mode === 'study') renderStudy(card);
  else renderQuiz(card);
  markSeen(card.id);
}

function isCertoErrado(card) { return card.tipo === 'certoerrado'; }

function renderStudy(card) {
  document.getElementById('flashcard').classList.remove('flipped');
  S.flipped = false;
  document.getElementById('conf-row').style.display = 'none';
  document.getElementById('fc-badge-txt').textContent = card.temaNome || CATS[S.cat].pt;
  document.getElementById('fc-term').textContent = card.enunciado;

  const back = document.getElementById('bk-alts');
  back.innerHTML = '';
  if (isCertoErrado(card)) {
    const row = document.createElement('div');
    row.className = 'bk-alt-row correct';
    row.innerHTML = `<span class="let">GABARITO:</span> ${card.gabarito ? 'CERTO' : 'ERRADO'}`;
    back.appendChild(row);
  } else {
    card.alternativas.forEach(a => {
      const row = document.createElement('div');
      row.className = 'bk-alt-row' + (a.letra === card.correta ? ' correct' : '');
      row.innerHTML = `<span class="let">${a.letra})</span> ${a.texto}`;
      back.appendChild(row);
    });
  }
  document.getElementById('bk-comment').textContent = card.comentario || '—';
}

function renderQuiz(card) {
  document.getElementById('q-tema').textContent = card.temaNome || CATS[S.cat].pt;
  document.getElementById('q-prompt').textContent = card.enunciado;
  document.getElementById('q-score').textContent  = `${S.qScore} corretas de ${S.qTotal}`;
  document.getElementById('q-comment').style.display = 'none';
  S.qAnswered = false;
  const container = document.getElementById('q-opts');
  container.innerHTML = '';

  if (isCertoErrado(card)) {
    [['CERTO', true], ['ERRADO', false]].forEach(([label, val]) => {
      const btn = document.createElement('button');
      btn.className = 'q-opt';
      btn.innerHTML = `<span class="opt-term">${label}</span>`;
      btn.onclick = () => answerQuiz(btn, val === card.gabarito, card);
      container.appendChild(btn);
    });
  } else {
    card.alternativas.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'q-opt';
      btn.dataset.letra = a.letra;
      btn.innerHTML = `<span class="opt-letter">${a.letra}</span><span class="opt-term">${a.texto}</span>`;
      btn.onclick = () => answerQuiz(btn, a.letra === card.correta, card);
      container.appendChild(btn);
    });
  }
}
function answerQuiz(btn, isCorrect, card) {
  if (S.qAnswered) return;
  S.qAnswered = true; S.qTotal++;
  if (!S.prog[card.id]) S.prog[card.id] = { seen: true, qc: 0, qt: 0 };
  S.prog[card.id].qt = (S.prog[card.id].qt || 0) + 1;
  if (isCorrect) {
    btn.classList.add('correct'); S.qScore++;
    S.prog[card.id].qc = (S.prog[card.id].qc || 0) + 1;
    toast('✓ Correto!', 'ok');
  } else {
    btn.classList.add('wrong');
    if (isCertoErrado(card)) {
      document.querySelectorAll('.q-opt').forEach(b => { if (b.textContent.trim() === (card.gabarito ? 'CERTO' : 'ERRADO')) b.classList.add('correct'); });
    } else {
      document.querySelectorAll('.q-opt').forEach(b => { if (b.dataset.letra === card.correta) b.classList.add('correct'); });
    }
    toast('✗ Resposta errada', 'err');
  }
  document.querySelectorAll('.q-opt').forEach(b => b.disabled = true);
  document.getElementById('q-score').textContent = `${S.qScore} corretas de ${S.qTotal}`;
  const cEl = document.getElementById('q-comment');
  if (card.comentario) { cEl.textContent = card.comentario; cEl.style.display = 'block'; }
  save(); checkAchievements();
  setTimeout(nextCard, isCorrect ? 1600 : 3200);
}
function prevCard() { S.idx = (S.idx - 1 + S.activeCards.length) % S.activeCards.length; renderCard(); }
function nextCard() { S.idx = (S.idx + 1) % S.activeCards.length; renderCard(); }
function flipCard() {
  if (S.mode !== 'study') return;
  S.flipped = !S.flipped;
  document.getElementById('flashcard').classList.toggle('flipped', S.flipped);
  document.getElementById('conf-row').style.display = S.flipped ? 'flex' : 'none';
}
function rate(level) {
  const card = S.activeCards[S.idx];
  if (!S.prog[card.id]) S.prog[card.id] = { seen: true };
  S.prog[card.id].conf = level; save(); checkAchievements();
  const msg = { easy: '✓ Dominada!', medium: 'Continue praticando.', hard: 'Vai chegar lá.' };
  toast(msg[level], level === 'easy' ? 'ok' : '');
  nextCard();
}

// ── Progress ─────────────────────────────────────────────────
function renderProgress() {
  const pv = Object.values(S.prog);
  const studied  = pv.filter(p => p.seen).length;
  const mastered = pv.filter(p => p.conf === 'easy').length;
  const tQ = pv.reduce((a,p) => a+(p.qt||0),0);
  const cQ = pv.reduce((a,p) => a+(p.qc||0),0);
  document.getElementById('st-studied').textContent  = studied;
  document.getElementById('st-mastered').textContent = mastered;
  document.getElementById('st-acc').textContent      = tQ ? Math.round((cQ/tQ)*100)+'%' : '—';
  document.getElementById('st-streak').textContent   = S.streak;

  const achGrid = document.getElementById('achievements-grid');
  if (achGrid) {
    achGrid.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = unlockedAchievements.includes(ach.id);
      const el = document.createElement('div');
      el.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
      el.innerHTML = `<div class="achievement-icon">${ach.icon}</div><div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div>`;
      achGrid.appendChild(el);
    });
  }

  const masteryRows = document.getElementById('mastery-rows');
  masteryRows.innerHTML = '';
  MATERIA_KEYS.forEach(key => {
    const cat = CATS[key];
    const total = cat.cards.length;
    const mCat  = cat.cards.filter(c => S.prog[c.id]?.conf === 'easy').length;
    const pct   = total ? Math.round((mCat/total)*100) : 0;
    const row = document.createElement('div');
    row.className = 'm-row';
    row.innerHTML = `
      <div class="m-cat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[key]}</svg>
        ${cat.pt}
      </div>
      <div class="m-bg"><div class="m-fill" style="width:${pct}%; background:${cat.color}"></div></div>
      <div class="m-pct" style="color:${cat.color}">${pct}%</div>
    `;
    masteryRows.appendChild(row);
  });

  renderCharts();
}

function renderCharts() {
  if (_charts.daily) { _charts.daily.destroy(); delete _charts.daily; }
  if (_charts.pie)   { _charts.pie.destroy();   delete _charts.pie;   }

  const ctxDaily = document.getElementById('chart-daily');
  if (ctxDaily) {
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
      data.push(S.daily[d.toDateString()] || 0);
    }
    _charts.daily = new Chart(ctxDaily, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#2862A8', backgroundColor: 'rgba(26,79,138,0.09)', tension: 0.4, fill: true, pointBackgroundColor: '#2862A8', pointRadius: 4, pointHoverRadius: 6, borderWidth: 1.5 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#3A5068', stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { ticks: { color: '#3A5068', font: { size: 11 } }, grid: { display: false } } } }
    });
  }

  const ctxPie = document.getElementById('chart-pie');
  if (ctxPie) {
    const tQ = Object.values(S.prog).reduce((a,p) => a+(p.qt||0),0);
    const cQ = Object.values(S.prog).reduce((a,p) => a+(p.qc||0),0);
    _charts.pie = new Chart(ctxPie, {
      type: 'doughnut',
      data: { labels: ['Acertos','Erros'], datasets: [{ data: tQ > 0 ? [cQ, tQ-cQ] : [1,0], backgroundColor: tQ > 0 ? ['#2862A8','#283E58'] : ['#283E58','#283E58'], borderWidth: 0, hoverOffset: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#7A8FA0', padding: 14, font: { size: 11 } } } } }
    });
  }
}

// ── Keyboard ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const v = document.querySelector('.view.active');
  if (!v || v.id !== 'view-study') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch(e.key) {
    case 'ArrowLeft':  prevCard(); break;
    case 'ArrowRight': nextCard(); break;
    case ' ':          e.preventDefault(); if (S.mode === 'study') flipCard(); break;
    case '1':          if (S.flipped) rate('hard');   break;
    case '2':          if (S.flipped) rate('medium'); break;
    case '3':          if (S.flipped) rate('easy');   break;
  }
});

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadAllCategories);
