/**
 * JavaScript do site gerado. Sai como app.js ao lado das paginas.
 * Sem dependencia e sem rede: tudo roda a partir do file:// tambem.
 */
export const APP_JS = `(function(){
  'use strict';

  /* ---- tema ---- */
  var root = document.documentElement;
  var CHAVE = 'doczilla-tema';
  var salvo = null;
  try { salvo = localStorage.getItem(CHAVE); } catch (e) { salvo = null; }
  if (salvo === 'dark' || salvo === 'light') root.setAttribute('data-theme', salvo);

  var botao = document.getElementById('themer');
  if (botao) {
    botao.addEventListener('click', function(){
      var escuroDoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var atual = root.getAttribute('data-theme') || (escuroDoSistema ? 'dark' : 'light');
      var novo = atual === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', novo);
      try { localStorage.setItem(CHAVE, novo); } catch (e) { /* modo privado */ }
    });
  }

  /* ---- sumario acompanha a rolagem ---- */
  var linksToc = [].slice.call(document.querySelectorAll('.toc a'));
  if (linksToc.length && 'IntersectionObserver' in window) {
    var alvos = linksToc
      .map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    var marcar = function(id){
      linksToc.forEach(function(a){
        a.classList.toggle('cur', a.getAttribute('href') === '#' + id);
      });
    };

    var observador = new IntersectionObserver(function(entradas){
      var visiveis = entradas.filter(function(e){ return e.isIntersecting; });
      if (visiveis.length) marcar(visiveis[0].target.id);
    }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });

    alvos.forEach(function(el){ observador.observe(el); });
    if (alvos[0]) marcar(alvos[0].id);
  }

  /* ---- busca ---- */
  var campo = document.getElementById('q');
  if (!campo || !window.DOCZILLA_INDICE) return;

  var indice = window.DOCZILLA_INDICE;
  var saida = document.getElementById('resultados');
  var contador = document.getElementById('contador');
  var filtros = [].slice.call(document.querySelectorAll('.fchip'));
  var tipoAtivo = 'todos';

  function semAcento(texto){
    return String(texto).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  }

  function escapar(texto){
    return String(texto).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* Recorta o trecho ao redor da primeira ocorrencia, para o resultado mostrar
     o termo em contexto em vez do comeco do documento sempre. */
  function trecho(texto, termo){
    var alvo = semAcento(texto);
    var pos = alvo.indexOf(termo);
    if (pos < 0) return escapar(texto.slice(0, 210)) + (texto.length > 210 ? '…' : '');
    var ini = Math.max(0, pos - 70);
    var fim = Math.min(texto.length, pos + termo.length + 150);
    var corte = texto.slice(ini, fim);
    var deslocamento = pos - ini;
    var antes = escapar(corte.slice(0, deslocamento));
    var meio = escapar(corte.slice(deslocamento, deslocamento + termo.length));
    var depois = escapar(corte.slice(deslocamento + termo.length));
    return (ini > 0 ? '…' : '') + antes + '<mark>' + meio + '</mark>' + depois + (fim < texto.length ? '…' : '');
  }

  function pontuar(doc, termo){
    var titulo = semAcento(doc.title);
    var corpo = semAcento(doc.texto);
    var card = semAcento(doc.card || '');
    var tags = semAcento((doc.tags || []).join(' '));
    var pontos = 0;
    if (titulo.indexOf(termo) >= 0) pontos += 100;
    if (titulo.indexOf(termo) === 0) pontos += 40;
    if (card.indexOf(termo) >= 0) pontos += 80;
    if (tags.indexOf(termo) >= 0) pontos += 30;
    var ocorrencias = corpo.split(termo).length - 1;
    pontos += Math.min(ocorrencias, 12) * 4;
    return pontos;
  }

  function render(){
    var termo = semAcento(campo.value.trim());
    var base = tipoAtivo === 'todos' ? indice : indice.filter(function(d){ return d.type === tipoAtivo; });

    var achados = base;
    if (termo) {
      achados = base
        .map(function(d){ return { doc: d, pontos: pontuar(d, termo) }; })
        .filter(function(x){ return x.pontos > 0; })
        .sort(function(a, b){ return b.pontos - a.pontos; })
        .map(function(x){ return x.doc; });
    }

    contador.textContent = achados.length + (achados.length === 1 ? ' resultado' : ' resultados');

    if (!achados.length) {
      saida.innerHTML = '<div class="vazio">Nenhum documento corresponde a <b>' + escapar(campo.value.trim()) + '</b>.</div>';
      return;
    }

    saida.innerHTML = achados.map(function(d){
      var chips = '<span class="chip" style="--c:var(--' + d.token + ')">' + escapar(d.tipoLabel) + '</span>';
      if (d.card) chips += '<span class="chip" style="--c:var(--violet-lift)">' + escapar(d.card) + '</span>';
      if (d.status) chips += '<span class="st ' + d.tom + '">' + escapar(d.status) + '</span>';
      return '<a class="res" href="' + d.href + '">'
        + '<div class="res-top">' + chips + '</div>'
        + '<h3>' + escapar(d.title) + '</h3>'
        + '<p>' + trecho(d.texto, termo) + '</p>'
        + '<code class="rp">' + escapar(d.relPath) + '</code>'
        + '</a>';
    }).join('');
  }

  filtros.forEach(function(botao){
    botao.addEventListener('click', function(){
      tipoAtivo = botao.getAttribute('data-tipo');
      filtros.forEach(function(b){
        b.setAttribute('aria-pressed', String(b === botao));
      });
      render();
    });
  });

  campo.addEventListener('input', render);

  var q = new URLSearchParams(window.location.search).get('q');
  if (q) campo.value = q;
  render();
  campo.focus();
})();
`;

/** Injetado apenas por `doczilla serve`: recarrega a pagina quando o build corre. */
export const LIVERELOAD_JS = `(function(){
  var atual = null;
  setInterval(function(){
    fetch('/__versao', { cache: 'no-store' })
      .then(function(r){ return r.text(); })
      .then(function(v){
        if (atual === null) { atual = v; return; }
        if (v !== atual) window.location.reload();
      })
      .catch(function(){ /* servidor caiu; tenta de novo no proximo tick */ });
  }, 1000);
})();
`;
