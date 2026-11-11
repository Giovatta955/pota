// Interazioni del sito in JavaScript semplice (nessuna libreria).
(function () {
  'use strict';
  var CSRF = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'style') el.setAttribute('style', attrs[k]);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function readJson(root) { var s = root.querySelector('script[type="application/json"]'); return s ? JSON.parse(s.textContent) : null; }
  function post(url, data) {
    var fd = new FormData();
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    return fetch(url, { method: 'POST', body: fd, headers: { 'X-CSRF-Token': CSRF }, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ---------- Quiz (correzione sul server) ----------
  function initQuiz(root) {
    var qs = readJson(root) || [];
    var mode = root.getAttribute('data-mode') || 'quiz';
    var i = 0, score = 0;
    function show() {
      clear(root);
      if (i >= qs.length) {
        root.appendChild(h('p', { class: 'alert alert-info', role: 'status' }, ['Hai risposto correttamente a ', h('b', { text: String(score) }), ' domande su ' + qs.length + '.']));
        root.appendChild(h('p', {}, [h('a', { href: location.pathname + location.search, class: 'btn btn-ghost btn-sm', text: 'Nuova serie' })]));
        return;
      }
      var q = qs[i], t0 = Date.now(), done = false;
      var fb = h('div');
      var buttons = q.options.map(function (o) {
        return h('button', { type: 'button', class: 'q-opt', onclick: function () { answer(o.key, this); } }, [h('b', { text: o.key }), o.text]);
      });
      function answer(key, btn) {
        if (done) return;
        done = true;
        buttons.forEach(function (b) { b.disabled = true; });
        btn.classList.add('sel');
        post('/api/risposta', { question_id: q.id, answer: key, mode: mode, time_ms: Date.now() - t0 }).then(function (r) {
          if (!r.ok) {
            done = false;
            buttons.forEach(function (b) { b.disabled = false; });
            btn.classList.remove('sel');
            fb.textContent = r.error === 'login' ? 'Sessione scaduta: accedi di nuovo.' : 'Non è stato possibile salvare la risposta. Riprova.';
            return;
          }
          if (r.correct) score++;
          buttons.forEach(function (b, k) {
            var ok = q.options[k].key === r.correctKey;
            if (ok) b.classList.add('right'); else if (b === btn) b.classList.add('wrong');
          });
          var rep = h('button', { type: 'button', class: 'linkbtn small', text: 'Segnala errore', onclick: function () {
            var note = window.prompt('Cosa non va in questa domanda?');
            if (note && note.trim()) post('/api/segnala', { question_id: q.id, note: note.trim() }).then(function (x) { if (x.ok) { rep.textContent = 'Segnalata, grazie'; rep.disabled = true; } });
          } });
          clear(fb);
          fb.appendChild(h('div', { class: 'q-fb', role: 'status' }, [
            h('p', {}, [h('b', { text: r.correct ? 'Corretto ✔' : 'Sbagliato — la risposta giusta è ' + r.correctKey })]),
            h('p', { text: r.explanation }),
            r.reference ? h('p', { class: 'small muted', text: 'Rif.: ' + r.reference }) : null,
            h('div', { class: 'row-between' }, [rep, h('button', { type: 'button', class: 'btn', text: i + 1 === qs.length ? 'Fine' : 'Avanti', onclick: function () { i++; show(); window.scrollTo(0, root.offsetTop - 70); } })])
          ]));
        });
      }
      root.appendChild(h('div', { class: 'q-head' }, [h('span', { text: 'Domanda ' + (i + 1) + ' / ' + qs.length }), h('span', { text: 'Livello ' + q.level })]));
      root.appendChild(h('p', { class: 'q-stem', text: q.stem }));
      buttons.forEach(function (b) { root.appendChild(b); });
      root.appendChild(fb);
    }
    show();
  }

  // ---------- Flashcard (ripetizione spaziata) ----------
  function initCards(root) {
    var cards = readJson(root) || [];
    var save = root.getAttribute('data-save') === '1';
    var i = 0, flipped = false;
    function show() {
      clear(root);
      if (i >= cards.length) { root.appendChild(h('p', { class: 'alert alert-ok', role: 'status', text: 'Sessione completata 🎉 (' + cards.length + ' carte)' })); return; }
      var c = cards[i];
      root.appendChild(h('div', { class: 'small muted', text: (i + 1) + ' / ' + cards.length }));
      root.appendChild(h('button', { type: 'button', class: 'fc-card' + (flipped ? ' back' : ''), 'aria-label': flipped ? 'Mostra domanda' : 'Mostra risposta', text: flipped ? c.back : c.front, onclick: function () { flipped = !flipped; show(); } }));
      if (!flipped) { root.appendChild(h('p', { class: 'small muted center', text: 'Tocca la carta per girarla' })); return; }
      function grade(known) {
        var go = function () { flipped = false; i++; show(); };
        if (save) post('/api/flashcard', { card_id: c.id, known: known ? '1' : '0' }).then(go, go); else go();
      }
      root.appendChild(h('div', { class: 'grid-2btn' }, [
        h('button', { type: 'button', class: 'btn btn-danger', text: 'Non so', onclick: function () { grade(false); } }),
        h('button', { type: 'button', class: 'btn btn-ok', text: 'So', onclick: function () { grade(true); } })
      ]));
    }
    show();
  }

  // ---------- Mappa concettuale ----------
  var PALETTE = [
    ['#e0f2fe', '#38bdf8', '#082f49', '#0369a1'], ['#d1fae5', '#34d399', '#022c22', '#047857'], ['#fef3c7', '#fbbf24', '#451a03', '#b45309'],
    ['#ffe4e6', '#fb7185', '#4c0519', '#be123c'], ['#ede9fe', '#a78bfa', '#2e1065', '#6d28d9'], ['#ccfbf1', '#2dd4bf', '#042f2e', '#0f766e'], ['#ffedd5', '#fb923c', '#431407', '#c2410c']
  ]; // [sfondo, bordo e linee, testo, frase di collegamento]
  function initMap(root) {
    var tree = readJson(root);
    if (!tree) return;
    var state = new Map(); // nodo -> aperto (vista orizzontale e verticale separate)
    var hView = h('div', { class: 'map-h' }), vView = h('div', { class: 'map-v' });
    function isOpen(key, def) { return state.has(key) ? state.get(key) : def; }
    function setAll(open) {
      walk(tree, 0, 'r', function (n, d, key) { if (n.children && n.children.length) { state.set('h' + key, open || d === 0); state.set('v' + key, open || d === 0); } });
      render();
    }
    function walk(n, d, key, fn) { fn(n, d, key); (n.children || []).forEach(function (c, i) { walk(c, d + 1, key + '.' + i, fn); }); }
    function boxStyle(col) { return col ? 'background:' + col[0] + ';border-color:' + col[1] + ';color:' + col[2] : ''; }

    function branch(n, d, col, key) {
      var kids = n.children || [];
      var open = isOpen('h' + key, d < 2);
      var box = h('div', { class: 'mn-box' + (d === 0 ? ' root' : d === 1 ? ' d1' : ''), style: boxStyle(col) }, [
        h('span', { text: n.title }), n.note ? h('span', { class: 'mn-note', text: n.note }) : null,
        kids.length ? h('button', { type: 'button', class: 'mn-tog', 'aria-expanded': String(open), 'aria-label': (open ? 'Chiudi ' : 'Apri ') + n.title, text: open ? '−' : String(kids.length),
          onclick: function () { state.set('h' + key, !open); render(); } }) : null
      ]);
      var row = h('div', { class: 'mn-row' }, [box]);
      if (kids.length && open) {
        var wrap = h('div', { class: 'mn-kids' });
        kids.forEach(function (c, i) {
          var cc = d === 0 ? PALETTE[i % PALETTE.length] : col;
          var line = 'background:' + cc[1];
          wrap.appendChild(h('div', { class: 'mn-kid' }, [
            kids.length > 1 ? h('span', { class: 'mn-vline' + (i === 0 ? ' first' : i === kids.length - 1 ? ' last' : ''), style: line }) : null,
            h('span', { class: 'mn-h1', style: line }),
            c.rel ? h('span', { class: 'mn-rel', style: 'color:' + cc[3], text: c.rel }) : null,
            h('span', { class: 'mn-h2', style: line }),
            branch(c, d + 1, cc, key + '.' + i)
          ]));
        });
        row.appendChild(wrap);
      }
      return row;
    }
    function vbranch(n, d, col, key) {
      var kids = n.children || [];
      var open = isOpen('v' + key, d < 1);
      var btn = h('button', { type: 'button', class: 'mv-btn' + (d === 0 ? ' root' : ''), style: boxStyle(col) + (d === 1 ? ';font-weight:600' : ''),
        onclick: function () { if (kids.length) { state.set('v' + key, !open); render(); } } },
        [h('span', {}, [h('span', { text: n.title }), n.note ? h('span', { class: 'mn-note', text: n.note }) : null]), kids.length ? h('span', { class: 'mv-count', text: open ? '−' : String(kids.length) }) : null]);
      if (!kids.length) btn.disabled = true; else btn.setAttribute('aria-expanded', String(open));
      var out = h('div', {}, [btn]);
      if (kids.length && open) {
        var wrap = h('div', { class: 'mv-kids' });
        kids.forEach(function (c, i) {
          var cc = d === 0 ? PALETTE[i % PALETTE.length] : col;
          wrap.appendChild(h('div', { class: 'mv-kid', style: 'border-color:' + cc[1] }, [
            c.rel ? h('div', { class: 'mv-rel', style: 'color:' + cc[3], text: '↳ ' + c.rel }) : null,
            vbranch(c, d + 1, cc, key + '.' + i)
          ]));
        });
        out.appendChild(wrap);
      }
      return out;
    }
    function render() { clear(hView); clear(vView); hView.appendChild(branch(tree, 0, null, 'r')); vView.appendChild(vbranch(tree, 0, null, 'r')); }
    clear(root);
    root.appendChild(h('div', { class: 'map-tools' }, [
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Espandi tutto', onclick: function () { setAll(true); } }),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Comprimi tutto', onclick: function () { setAll(false); } }),
      h('span', { class: 'muted', text: 'Tocca un concetto per aprire o chiudere i suoi rami.' })
    ]));
    root.appendChild(hView);
    root.appendChild(vView);
    render();
  }

  // ---------- Esame simulato ----------
  function initExam(root) {
    var qs = readJson(root) || [];
    var id = root.getAttribute('data-id');
    var left = parseInt(root.getAttribute('data-left'), 10) || 0;
    var key = 'exam_' + id, answers = {};
    try { answers = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { answers = {}; }
    var i = 0, sending = false;
    var timerEl = h('span', { class: 'timer', 'aria-label': 'Tempo rimasto' }), countEl = h('span');
    var body = h('div');
    root.appendChild(h('div', { class: 'exam-bar' }, [countEl, timerEl]));
    root.appendChild(body);
    function persist() { try { localStorage.setItem(key, JSON.stringify(answers)); } catch (e) {} }
    function answered() { return Object.keys(answers).filter(function (k) { return answers[k]; }).length; }
    function submit() {
      if (sending) return;
      sending = true;
      post('/api/esame-consegna', { exam_id: id, answers: JSON.stringify(answers) }).then(function (r) {
        if (r.ok) { try { localStorage.removeItem(key); } catch (e) {} location.reload(); }
        else { sending = false; alert('Consegna non riuscita: controlla la connessione e riprova.'); }
      }, function () { sending = false; alert('Consegna non riuscita: controlla la connessione e riprova.'); });
    }
    function tick() {
      var mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, '0'), ss = String(Math.max(0, left % 60)).padStart(2, '0');
      timerEl.textContent = mm + ':' + ss;
      timerEl.className = 'timer' + (left < 300 ? ' low' : '');
      if (left <= 0) { submit(); return; }
      left--;
    }
    function show() {
      clear(body);
      var q = qs[i];
      countEl.textContent = (i + 1) + ' / ' + qs.length + ' · risposte ' + answered();
      body.appendChild(h('p', { class: 'q-stem', text: q.stem }));
      q.options.forEach(function (o) {
        body.appendChild(h('button', { type: 'button', class: 'q-opt' + (answers[q.id] === o.key ? ' sel' : ''), 'aria-pressed': String(answers[q.id] === o.key),
          onclick: function () { answers[q.id] = o.key; persist(); show(); } }, [h('b', { text: o.key }), o.text]));
      });
      var prev = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Indietro', onclick: function () { i--; show(); } });
      prev.disabled = i === 0;
      var next = i < qs.length - 1
        ? h('button', { type: 'button', class: 'btn', text: 'Avanti', onclick: function () { i++; show(); } })
        : h('button', { type: 'button', class: 'btn btn-ok', text: 'Consegna', onclick: function () {
            var miss = qs.length - answered();
            if (!miss || confirm('Hai lasciato ' + miss + ' domande senza risposta. Consegnare?')) submit();
          } });
      body.appendChild(h('div', { class: 'row-between', style: 'margin-top:1rem' }, [prev, next]));
    }
    show();
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Lettori esterni caricati solo dopo il clic ----------
  function initEmbed(root) {
    var btn = root.querySelector('button');
    btn.addEventListener('click', function () {
      clear(root);
      root.appendChild(h('iframe', { src: root.getAttribute('data-src'), allow: 'autoplay; encrypted-media; fullscreen', allowfullscreen: '', loading: 'lazy', title: 'Lettore multimediale' }));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.js-quiz').forEach(initQuiz);
    document.querySelectorAll('.js-cards').forEach(initCards);
    document.querySelectorAll('.js-map').forEach(initMap);
    document.querySelectorAll('.js-exam').forEach(initExam);
    document.querySelectorAll('.js-embed').forEach(initEmbed);
  });
})();
