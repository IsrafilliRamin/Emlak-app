// ── VERİTABANI ──────────────────────────────────────────────────────────────
var DB = {
  users: [
    { name: 'Vusal Homex', username: 'vusalhomex', pass: 'homexvusal9601460', role: 'admin',
      perms: { edit: true, statusToggle: true, approveRequests: true } }
  ],
  muracietler: [],
  notifications: []
};
var currentUser = null, selOtaqVal = '', axOtaqVals = [], axEraziVals = [], formEraziVals = [], formOtaqVals = [];

// VAXTI BİTMƏ MÜDDƏTİ (30 gün)
var EXPIRY_DAYS = 30;

// ── KÖMƏKÇI ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  var dt = d ? new Date(d) : new Date();
  return dt.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + dt.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
}
function emlakBadge(t) {
  var m = { 'Mənzil': 'badge-blue', 'Torpaq': 'badge-green', 'Həyət Evi/Bağ evi': 'badge-warn', 'Obyekt': 'badge-purple', 'Qaraj': 'badge-red' };
  return '<span class="badge ' + (m[t] || 'badge-blue') + '">' + (t || '—') + '</span>';
}
function tikBadge(t) { return t === 'Yeni tikili' ? '<span class="badge badge-green">Yeni</span>' : '<span class="badge badge-warn">Köhnə</span>'; }
function odemeBadge(o) { return o === 'İpoteka' ? '<span class="badge badge-purple">🏦 İpoteka</span>' : '<span class="badge badge-gray">💵 Nağd</span>'; }
function budceFmt(b) { return b && b !== '—' ? Number(b).toLocaleString() + ' ₼' : '—'; }

// ── STATUS (Aktiv / Deaktiv / Vaxtı Bitmiş) ──────────────────────────────────
// Status hesablanması: admin/icazəli istifadəçi manual olaraq "Deaktiv" qoya bilər.
// Əgər manual deaktiv edilməyibsə və 30 gündən çoxdursa -> "Vaxtı Bitmiş"
function effectiveStatus(r) {
  if (r.status === 'Deaktiv') return 'Deaktiv';
  var created = new Date(r.tarix).getTime();
  var diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
  if (diffDays >= EXPIRY_DAYS) return 'Vaxtı Bitmiş';
  return 'Aktiv';
}
function statusBadge(r) {
  var s = effectiveStatus(r);
  if (s === 'Aktiv') return '<span class="badge badge-green">✅ Aktiv</span>';
  if (s === 'Vaxtı Bitmiş') return '<span class="badge badge-gray">⏳ Vaxtı Bitmiş</span>';
  return '<span class="badge badge-red">❌ Deaktiv</span>';
}

// ── İCAZƏ YOXLAMALARI ────────────────────────────────────────────────────────
function isAdmin() { return currentUser && currentUser.role === 'admin'; }
function getPerms() { return (currentUser && currentUser.perms) || {}; }
function canEdit() { return isAdmin() || getPerms().edit === true; }
function canToggleStatus() { return isAdmin() || getPerms().statusToggle === true; }
function canApproveRequests() { return isAdmin() || getPerms().approveRequests === true; }

// ── GİRİŞ ────────────────────────────────────────────────────────────────────
function doLogin() {
  var u = document.getElementById('l-user').value.trim();
  var p = document.getElementById('l-pass').value;
  var f = DB.users.find(function (x) { return x.username === u && x.pass === p; });
  if (!f) { showToast('İstifadəçi adı və ya şifrə yanlışdır!'); return; }
  currentUser = f;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('usr-name-d').textContent = f.name;
  document.getElementById('usr-avatar-d').textContent = f.name[0].toUpperCase();
  document.getElementById('usr-role-d').textContent = roleLabel(f);
  // Admin menüsü
  var adminNav = document.getElementById('nav-admin');
  var adminBn = document.getElementById('bn-admin');
  if (adminNav) adminNav.style.display = isAdmin() ? 'flex' : 'none';
  if (adminBn) adminBn.style.display = isAdmin() ? 'flex' : 'none';
  setDateField(); updateStats(); renderList(); renderDash();
}
function roleLabel(u) {
  if (u.role === 'admin') return '👑 Admin';
  var p = u.perms || {};
  var tags = [];
  if (p.edit) tags.push('Redaktor');
  if (p.statusToggle) tags.push('Status');
  if (p.approveRequests) tags.push('Təsdiq');
  return tags.length ? '✏️ ' + tags.join(' / ') : '👤 İstifadəçi';
}
function doLogout() {
  currentUser = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-user').value = '';
}

// ── NAVİQASİYA ───────────────────────────────────────────────────────────────
var pIcons = { dashboard: 'ti-layout-dashboard', muraciet: 'ti-plus-circle', cedvel: 'ti-table', axtaris: 'ti-search', agentler: 'ti-user-star', musteriler: 'ti-users-group', admin: 'ti-users' };
var pTitles = { dashboard: 'Ana Səhifə', muraciet: 'Müraciət əlavə et', cedvel: 'Cədvəl', axtaris: 'Axtarış', agentler: 'Vasitəçi Agentlər', musteriler: 'Müştərilər', admin: 'İstifadəçi İdarəsi' };
function showPage(p) {
  if (p === 'admin' && !isAdmin()) { showToast('Bu səhifəyə giriş yoxdur'); return; }
  document.querySelectorAll('.page').forEach(function (x) { x.classList.remove('active'); });
  document.querySelectorAll('.nav-btn, .bn-item').forEach(function (x) { x.classList.remove('active'); });
  document.getElementById('page-' + p).classList.add('active');
  document.getElementById('page-title').textContent = pTitles[p];
  document.getElementById('topbar-icon').className = 'ti ' + pIcons[p];
  document.getElementById('topbar-icon').style.color = 'var(--acc)';
  var navMap = { dashboard: 0, muraciet: 1, cedvel: 2, axtaris: 3, agentler: 4, musteriler: 5 };
  if (p === 'admin') {
    var an = document.getElementById('nav-admin'); if (an) an.classList.add('active');
    var ab = document.getElementById('bn-admin'); if (ab) ab.classList.add('active');
    renderAdminPanel();
  } else {
    var idx = navMap[p];
    var allNav = document.querySelectorAll('#sidebar .nav-btn');
    var allBn = document.querySelectorAll('#bottom-nav .bn-item');
    if (allNav[idx]) allNav[idx].classList.add('active');
    if (allBn[idx]) allBn[idx].classList.add('active');
  }
  if (p === 'muraciet') setDateField();
  if (p === 'cedvel') renderList();
  if (p === 'dashboard') { renderDash(); updateStats(); }
  if (p === 'axtaris') doSearch();
  document.getElementById('content').scrollTop = 0;
}

// ── FORM ─────────────────────────────────────────────────────────────────────
function setDateField() { var el = document.getElementById('f-tarix'); if (el) el.value = fmtDate(); }
function setStatus(v) {
  document.getElementById('f-status').value = v;
  document.getElementById('st-aktiv').classList.toggle('sel', v === 'Aktiv');
  document.getElementById('st-deaktiv').classList.toggle('sel', v === 'Deaktiv');
}
function setPay(v) {
  document.getElementById('f-odeme').value = v;
  document.getElementById('pay-nagd').classList.toggle('sel', v === 'Nağd');
  document.getElementById('pay-ipoteka').classList.toggle('sel', v === 'İpoteka');
}

// Forma üçün ÇOXLU ərazi seçimi
function formEraziToggle(el, val) {
  var idx = formEraziVals.indexOf(val);
  if (idx > -1) { formEraziVals.splice(idx, 1); el.classList.remove('multi-selected'); }
  else { formEraziVals.push(val); el.classList.add('multi-selected'); }
  document.getElementById('f-erazi').value = formEraziVals.join(', ');
  var info = document.getElementById('f-erazi-info');
  info.textContent = formEraziVals.length ? 'Seçildi: ' + formEraziVals.join(', ') : '';
}
// Forma üçün ÇOXLU otaq seçimi
function formOtaqToggle(el, val) {
  var idx = formOtaqVals.indexOf(val);
  if (idx > -1) { formOtaqVals.splice(idx, 1); el.classList.remove('multi-selected'); }
  else { formOtaqVals.push(val); el.classList.add('multi-selected'); }
  document.getElementById('f-otaq').value = formOtaqVals.join(', ');
  var info = document.getElementById('f-otaq-info');
  info.textContent = formOtaqVals.length ? 'Seçildi: ' + formOtaqVals.join(', ') + ' (' + formOtaqVals.length + ' ədəd)' : '';
}

function saveMuraciet() {
  var musteri = document.getElementById('f-musteri').value.trim();
  var nomre = document.getElementById('f-nomre').value.trim();
  var agent = document.getElementById('f-agent').value.trim();
  var erazi = formEraziVals.slice();
  var emlak = document.getElementById('f-emlak').value;
  var tikili = document.getElementById('f-tikili').value;
  var budce = document.getElementById('f-budce').value;
  var otaq = formOtaqVals.slice();
  var odeme = document.getElementById('f-odeme').value;
  var status = document.getElementById('f-status').value;
  var qeyd = document.getElementById('f-qeyd').value;
  if (!musteri || !nomre || !agent || !erazi.length || !emlak || !tikili || !otaq.length) {
    showToast('⚠️ Bütün vacib sahələri doldurun'); return;
  }
  var rec = {
    id: Date.now(), tarix: new Date().toISOString(),
    status: status, agent: agent, musteri: musteri, nomre: nomre,
    erazi: erazi, emlak: emlak, tikili: tikili, budce: budce || '—',
    otaq: otaq, odeme: odeme, qeyd: qeyd
  };
  DB.muracietler.unshift(rec);
  addNotification('Yeni: ' + musteri + ' | ' + agent + ' — ' + otaq.join(', ') + ' (' + erazi.join(', ') + ')');
  playDing(); showToast('✅ Müraciət əlavə edildi!');
  clearForm(); updateStats(); renderList(); renderDash();
}
function clearForm() {
  ['f-musteri', 'f-nomre', 'f-agent', 'f-budce', 'f-qeyd'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('f-emlak').value = '';
  document.getElementById('f-tikili').value = '';
  document.querySelectorAll('#f-erazi-chips .otaq-chip').forEach(function (c) { c.classList.remove('multi-selected'); });
  document.querySelectorAll('#otaq-chips .otaq-chip').forEach(function (c) { c.classList.remove('multi-selected'); });
  formEraziVals = []; formOtaqVals = [];
  document.getElementById('f-erazi').value = '';
  document.getElementById('f-otaq').value = '';
  document.getElementById('f-erazi-info').textContent = '';
  document.getElementById('f-otaq-info').textContent = '';
  setStatus('Aktiv'); setPay('Nağd'); setDateField();
}

// ── KART ─────────────────────────────────────────────────────────────────────
function arrJoin(v) { return Array.isArray(v) ? v.join(', ') : v; }
function arrBadges(v, cls) {
  if (!Array.isArray(v)) return '<span class="badge ' + cls + '">' + v + '</span>';
  return v.map(function (x) { return '<span class="badge ' + cls + '">' + x + '</span>'; }).join('');
}

function makeCard(r, showActions) {
  var btns = '';
  var eff = effectiveStatus(r);
  if (showActions) {
    if (canToggleStatus()) {
      if (eff === 'Aktiv') {
        btns += '<button class="m-edit-btn" style="color:var(--danger);border-color:rgba(247,90,90,.3);background:rgba(247,90,90,.12)" onclick="toggleStatus(' + r.id + ')"><i class="ti ti-toggle-left"></i> Deaktiv et</button>';
      } else {
        btns += '<button class="m-edit-btn" style="color:var(--success);border-color:rgba(34,211,165,.3);background:rgba(34,211,165,.12)" onclick="toggleStatus(' + r.id + ')"><i class="ti ti-toggle-right"></i> Aktiv et</button>';
      }
    }
    if (canEdit()) {
      btns += '<button class="m-edit-btn" onclick="openEdit(' + r.id + ')"><i class="ti ti-edit"></i> Düzəlt</button>';
    }
    if (isAdmin()) {
      btns += '<button class="m-del-btn" onclick="delRec(' + r.id + ')"><i class="ti ti-trash"></i></button>';
    }
  }
  return '<div class="m-card row-new">'
    + '<div class="m-card-top">'
    + '<div><div class="m-card-name">' + r.musteri + '</div>'
    + '<div style="font-size:12px;color:var(--text2);margin-top:2px"><i class="ti ti-phone" style="font-size:11px"></i> ' + r.nomre + '</div></div>'
    + '<span class="m-card-date">' + fmtDate(r.tarix) + '</span>'
    + '</div>'
    + '<div class="m-card-tags">'
    + statusBadge(r) + odemeBadge(r.odeme) + emlakBadge(r.emlak) + tikBadge(r.tikili)
    + arrBadges(r.otaq, 'badge-blue')
    + arrBadges(r.erazi, 'badge-gray')
    + '</div>'
    + '<div class="m-card-row">'
    + '<span class="m-card-budce">' + budceFmt(r.budce) + '</span>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + btns + '</div>'
    + '</div>'
    + '<div class="m-card-agent"><i class="ti ti-user" style="font-size:12px;color:var(--acc)"></i> Agent: <b>' + r.agent + '</b></div>'
    + (r.qeyd ? '<div style="font-size:12px;color:var(--text3);margin-top:5px;padding-top:5px;border-top:1px solid var(--border)">📝 ' + r.qeyd + '</div>' : '')
    + '</div>';
}

function toggleStatus(id) {
  if (!canToggleStatus()) { showToast('İcazəniz yoxdur'); return; }
  var r = DB.muracietler.find(function (x) { return x.id === id; });
  if (!r) return;
  var eff = effectiveStatus(r);
  if (eff === 'Aktiv') {
    r.status = 'Deaktiv';
  } else {
    // Aktiv et: status sıfırlanır və tarix yenilənir ki "Vaxtı Bitmiş" effekti aradan qalxsın
    r.status = 'Aktiv';
    r.tarix = new Date().toISOString();
  }
  renderList(); renderDash(); updateStats(); doSearch();
  showToast(eff === 'Aktiv' ? '❌ Deaktiv edildi' : '✅ Aktiv edildi');
}

function renderList() {
  var st = document.getElementById('f-st').value;
  var od = document.getElementById('f-od').value;
  var data = DB.muracietler.filter(function (r) {
    if (st && effectiveStatus(r) !== st) return false;
    if (od && r.odeme !== od) return false;
    return true;
  });
  document.getElementById('cedvel-count').textContent = data.length + ' nəticə';
  var el = document.getElementById('main-list');
  if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>Müraciət yoxdur</div>'; return; }
  el.innerHTML = data.map(function (r) { return makeCard(r, true); }).join('');
}
function delRec(id) {
  if (!isAdmin()) { showToast('İcazəniz yoxdur'); return; }
  if (!confirm('Silmək istədiyinizə əminsiniz?')) return;
  DB.muracietler = DB.muracietler.filter(function (r) { return r.id !== id; });
  renderList(); renderDash(); updateStats(); doSearch(); showToast('Silindi');
}
function renderDash() {
  var el = document.getElementById('dash-list');
  var data = DB.muracietler.slice(0, 5);
  if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>Hələ müraciət yoxdur</div>'; return; }
  el.innerHTML = data.map(function (r) { return makeCard(r, false); }).join('');
}
function updateStats() {
  var today = new Date().toDateString();
  document.getElementById('s-total').textContent = DB.muracietler.length;
  document.getElementById('s-aktiv').textContent = DB.muracietler.filter(function (r) { return effectiveStatus(r) === 'Aktiv'; }).length;
  document.getElementById('s-today').textContent = DB.muracietler.filter(function (r) { return new Date(r.tarix).toDateString() === today; }).length;
  document.getElementById('s-ipoteka').textContent = DB.muracietler.filter(function (r) { return r.odeme === 'İpoteka'; }).length;
}

// ── DÜZƏLT MODAL ─────────────────────────────────────────────────────────────
var editEraziVals = [], editOtaqVals = [];
function openEdit(id) {
  if (!canEdit()) { showToast('Redaktə icazəniz yoxdur'); return; }
  var r = DB.muracietler.find(function (x) { return x.id === id; });
  if (!r) return;
  document.getElementById('e-id').value = id;
  document.getElementById('e-agent').value = r.agent;
  document.getElementById('e-musteri').value = r.musteri;
  document.getElementById('e-nomre').value = r.nomre;
  document.getElementById('e-budce').value = r.budce === '—' ? '' : r.budce;
  document.getElementById('e-emlak').value = r.emlak;
  document.getElementById('e-tikili').value = r.tikili;
  document.getElementById('e-qeyd').value = r.qeyd || '';
  setEditStatus(r.status === 'Deaktiv' ? 'Deaktiv' : 'Aktiv'); setEditPay(r.odeme);

  // Ərazi (çoxlu)
  editEraziVals = Array.isArray(r.erazi) ? r.erazi.slice() : [r.erazi];
  document.querySelectorAll('#e-erazi-chips .otaq-chip').forEach(function (c) {
    c.classList.toggle('multi-selected', editEraziVals.indexOf(c.getAttribute('data-val')) > -1);
  });
  document.getElementById('e-erazi').value = editEraziVals.join(', ');

  // Otaq (çoxlu)
  editOtaqVals = Array.isArray(r.otaq) ? r.otaq.slice() : [r.otaq];
  document.querySelectorAll('#e-otaq-chips .otaq-chip').forEach(function (c) {
    c.classList.toggle('multi-selected', editOtaqVals.indexOf(c.getAttribute('data-val')) > -1);
  });
  document.getElementById('e-otaq').value = editOtaqVals.join(', ');

  document.getElementById('edit-modal').classList.add('show');
}
function setEditStatus(v) {
  document.getElementById('e-status').value = v;
  document.getElementById('est-aktiv').classList.toggle('sel', v === 'Aktiv');
  document.getElementById('est-deaktiv').classList.toggle('sel', v === 'Deaktiv');
}
function setEditPay(v) {
  document.getElementById('e-odeme').value = v;
  document.getElementById('epay-nagd').classList.toggle('sel', v === 'Nağd');
  document.getElementById('epay-ipoteka').classList.toggle('sel', v === 'İpoteka');
}
function editEraziToggle(el, val) {
  var idx = editEraziVals.indexOf(val);
  if (idx > -1) { editEraziVals.splice(idx, 1); el.classList.remove('multi-selected'); }
  else { editEraziVals.push(val); el.classList.add('multi-selected'); }
  document.getElementById('e-erazi').value = editEraziVals.join(', ');
}
function editOtaqToggle(el, val) {
  var idx = editOtaqVals.indexOf(val);
  if (idx > -1) { editOtaqVals.splice(idx, 1); el.classList.remove('multi-selected'); }
  else { editOtaqVals.push(val); el.classList.add('multi-selected'); }
  document.getElementById('e-otaq').value = editOtaqVals.join(', ');
}
function saveEdit() {
  if (!canEdit()) { showToast('Redaktə icazəniz yoxdur'); return; }
  var id = Number(document.getElementById('e-id').value);
  var r = DB.muracietler.find(function (x) { return x.id === id; });
  if (!r) return;
  if (canToggleStatus()) r.status = document.getElementById('e-status').value;
  r.agent = document.getElementById('e-agent').value.trim();
  r.musteri = document.getElementById('e-musteri').value.trim();
  r.nomre = document.getElementById('e-nomre').value.trim();
  r.budce = document.getElementById('e-budce').value || '—';
  r.erazi = editEraziVals.slice();
  r.emlak = document.getElementById('e-emlak').value;
  r.tikili = document.getElementById('e-tikili').value;
  r.odeme = document.getElementById('e-odeme').value;
  r.otaq = editOtaqVals.slice();
  r.qeyd = document.getElementById('e-qeyd').value;
  closeModal(); renderList(); renderDash(); updateStats(); doSearch(); showToast('✅ Yeniləndi!');
}
function closeModal() { document.getElementById('edit-modal').classList.remove('show'); }

// ── ADMİN PANELİ ─────────────────────────────────────────────────────────────
function permBadges(u) {
  if (u.role === 'admin') return '<span class="badge badge-purple">👑 Admin</span>';
  var p = u.perms || {};
  var out = '';
  out += p.edit ? '<span class="badge badge-blue">✏️ Redaktə</span>' : '<span class="badge badge-gray">✏️ Redaktə yox</span>';
  out += p.statusToggle ? '<span class="badge badge-green">🔁 Status</span>' : '<span class="badge badge-gray">🔁 Status yox</span>';
  out += p.approveRequests ? '<span class="badge badge-warn">📋 Təsdiq</span>' : '<span class="badge badge-gray">📋 Təsdiq yox</span>';
  return out;
}
function renderAdminPanel() {
  var tbody = document.getElementById('admin-user-list');
  if (!tbody) return;
  var rows = DB.users.map(function (u, i) {
    var actions = '';
    if (u.role !== 'admin') {
      var p = u.perms || {};
      actions = '<div style="display:flex;flex-direction:column;gap:5px;min-width:160px">'
        + '<button class="btn-sm" style="font-size:11px;text-align:left" onclick="togglePerm(' + i + ',\'edit\')">'
        + (p.edit ? '🔒 Redaktəni ləğv et' : '✏️ Redaktə hüququ ver') + '</button>'
        + '<button class="btn-sm" style="font-size:11px;text-align:left" onclick="togglePerm(' + i + ',\'statusToggle\')">'
        + (p.statusToggle ? '🔒 Status hüququnu ləğv et' : '🔁 Aktiv/Deaktiv hüququ ver') + '</button>'
        + '<button class="btn-sm" style="font-size:11px;text-align:left" onclick="togglePerm(' + i + ',\'approveRequests\')">'
        + (p.approveRequests ? '🔒 Təsdiq hüququnu ləğv et' : '📋 İstək təsdiq hüququ ver') + '</button>'
        + '<button class="m-del-btn" style="padding:5px 10px;font-size:11px" onclick="deleteUser(' + i + ')"><i class="ti ti-trash"></i> Sil</button>'
        + '</div>';
    } else {
      actions = '<span style="font-size:11px;color:var(--text3)">—</span>';
    }
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td style="padding:10px 8px;font-size:13px;font-weight:600;vertical-align:top">' + u.name + '</td>'
      + '<td style="padding:10px 8px;font-size:12px;color:var(--text2);vertical-align:top">' + u.username + '</td>'
      + '<td style="padding:10px 8px;vertical-align:top">' + permBadges(u) + '</td>'
      + '<td style="padding:10px 8px;vertical-align:top">' + actions + '</td>'
      + '</tr>';
  });
  tbody.innerHTML = rows.join('');
}
function togglePerm(idx, key) {
  if (!isAdmin()) return;
  var u = DB.users[idx];
  if (!u || u.role === 'admin') return;
  if (!u.perms) u.perms = { edit: false, statusToggle: false, approveRequests: false };
  u.perms[key] = !u.perms[key];
  var labels = { edit: 'Redaktə', statusToggle: 'Aktiv/Deaktiv', approveRequests: 'İstək təsdiqi' };
  showToast((u.perms[key] ? '✅ ' : '🔒 ') + labels[key] + ' hüququ — ' + u.name);
  renderAdminPanel();
}
function deleteUser(idx) {
  if (!isAdmin()) return;
  var u = DB.users[idx];
  if (!u || u.role === 'admin') { showToast('Admin silinə bilməz'); return; }
  if (!confirm(u.name + ' istifadəçisini silmək istədiyinizə əminsiniz?')) return;
  DB.users.splice(idx, 1);
  showToast('İstifadəçi silindi');
  renderAdminPanel();
}
function addUser() {
  var name = document.getElementById('new-u-name').value.trim();
  var username = document.getElementById('new-u-user').value.trim();
  var pass = document.getElementById('new-u-pass').value;
  if (!name || !username || !pass) { showToast('⚠️ Bütün sahələri doldurun'); return; }
  if (DB.users.find(function (x) { return x.username === username; })) { showToast('Bu istifadəçi adı artıq var'); return; }
  DB.users.push({ name: name, username: username, pass: pass, role: 'user', perms: { edit: false, statusToggle: false, approveRequests: false } });
  document.getElementById('new-u-name').value = '';
  document.getElementById('new-u-user').value = '';
  document.getElementById('new-u-pass').value = '';
  showToast('✅ İstifadəçi əlavə edildi: ' + name);
  renderAdminPanel();
}

// ── AXTARIŞ ──────────────────────────────────────────────────────────────────
// Status seçimi: bir neçə status seçilə bilər (default: Aktiv)
var axStatusVals = ['Aktiv'];
function axStatusToggle(el, val) {
  var idx = axStatusVals.indexOf(val);
  if (idx > -1) { axStatusVals.splice(idx, 1); el.classList.remove('selected'); }
  else { axStatusVals.push(val); el.classList.add('selected'); }
  doSearch();
}
function axChipToggle(el, val) {
  if (val === '') {
    axOtaqVals = [];
    document.querySelectorAll('#ax-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected', 'multi-selected'); });
    el.classList.add('selected');
  } else {
    var allChip = document.querySelector('#ax-chips .otaq-chip[data-val=""]');
    if (allChip) allChip.classList.remove('selected');
    var idx = axOtaqVals.indexOf(val);
    if (idx > -1) { axOtaqVals.splice(idx, 1); el.classList.remove('multi-selected'); }
    else { axOtaqVals.push(val); el.classList.add('multi-selected'); }
    if (axOtaqVals.length === 0 && allChip) allChip.classList.add('selected');
  }
  var info = document.getElementById('ax-otaq-info');
  info.textContent = axOtaqVals.length > 0 ? 'Seçildi: ' + axOtaqVals.join(', ') + ' (' + axOtaqVals.length + ' ədəd)' : '';
  doSearch();
}
function axEraziToggle(el, val) {
  if (val === '') {
    axEraziVals = [];
    document.querySelectorAll('#ax-erazi-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected', 'multi-selected'); });
    el.classList.add('selected');
  } else {
    var allChip = document.querySelector('#ax-erazi-chips .otaq-chip[data-val=""]');
    if (allChip) allChip.classList.remove('selected');
    var idx = axEraziVals.indexOf(val);
    if (idx > -1) { axEraziVals.splice(idx, 1); el.classList.remove('multi-selected'); }
    else { axEraziVals.push(val); el.classList.add('multi-selected'); }
    if (axEraziVals.length === 0 && allChip) allChip.classList.add('selected');
  }
  var info = document.getElementById('ax-erazi-info');
  info.textContent = axEraziVals.length > 0 ? 'Seçildi: ' + axEraziVals.join(', ') + ' (' + axEraziVals.length + ' ədəd)' : '';
  doSearch();
}
function matchArr(recVal, filterVals) {
  // recVal ola bilər array (çoxlu) və ya string (köhnə qeydlər)
  var arr = Array.isArray(recVal) ? recVal : [recVal];
  for (var i = 0; i < filterVals.length; i++) {
    if (arr.indexOf(filterVals[i]) > -1) return true;
  }
  return false;
}
function doSearch() {
  var od = document.getElementById('ax-odeme').value;
  var emlak = document.getElementById('ax-emlak').value;
  var tikili = document.getElementById('ax-tikili').value;
  var bmin = document.getElementById('ax-b-min').value;
  var bmax = document.getElementById('ax-b-max').value;
  var agent = document.getElementById('ax-agent').value.trim().toLowerCase();
  var res = DB.muracietler.filter(function (r) {
    // Status: seçilmiş statuslardan biri uyğun olmalıdır
    if (axStatusVals.length > 0 && axStatusVals.indexOf(effectiveStatus(r)) < 0) return false;
    if (od && r.odeme !== od) return false;
    if (emlak && r.emlak !== emlak) return false;
    if (tikili && r.tikili !== tikili) return false;
    if (axEraziVals.length > 0 && !matchArr(r.erazi, axEraziVals)) return false;
    if (axOtaqVals.length > 0 && !matchArr(r.otaq, axOtaqVals)) return false;
    if (bmax && r.budce !== '—' && Number(r.budce) > Number(bmax)) return false;
    if (bmin && r.budce !== '—' && Number(r.budce) < Number(bmin)) return false;
    if (agent && r.agent.toLowerCase().indexOf(agent) < 0) return false;
    return true;
  });
  document.getElementById('ax-count').textContent = res.length + ' nəticə';
  var el = document.getElementById('ax-list');
  if (!res.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-search-off"></i>Nəticə tapılmadı</div>'; return; }
  el.innerHTML = res.map(function (r) { return makeCard(r, true); }).join('');
}
function clearSearch() {
  ['ax-odeme', 'ax-emlak', 'ax-tikili', 'ax-b-min', 'ax-b-max', 'ax-agent'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  axOtaqVals = []; axEraziVals = [];
  axStatusVals = ['Aktiv'];
  document.querySelectorAll('#ax-status-chips .otaq-chip').forEach(function (c) {
    c.classList.toggle('selected', c.getAttribute('data-val') === 'Aktiv');
  });
  document.querySelectorAll('#ax-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected', 'multi-selected'); });
  var allOtaqChip = document.querySelector('#ax-chips .otaq-chip[data-val=""]');
  if (allOtaqChip) allOtaqChip.classList.add('selected');
  document.querySelectorAll('#ax-erazi-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected', 'multi-selected'); });
  var allEraziChip = document.querySelector('#ax-erazi-chips .otaq-chip[data-val=""]');
  if (allEraziChip) allEraziChip.classList.add('selected');
  document.getElementById('ax-otaq-info').textContent = '';
  document.getElementById('ax-erazi-info').textContent = '';
  doSearch();
}

// ── BİLDİRİŞLƏR ──────────────────────────────────────────────────────────────
function addNotification(msg) {
  DB.notifications.unshift({ msg: msg, time: new Date().toISOString(), read: false });
  var cnt = DB.notifications.filter(function (n) { return !n.read; }).length;
  var el = document.getElementById('notif-count');
  el.textContent = cnt; el.style.display = cnt > 0 ? 'flex' : 'none';
  renderNotifs();
}
function renderNotifs() {
  var list = document.getElementById('notif-list');
  if (!DB.notifications.length) { list.innerHTML = '<div style="padding:18px;text-align:center;color:var(--text3)">Bildiriş yoxdur</div>'; return; }
  list.innerHTML = DB.notifications.slice(0, 20).map(function (n) {
    return '<div class="notif-item' + (n.read ? '' : ' unread') + '">'
      + '<div style="font-size:13px;color:var(--text)">' + n.msg + '</div>'
      + '<div class="notif-time">' + fmtDate(n.time) + '</div></div>';
  }).join('');
}
function toggleNotif() {
  DB.notifications.forEach(function (n) { n.read = true; });
  document.getElementById('notif-count').style.display = 'none';
  var p = document.getElementById('notif-panel');
  p.style.display = p.style.display === 'block' ? 'none' : 'block';
  renderNotifs();
}
function clearNotifs() { DB.notifications = []; renderNotifs(); document.getElementById('notif-panel').style.display = 'none'; }

document.addEventListener('click', function (e) {
  var p = document.getElementById('notif-panel');
  if (p.style.display === 'block' && !p.contains(e.target) && !e.target.closest('.notif-btn')) p.style.display = 'none';
  var m = document.getElementById('edit-modal');
  if (m.classList.contains('show') && e.target === m) closeModal();
});

// ── SƏS & TOAST ──────────────────────────────────────────────────────────────
function playDing() {
  try {
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ac.createOscillator(), g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.3);
    g.gain.setValueAtTime(0.4, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
  } catch (e) { }
}
function showToast(msg) {
  var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2800);
}
