/**
 * Folha de estilo unica do site gerado.
 *
 * Sai como styles.css ao lado das paginas. Nao ha CDN nem webfont: a wiki
 * precisa abrir por duplo clique, sem rede. A familia tipografica e a stack
 * grotesca do sistema, e o tema claro/escuro e resolvido por tokens.
 */
export const CSS = `
:root{
  --ground:#040404; --ground-2:#0C0C0E;
  --panel:rgba(219,219,219,.055); --panel-2:rgba(219,219,219,.03);
  --line:rgba(219,219,219,.14); --line-strong:rgba(219,219,219,.26);
  --text:#FAFAFA; --text-2:#B4B4BC; --text-mute:#82828E;
  --violet:#5728FF; --violet-lift:#8B7BFF; --green:#1CE65D;
  --t-entend:#8B7BFF; --t-spec:#6A50FF; --t-arq:#00B8D9;
  --t-bug:#FF4D6D; --t-entrega:#1CE65D; --t-regra:#FFB020;
  --ok:#1CE65D; --warn:#FFB020; --crit:#FF4D6D; --neutro:#82828E;
  --r-lg:26px; --r-md:16px; --r-sm:10px;
  --font:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;
  --mono:ui-monospace,"Cascadia Mono","Cascadia Code",Consolas,"SF Mono",monospace;
  --maxw:1240px;
  color-scheme:dark;
}
@media (prefers-color-scheme: light){
  :root{
    --ground:#FFFFFF; --ground-2:#F3F3F6;
    --panel:#FFFFFF; --panel-2:#FAFAFB;
    --line:rgba(4,4,4,.11); --line-strong:rgba(4,4,4,.22);
    --text:#080809; --text-2:#3A3A44; --text-mute:#63636E;
    --violet-lift:#5728FF; --green:#0C9E42;
    --t-entend:#6A55E8; --t-spec:#5728FF; --t-arq:#0A8FA8;
    --t-bug:#D92846; --t-entrega:#0C9E42; --t-regra:#A96A00;
    --ok:#0C9E42; --warn:#A96A00; --crit:#D92846; --neutro:#63636E;
    color-scheme:light;
  }
}
:root[data-theme="dark"]{
  --ground:#040404; --ground-2:#0C0C0E;
  --panel:rgba(219,219,219,.055); --panel-2:rgba(219,219,219,.03);
  --line:rgba(219,219,219,.14); --line-strong:rgba(219,219,219,.26);
  --text:#FAFAFA; --text-2:#B4B4BC; --text-mute:#82828E;
  --violet-lift:#8B7BFF; --green:#1CE65D;
  --t-entend:#8B7BFF; --t-spec:#6A50FF; --t-arq:#00B8D9;
  --t-bug:#FF4D6D; --t-entrega:#1CE65D; --t-regra:#FFB020;
  --ok:#1CE65D; --warn:#FFB020; --crit:#FF4D6D; --neutro:#82828E;
  color-scheme:dark;
}
:root[data-theme="light"]{
  --ground:#FFFFFF; --ground-2:#F3F3F6;
  --panel:#FFFFFF; --panel-2:#FAFAFB;
  --line:rgba(4,4,4,.11); --line-strong:rgba(4,4,4,.22);
  --text:#080809; --text-2:#3A3A44; --text-mute:#63636E;
  --violet-lift:#5728FF; --green:#0C9E42;
  --t-entend:#6A55E8; --t-spec:#5728FF; --t-arq:#0A8FA8;
  --t-bug:#D92846; --t-entrega:#0C9E42; --t-regra:#A96A00;
  --ok:#0C9E42; --warn:#A96A00; --crit:#D92846; --neutro:#63636E;
  color-scheme:light;
}

*{box-sizing:border-box;}
html{scroll-behavior:smooth; scroll-padding-top:96px;}
body{
  margin:0; background:var(--ground); color:var(--text);
  font-family:var(--font); font-size:16px; line-height:1.55;
  -webkit-font-smoothing:antialiased;
}
a{color:inherit; text-decoration:none;}
:focus-visible{outline:2px solid var(--green); outline-offset:3px; border-radius:4px;}
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto;}
  *{transition:none !important; animation:none !important;}
}

/* ---------- topbar ---------- */
.topbar{
  position:sticky; top:14px; z-index:50;
  width:calc(100% - 36px); max-width:var(--maxw); margin:14px auto 0;
  display:flex; align-items:center; gap:22px;
  padding:11px 12px 11px 24px;
  background:#0A0A0C; border:1px solid rgba(219,219,219,.13);
  border-radius:var(--r-lg); box-shadow:0 18px 44px rgba(0,0,0,.34);
}
.brand{display:flex; align-items:center; gap:11px; flex-shrink:0; color:#FAFAFA;}
.brand-mark{width:26px; height:26px; border-radius:8px; flex-shrink:0;
  background:linear-gradient(140deg,#5728FF,#8B7BFF 55%,#1CE65D);}
.brand-name{font-size:19px; font-weight:700; letter-spacing:-.025em;}
.brand-div{width:1px; height:19px; background:rgba(219,219,219,.24);}
.brand-sub{font-family:var(--mono); font-size:9.5px; line-height:1.25;
  color:#82828E; letter-spacing:.04em; text-transform:uppercase; max-width:15ch;}
.nav{display:flex; gap:2px; margin-left:auto; flex-wrap:wrap;}
.nav a{font-size:14.5px; color:#B4B4BC; padding:8px 15px; border-radius:999px;
  transition:color .18s, background .18s;}
.nav a:hover{color:#FAFAFA; background:rgba(219,219,219,.08);}
.nav a[aria-current="page"]{color:#040404; background:#FAFAFA; font-weight:600;}
.themer{appearance:none; cursor:pointer; flex-shrink:0; width:38px; height:38px;
  border-radius:999px; border:1px solid rgba(219,219,219,.22); background:transparent;
  color:#FAFAFA; font-size:15px; line-height:1;}
.themer:hover{background:rgba(219,219,219,.1);}
@media (max-width:900px){
  .topbar{flex-wrap:wrap; gap:12px; padding:14px 16px;}
  .nav{margin-left:0; width:100%;}
  .brand-sub{display:none;}
}

/* ---------- shell ---------- */
.wrap{width:calc(100% - 36px); max-width:var(--maxw); margin:0 auto; padding-bottom:96px;}
.sec{padding-top:56px;}
.sec-head{border-top:1px solid var(--line-strong); padding-top:18px;
  display:grid; grid-template-columns:minmax(200px,.9fr) 2fr; gap:28px;
  align-items:start; margin-bottom:26px;}
.sec-head.bare{border-top:0; padding-top:0;}
.sec-label{display:flex; align-items:center; gap:10px; font-size:13px;
  letter-spacing:.13em; text-transform:uppercase; color:var(--text); font-weight:500;}
.sec-label::before{content:""; width:9px; height:9px; border-radius:50%;
  background:currentColor; flex-shrink:0;}
.sec-lead{color:var(--text-2); font-size:16px; max-width:64ch; margin:0;}
.sec-lead b{color:var(--text); font-weight:700;}
@media (max-width:820px){ .sec-head{grid-template-columns:1fr; gap:12px;} }

/* ---------- hero ---------- */
.hero{margin-top:26px; padding:56px 48px 44px; background:#050506;
  border-radius:var(--r-lg); border:1px solid rgba(219,219,219,.1);
  position:relative; overflow:hidden;}
.hero::after{content:""; position:absolute; right:-160px; top:-190px;
  width:640px; height:640px; border-radius:50%;
  background:radial-gradient(circle,rgba(87,40,255,.42),rgba(87,40,255,0) 66%);
  pointer-events:none;}
.hero>*{position:relative; z-index:1;}
.eyebrow{font-family:var(--mono); font-size:11.5px; letter-spacing:.15em;
  text-transform:uppercase; color:#8A8A94; margin:0 0 22px;}
.hero h1{margin:0; font-size:clamp(32px,4.4vw,58px); line-height:1.04;
  letter-spacing:-.035em; font-weight:500; color:#FAFAFA; text-wrap:balance; max-width:26ch;}
.hero h1 em{font-style:normal; color:#1CE65D;}
.hero p{color:#B4B4BC; max-width:62ch; margin:22px 0 0; font-size:17px;}
.hero code{font-family:var(--mono); font-size:14px; color:#FAFAFA;}
@media (max-width:700px){ .hero{padding:38px 24px 32px;} }

.btnrow{display:flex; align-items:center; gap:12px; margin-top:34px; flex-wrap:wrap;}
.pill{display:inline-flex; align-items:center; padding:14px 30px; border-radius:999px;
  font-size:15px; color:#FAFAFA; border:1.5px solid transparent;
  background-image:linear-gradient(#0A0A0C,#0A0A0C),linear-gradient(96deg,#5728FF,#1CE65D);
  background-origin:border-box; background-clip:padding-box,border-box;}
.pill-ghost{display:inline-flex; align-items:center; padding:14px 30px; border-radius:999px;
  font-size:15px; color:#FAFAFA; background:rgba(219,219,219,.13);}
.arrowbtn{width:48px; height:48px; border-radius:50%; flex-shrink:0;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid #1CE65D; color:#FAFAFA; font-size:17px;}
.arrowbtn.solid{background:#5728FF; border-color:#5728FF;}
.pill:hover,.pill-ghost:hover{filter:brightness(1.18);}

.figures{display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:1px;
  margin-top:34px; background:rgba(219,219,219,.12);
  border:1px solid rgba(219,219,219,.12); border-radius:var(--r-md); overflow:hidden;}
.fig{background:#050506; padding:20px 22px;}
.fig-n{font-size:32px; font-weight:600; letter-spacing:-.03em; color:#FAFAFA;
  font-variant-numeric:tabular-nums; line-height:1.1;}
.fig-n.g{color:#1CE65D;} .fig-n.w{color:#FFB020;} .fig-n.c{color:#FF4D6D;}
.fig-l{font-family:var(--mono); font-size:10.5px; letter-spacing:.12em;
  text-transform:uppercase; color:#82828E; margin-top:7px;}

/* ---------- grids e cards ---------- */
.grid3{display:grid; grid-template-columns:repeat(auto-fit,minmax(272px,1fr)); gap:16px;}
.tcard{background:var(--panel); border:1px solid var(--line); border-radius:var(--r-md);
  padding:24px 24px 22px; position:relative; overflow:hidden; display:block;}
.tcard::before{content:""; position:absolute; inset:0 auto 0 0; width:3px; background:var(--c);}
.tcard:hover{border-color:var(--line-strong);}
.tcard-top{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;}
.tcard h3{margin:0; font-size:19px; letter-spacing:-.02em; font-weight:600;}
.tcard p{margin:0; color:var(--text-mute); font-size:14.5px; line-height:1.5;}
.tcard .cnt{font-family:var(--mono); font-size:13px; color:var(--c);
  font-variant-numeric:tabular-nums; flex-shrink:0;}
.tcard .slug{display:inline-block; margin-top:15px; font-family:var(--mono); font-size:11.5px;
  color:var(--text-mute); background:var(--ground-2); border:1px solid var(--line);
  padding:4px 9px; border-radius:6px;}

.chip{display:inline-flex; align-items:center; gap:6px; flex-shrink:0;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
  padding:4px 10px; border-radius:999px; border:1px solid var(--c); color:var(--c); white-space:nowrap;}
.chip::before{content:""; width:5px; height:5px; border-radius:50%; background:var(--c);}
.st{display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:4px 11px;
  border-radius:999px; white-space:nowrap; border:1px solid var(--line-strong); color:var(--text-2);}
.st::before{content:""; width:6px; height:6px; border-radius:50%; background:currentColor;}
.st.ok{color:var(--ok); border-color:color-mix(in srgb,var(--ok) 40%,transparent);}
.st.warn{color:var(--warn); border-color:color-mix(in srgb,var(--warn) 40%,transparent);}
.st.crit{color:var(--crit); border-color:color-mix(in srgb,var(--crit) 40%,transparent);}
.st.plain::before{display:none;}

.ccard{background:var(--panel); border:1px solid var(--line); border-radius:var(--r-md);
  padding:22px 24px; display:flex; flex-direction:column; gap:14px;}
.ccard:hover{border-color:var(--line-strong);}
.ccard-id{font-family:var(--mono); font-size:12.5px; color:var(--violet-lift); letter-spacing:.04em;}
.ccard h3{margin:0; font-size:18px; line-height:1.32; letter-spacing:-.015em;
  font-weight:600; text-wrap:balance;}
.dotline{display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:auto;}
.dot{width:20px; height:20px; border-radius:6px; background:var(--c); opacity:.9; flex-shrink:0;}
.dot.off{background:transparent; border:1px dashed var(--line-strong);}
.ccard-foot{display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding-top:13px; border-top:1px solid var(--line);
  font-family:var(--mono); font-size:11px; color:var(--text-mute);}

/* ---------- saude ---------- */
.hlist{display:flex; flex-direction:column; gap:1px; background:var(--line);
  border:1px solid var(--line); border-radius:var(--r-md); overflow:hidden;}
.hrow{background:var(--ground); padding:16px 22px; display:grid;
  grid-template-columns:120px 1fr auto; gap:18px; align-items:center;}
.hrow code{font-family:var(--mono); font-size:12.5px; color:var(--text-2); word-break:break-all;}
.hrow .msg{font-size:14.5px; color:var(--text-2);}
.hrow .msg b{color:var(--text); font-weight:600;}
@media (max-width:760px){ .hrow{grid-template-columns:1fr; gap:8px;} }
.vazio{background:var(--panel); border:1px solid var(--line); border-radius:var(--r-md);
  padding:30px; text-align:center; color:var(--text-mute); font-size:15px;}

/* ---------- paginas internas ---------- */
.crumb{font-family:var(--mono); font-size:12px; color:var(--text-mute);
  margin:30px 0 18px; display:flex; gap:9px; flex-wrap:wrap; align-items:center;}
.crumb a{color:var(--text-2);} .crumb a:hover{color:var(--text);}
.crumb .sep{opacity:.45;}

.pagehead{background:var(--panel); border:1px solid var(--line);
  border-radius:var(--r-lg); padding:34px 36px;}
.pagehead h1{margin:12px 0 0; font-size:clamp(26px,3.2vw,40px); line-height:1.1;
  letter-spacing:-.03em; font-weight:600; text-wrap:balance; max-width:24ch;}
@media (max-width:700px){ .pagehead{padding:24px 20px;} }
.metarow{display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:20px;}
.metarow.kv{gap:24px; row-gap:16px;}
.meta-kv{display:flex; flex-direction:column; gap:3px; padding-right:24px;
  border-right:1px solid var(--line);}
.meta-kv:last-child{border-right:0; padding-right:0;}
.meta-k{font-family:var(--mono); font-size:10px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--text-mute);}
.meta-v{font-size:14.5px; color:var(--text);}

.split{display:grid; grid-template-columns:1fr 316px; gap:22px; margin-top:22px; align-items:start;}
.split.doc{grid-template-columns:214px minmax(0,1fr) 288px;}
@media (max-width:1100px){ .split.doc{grid-template-columns:1fr 288px;} .split.doc .toc{display:none;} }
@media (max-width:960px){ .split,.split.doc{grid-template-columns:minmax(0,1fr);} }

/* trilha do card */
.trail{display:flex; flex-direction:column;}
.tr{display:grid; grid-template-columns:26px minmax(0,1fr); gap:20px;
  padding-bottom:18px; position:relative;}
.tr:not(:last-child)::before{content:""; position:absolute; left:12.5px; top:28px;
  bottom:-2px; width:1px; background:var(--line-strong);}
.tr-node{width:26px; height:26px; border-radius:9px; background:var(--c);
  display:flex; align-items:center; justify-content:center; font-family:var(--mono);
  font-size:11px; font-weight:700; color:#050506; position:relative; z-index:1;}
.tr-body{background:var(--panel); border:1px solid var(--line);
  border-radius:var(--r-md); padding:18px 20px; display:block;}
.tr-body:hover{border-color:var(--line-strong);}
.tr-top{display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:9px;}
.tr-body h3{margin:0 0 6px; font-size:17px; letter-spacing:-.015em; font-weight:600;}
.tr-body p{margin:0; color:var(--text-mute); font-size:14px; line-height:1.5;}
.tr-path{display:block; margin-top:12px; font-family:var(--mono); font-size:11.5px;
  color:var(--text-mute); word-break:break-all;}
.tr.faltando .tr-node{background:transparent; border:1px dashed var(--line-strong); color:var(--text-mute);}
.tr.faltando .tr-body{border-style:dashed; background:transparent;}
.tr.faltando h3{color:var(--text-mute); font-weight:500;}

.side{background:var(--panel); border:1px solid var(--line);
  border-radius:var(--r-md); padding:22px;}
.side + .side{margin-top:16px;}
.side h4{margin:0 0 15px; font-family:var(--mono); font-size:10.5px; letter-spacing:.13em;
  text-transform:uppercase; color:var(--text-mute); font-weight:400;}
.side ul{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:9px;}
.side li{font-size:14px; color:var(--text-2); display:flex; gap:9px; align-items:baseline;}
.side li code{font-family:var(--mono); font-size:12.5px; color:var(--text); word-break:break-all;}
.side .tick{color:var(--violet-lift); flex-shrink:0;}
.side a:hover{color:var(--violet-lift);}

/* ---------- documento ---------- */
.fm{background:var(--ground-2); border:1px solid var(--line); border-radius:var(--r-md);
  padding:18px 20px; margin:0 0 26px; font-family:var(--mono); font-size:12.5px;
  line-height:1.85; overflow-x:auto; white-space:pre;}
.fm .k{color:var(--violet-lift);} .fm .v{color:var(--text);}
.fm .d{color:var(--text-mute);} .fm .l{color:var(--green);}

.prose{max-width:68ch;}
.prose h1{font-size:28px; letter-spacing:-.03em; margin:34px 0 12px; font-weight:600;}
.prose h2{font-size:24px; letter-spacing:-.025em; margin:38px 0 12px; font-weight:600;
  padding-top:16px; border-top:1px solid var(--line);}
.prose > h2:first-child,.prose > h1:first-child{border-top:0; padding-top:0; margin-top:0;}
.prose h3{font-size:17.5px; letter-spacing:-.015em; margin:26px 0 8px; font-weight:600;}
.prose h4{font-size:15px; margin:20px 0 6px; font-weight:600;}
.prose p{margin:0 0 14px; color:var(--text-2);}
.prose ul,.prose ol{margin:0 0 16px; padding-left:20px; color:var(--text-2);}
.prose li{margin-bottom:7px;}
.prose li > ul,.prose li > ol{margin:7px 0 0;}
.prose strong{color:var(--text);}
.prose code{font-family:var(--mono); font-size:13px; color:var(--text);
  background:var(--ground-2); border:1px solid var(--line); border-radius:5px; padding:1px 5px;}
.prose pre.codebox code{background:none; border:0; padding:0; font-size:12.5px; color:var(--text-2);}
.prose blockquote{margin:0 0 18px; padding:2px 0 2px 18px;
  border-left:2px solid var(--violet-lift); color:var(--text-mute);}
.prose blockquote p:last-child{margin-bottom:0;}
.prose hr{border:0; border-top:1px solid var(--line); margin:28px 0;}
.prose img{max-width:100%; height:auto; border-radius:var(--r-sm);}
.prose a:not(.wl){color:var(--violet-lift);
  border-bottom:1px solid color-mix(in srgb,var(--violet-lift) 40%,transparent);}

.wl{color:var(--c,var(--violet-lift));
  border-bottom:1px solid color-mix(in srgb,var(--c,var(--violet-lift)) 45%,transparent);}
.wl:hover{border-bottom-color:currentColor;}
.wl::before{content:"[["; opacity:.4;} .wl::after{content:"]]"; opacity:.4;}
.wl-quebrado{color:var(--crit); border-bottom:1px dashed var(--crit); cursor:help;}

pre.codebox{background:var(--ground-2); border:1px solid var(--line); border-radius:var(--r-sm);
  padding:16px 18px; overflow-x:auto; margin:0 0 18px; font-family:var(--mono);
  font-size:12.5px; line-height:1.7; color:var(--text-2); position:relative;}
pre.codebox[data-lang]::before{content:attr(data-lang); position:absolute; top:8px; right:12px;
  font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--text-mute);}

.tablewrap{overflow-x:auto; margin:0 0 20px; border:1px solid var(--line); border-radius:var(--r-sm);}
table{border-collapse:collapse; width:100%; font-size:14px; min-width:440px;}
th,td{padding:11px 15px; text-align:left; border-bottom:1px solid var(--line); vertical-align:top;}
th{font-family:var(--mono); font-size:10.5px; letter-spacing:.11em; text-transform:uppercase;
  color:var(--text-mute); font-weight:400; background:var(--ground-2);}
td{color:var(--text-2);} tr:last-child td{border-bottom:0;}
td code{font-family:var(--mono); font-size:12.5px; color:var(--text);}

.toc{position:sticky; top:96px;}
.toc h4{margin:0 0 14px; font-family:var(--mono); font-size:10.5px; letter-spacing:.13em;
  text-transform:uppercase; color:var(--text-mute); font-weight:400;}
.toc ol{margin:0; padding:0; list-style:none; counter-reset:t;
  display:flex; flex-direction:column; gap:2px;}
.toc li{counter-increment:t;}
.toc a{display:block; padding:7px 12px; border-radius:8px; font-size:13.5px;
  color:var(--text-mute); border-left:2px solid transparent;}
.toc a::before{content:counter(t) ". "; font-family:var(--mono); font-size:11px; opacity:.6;}
.toc a:hover{color:var(--text); background:var(--panel);}
.toc a.cur{color:var(--text); border-left-color:var(--green); background:var(--panel);}

.backlink{display:block; padding:12px 0; border-bottom:1px solid var(--line);}
.backlink:last-child{border-bottom:0; padding-bottom:0;}
.backlink .bt{display:flex; align-items:center; gap:8px; margin-bottom:5px;}
.backlink .bn{font-size:14px; color:var(--text); line-height:1.35; display:block;}
.backlink .bp{font-family:var(--mono); font-size:11px; color:var(--text-mute);
  margin-top:4px; display:block; word-break:break-all;}
.backlink:hover .bn{color:var(--violet-lift);}

/* ---------- busca ---------- */
.searchbar{display:flex; align-items:center; gap:14px; margin-top:30px;
  background:var(--panel); border:1px solid var(--line-strong);
  border-radius:999px; padding:8px 12px 8px 24px;}
.searchbar input{flex:1; min-width:0; appearance:none; border:0; background:transparent;
  color:var(--text); font-family:var(--font); font-size:19px; letter-spacing:-.01em;
  padding:10px 0; outline:none;}
.searchbar input::placeholder{color:var(--text-mute);}
.searchbar .hint{font-family:var(--mono); font-size:11px; color:var(--text-mute);
  white-space:nowrap; padding-right:12px;}
.filters{display:flex; gap:8px; flex-wrap:wrap; margin:16px 0 6px;}
.fchip{appearance:none; cursor:pointer; font-family:var(--font); font-size:13px;
  padding:7px 14px; border-radius:999px; border:1px solid var(--line-strong);
  color:var(--text-mute); background:transparent;}
.fchip:hover{color:var(--text);}
.fchip[aria-pressed="true"]{background:var(--text); color:var(--ground);
  border-color:var(--text); font-weight:600;}
.res{display:block; padding:22px 24px; border:1px solid var(--line);
  border-radius:var(--r-md); background:var(--panel); margin-bottom:12px;}
.res:hover{border-color:var(--line-strong);}
.res-top{display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:9px;}
.res h3{margin:0 0 8px; font-size:18px; letter-spacing:-.018em; font-weight:600; color:var(--text);}
.res p{margin:0; font-size:14.5px; color:var(--text-mute); line-height:1.55;}
.res mark{background:color-mix(in srgb,var(--green) 26%,transparent);
  color:var(--text); border-radius:3px; padding:0 3px;}
.res .rp{display:block; margin-top:12px; font-family:var(--mono); font-size:11px;
  color:var(--text-mute); word-break:break-all;}

/* ---------- grafo ---------- */
.graphbox{background:var(--panel); border:1px solid var(--line);
  border-radius:var(--r-lg); padding:20px; overflow-x:auto;}
.graphbox svg{display:block; width:100%; min-width:700px; height:auto;}
.graphbox .ed{stroke:var(--line-strong); stroke-width:1.4; fill:none;}
.graphbox .ed-wl{stroke:var(--t-regra); stroke-width:1.4; fill:none;
  stroke-dasharray:5 4; opacity:.85;}
.graphbox .nl{font-family:var(--mono); font-size:10.5px; fill:var(--text-2);}
.graphbox .cl{font-family:var(--font); font-size:13px; font-weight:700; fill:var(--text);}
.graphbox .hub{fill:var(--ground); stroke:var(--violet-lift); stroke-width:1.6;}
.graphbox a:hover .hub{stroke-width:2.6;}
.legend{display:flex; gap:20px; flex-wrap:wrap; margin-top:18px; padding-top:18px;
  border-top:1px solid var(--line);}
.leg{display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-2);}
.leg i{width:12px; height:12px; border-radius:4px; background:var(--c); display:block;}

/* ---------- padrao ---------- */
.tree{background:var(--ground-2); border:1px solid var(--line); border-radius:var(--r-md);
  padding:24px 26px; font-family:var(--mono); font-size:13px; line-height:2;
  overflow-x:auto; white-space:pre; color:var(--text-2); margin:0;}
.tree .dir{color:var(--violet-lift);} .tree .cm{color:var(--text-mute);}
.tree .hl{color:var(--green);}
.note{display:flex; gap:14px; align-items:flex-start;
  background:color-mix(in srgb,var(--violet) 9%,transparent);
  border:1px solid color-mix(in srgb,var(--violet) 32%,transparent);
  border-radius:var(--r-md); padding:20px 22px; margin-top:20px;}
.note .ic{width:26px; height:26px; border-radius:8px; background:var(--violet); flex-shrink:0;
  display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:700;}
.note p{margin:0; font-size:14.5px; color:var(--text-2); line-height:1.6;}
.note p b{color:var(--text);}
.note code{font-family:var(--mono); font-size:12.5px; color:var(--text);}

/* ---------- lista de documentos ---------- */
.dlist{display:flex; flex-direction:column; gap:1px; background:var(--line);
  border:1px solid var(--line); border-radius:var(--r-md); overflow:hidden;}
.drow{background:var(--ground); padding:15px 22px; display:grid;
  grid-template-columns:auto minmax(0,1fr) auto auto; gap:16px; align-items:center;}
.drow:hover{background:var(--panel-2);}
.drow .dt{font-size:15.5px; color:var(--text); font-weight:500;}
.drow .dp{font-family:var(--mono); font-size:11px; color:var(--text-mute);
  margin-top:3px; display:block; word-break:break-all;}
.drow .du{font-family:var(--mono); font-size:11.5px; color:var(--text-mute);
  font-variant-numeric:tabular-nums; white-space:nowrap;}
@media (max-width:760px){ .drow{grid-template-columns:1fr; gap:8px;} }

.footnote{margin-top:64px; padding-top:22px; border-top:1px solid var(--line);
  font-size:13px; color:var(--text-mute); display:flex; justify-content:space-between;
  gap:20px; flex-wrap:wrap;}
.footnote code{font-family:var(--mono);}
`;
