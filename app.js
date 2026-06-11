// ===== VERİTABANI =====
var DB = {
  users: [
    { name: 'Vusal Admin', username: 'vusalhomex', pass: 'homexvusal9601460', role: 'admin', canEdit: true }
  ],
  muracietler: [],
  notifications: []
};

var currentUser = null, selOtaqVal = '', axOtaqVals = [];

// ===== YARDIMÇI FUNKSİYALAR =====
function fmtDate(d) {
  var dt = d ? new Date(d) : new Date();
  return dt.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + dt.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
}
function emlakBadge(t) {
  var m = { 'Mənzil': 'badge-blue', 'Torpaq': 'badge-green', 'Həyət evi': 'badge-warn', 'Obyekt': 'badge-purple', 'Qaraj': 'badge-red' };
  return '<span class="badge ' + (m[t] || 'badge-blue') + '">' + (t || '—') + '</span>';
}
function tikBadge(t) { return t === 'Yeni tikili' ? '<span class="badge badge-green">Yeni</span>' : '<span class="badge badge-warn">Köhnə</span>'; }
function statusBadge(s) { return s === 'Aktiv' ? '<span class="badge badge-green">✅ Aktiv</span>' : '<span class="badge badge-red">❌ Deaktiv</span>'; }
function odemeBadge(o) { return o === 'İpoteka' ? '<span class="badge badge-purple">🏦 İpoteka</span>' : '<span class="badge badge-gray">💵 Nağd</span>'; }
function budceFmt(b) { return b && b !== '—' ? Number(b).toLocaleString() + ' ₼' : '—'; }

// ===== GİRİŞ (QEYDİYYATSIZ) =====
function doLogin() {
  var u = document.getElementById('l-user').value.trim();
  var p = document.getElementById('l-pass').value;
  var f = DB.users.find(function (x) { return x.username === u && x.pass === p; });
  if (!f) { showToast('❌ İstifadəçi adı və ya şifrə yanlışdır!'); return; }
  currentUser = f;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('usr-name-d').textContent = f.name;
  document.getElementById('usr-avatar-d').textContent = f.name[0].toUpperCase();
  document.getElementById('usr-role-d').textContent = f.role === 'admin' ? '👑 Admin' : (f.canEdit ? '✏️ Redaktör' : '👤 İstifadəçi');
  // Admin paneli göstər/gizlət
  var adminNavBtn = document.getElementById('nav-admin-btn');
  var adminBnBtn = document.getElementById('bn-admin-btn');
  if (f.role === 'admin') {
    if (adminNavBtn) adminNavBtn.style.display = 'flex';
    if (adminBnBtn) adminBnBtn.style.display = 'flex';
  } else {
    if (adminNavBtn) adminNavBtn.style.display = 'none';
    if (adminBnBtn) adminBnBtn.style.display = 'none';
  }
  // Müraciət düyməsi — yalnız canEdit və ya admin
  var canAdd = f.role === 'admin' || f.canEdit;
  var mNavBtn = document.getElementById('nav-muraciet-btn');
  var mBnBtn = document.getElementById('bn-muraciet-btn');
  var topNewBtn = document.getElementById('topbar-new-btn');
  if (mNavBtn) mNavBtn.style.display = canAdd ? 'flex' : 'none';
  if (mBnBtn) mBnBtn.style.display = canAdd ? 'flex' : 'none';
  if (topNewBtn) topNewBtn.style.display = canAdd ? 'flex' : 'none';
  setDateField(); updateStats(); renderList(); renderDash();
}

function doLogout() {
  currentUser = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
}

// ===== ADMİN - İSTİFADƏÇİ İDARƏETMƏSİ =====
function renderAdminUsers() {
  // Yalnız admin bu funksiyanı çağıra bilər
  if (!currentUser || currentUser.role !== 'admin') return;
  var list = document.getElementById('admin-user-list');
  // Adminin özü xaric bütün istifadəçilər
  var users = DB.users.filter(function (u) { return u.role !== 'admin'; });
  if (!users.length) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-users"></i>Heç bir istifadəçi yoxdur</div>';
    return;
  }
  list.innerHTML = users.map(function (u) {
    return '<div class="m-card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div class="avatar" style="width:38px;height:38px;font-size:15px">' + u.name[0].toUpperCase() + '</div>'
      + '<div><div class="m-card-name">' + u.name + '</div>'
      + '<div style="font-size:12px;color:var(--text3)">@' + u.username + '</div></div></div>'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      + '<span class="badge ' + (u.canEdit ? 'badge-warn' : 'badge-gray') + '">'
      + (u.canEdit ? '✏️ Redakt edə bilər' : '👁️ Yalnız baxış') + '</span>'
      + '<button class="btn-sm" onclick="toggleEditPerm(\'' + u.username + '\')">'
      + (u.canEdit ? 'Hüququ geri al' : 'Redakt hüququ ver') + '</button>'
      + '<button class="m-del-btn" onclick="deleteUser(\'' + u.username + '\')"><i class="ti ti-trash"></i></button>'
      + '</div></div>';
  }).join('');
}

function toggleEditPerm(username) {
  // Yalnız admin
  if (!currentUser || currentUser.role !== 'admin') return;
  // Adminin öz hesabına toxunmaq olmaz
  if (username === currentUser.username) return;
  var u = DB.users.find(function (x) { return x.username === username; });
  if (!u) return;
  u.canEdit = !u.canEdit;
  showToast(u.canEdit ? '✅ Redakt hüququ verildi' : '🔒 Hüquq geri alındı');
  renderAdminUsers();
}

function deleteUser(username) {
  // Yalnız admin silə bilər
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('⛔ Bu əməliyyat üçün icazəniz yoxdur'); return;
  }
  // Admin özünü silə bilməz
  if (username === currentUser.username) {
    showToast('⛔ Öz hesabınızı silə bilməzsiniz'); return;
  }
  // Başqa admin silinə bilməz
  var target = DB.users.find(function (u) { return u.username === username; });
  if (target && target.role === 'admin') {
    showToast('⛔ Admin hesabı silinə bilməz'); return;
  }
  if (!confirm('İstifadəçini silmək istədiyinizə əminsiniz?')) return;
  DB.users = DB.users.filter(function (u) { return u.username !== username; });
  showToast('🗑️ İstifadəçi silindi');
  renderAdminUsers();
}

function createUser() {
  var name = document.getElementById('new-name').value.trim();
  var username = document.getElementById('new-username').value.trim();
  var pass = document.getElementById('new-pass').value;
  var canEdit = document.getElementById('new-canedit').checked;
  if (!name || !username || !pass) { showToast('⚠️ Bütün sahələri doldurun'); return; }
  if (DB.users.find(function (u) { return u.username === username; })) {
    showToast('⚠️ Bu istifadəçi adı artıq mövcuddur'); return;
  }
  DB.users.push({ name: name, username: username, pass: pass, role: 'user', canEdit: canEdit });
  document.getElementById('new-name').value = '';
  document.getElementById('new-username').value = '';
  document.getElementById('new-pass').value = '';
  document.getElementById('new-canedit').checked = false;
  showToast('✅ İstifadəçi yaradıldı!');
  renderAdminUsers();
}

// ===== NAVİQASİYA =====
var pIcons = { dashboard: 'ti-layout-dashboard', muraciet: 'ti-plus-circle', cedvel: 'ti-table', axtaris: 'ti-search', admin: 'ti-shield-lock' };
var pTitles = { dashboard: 'Ana Səhifə', muraciet: 'Müraciət əlavə et', cedvel: 'Cədvəl', axtaris: 'Axtarış', admin: 'Admin Panel' };

function showPage(p) {
  if (!currentUser) return;
  if (p === 'admin' && currentUser.role !== 'admin') {
    showToast('⛔ Bu səhifəyə girişiniz yoxdur'); return;
  }
  if (p === 'muraciet' && !currentUser.canEdit && currentUser.role !== 'admin') {
    showToast('⛔ Müraciət əlavə etmə hüququnuz yoxdur'); return;
  }

  document.querySelectorAll('.page').forEach(function (x) { x.classList.remove('active'); });
  document.querySelectorAll('.nav-btn,.bn-item').forEach(function (x) { x.classList.remove('active'); });

  var pageEl = document.getElementById('page-' + p);
  if (!pageEl) return;
  pageEl.classList.add('active');
  document.getElementById('page-title').textContent = pTitles[p] || p;
  document.getElementById('topbar-icon').className = 'ti ' + (pIcons[p] || 'ti-circle');
  document.getElementById('topbar-icon').style.color = 'var(--acc)';

  // nav-btn aktivliyi
  document.querySelectorAll('.nav-btn[data-page]').forEach(function (b) {
    if (b.getAttribute('data-page') === p) b.classList.add('active');
  });
  document.querySelectorAll('.bn-item[data-page]').forEach(function (b) {
    if (b.getAttribute('data-page') === p) b.classList.add('active');
  });

  if (p === 'muraciet') setDateField();
  if (p === 'cedvel') renderList();
  if (p === 'dashboard') { renderDash(); updateStats(); }
  if (p === 'admin') renderAdminUsers();
  document.getElementById('content').scrollTop = 0;

  // Topbar "Yeni" düyməsi — yalnız canEdit üçün
  var newBtn = document.getElementById('topbar-new-btn');
  if (newBtn) {
    newBtn.style.display = (currentUser && (currentUser.canEdit || currentUser.role === 'admin')) ? 'flex' : 'none';
  }
}

// ===== FORM =====
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
function selOtaq(el, val) {
  document.querySelectorAll('#otaq-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected'); });
  el.classList.add('selected'); selOtaqVal = val; document.getElementById('f-otaq').value = val;
}
function saveMuraciet() {
  if (!currentUser || (!currentUser.canEdit && currentUser.role !== 'admin')) {
    showToast('⛔ Sizin bu əməliyyatı etmə hüququnuz yoxdur'); return;
  }
  var musteri = document.getElementById('f-musteri').value.trim();
  var nomre = document.getElementById('f-nomre').value.trim();
  var agent = document.getElementById('f-agent').value.trim();
  var erazi = document.getElementById('f-erazi').value;
  var emlak = document.getElementById('f-emlak').value;
  var tikili = document.getElementById('f-tikili').value;
  var budce = document.getElementById('f-budce').value;
  var otaq = selOtaqVal;
  var odeme = document.getElementById('f-odeme').value;
  var status = document.getElementById('f-status').value;
  var qeyd = document.getElementById('f-qeyd').value;
  if (!musteri || !nomre || !agent || !erazi || !emlak || !tikili || !otaq) { showToast('⚠️ Bütün vacib sahələri doldurun'); return; }
  var rec = {
    id: Date.now(), tarix: new Date().toISOString(),
    status: status, agent: agent, musteri: musteri, nomre: nomre,
    erazi: erazi, emlak: emlak, tikili: tikili, budce: budce || '—',
    otaq: otaq, odeme: odeme, qeyd: qeyd,
    createdBy: currentUser.username
  };
  DB.muracietler.unshift(rec);
  addNotification('Yeni: ' + musteri + ' | ' + agent + ' — ' + otaq + ' (' + erazi + ')');
  playDing(); showToast('✅ Müraciət əlavə edildi!');
  clearForm(); updateStats(); renderList(); renderDash();
}
function clearForm() {
  ['f-musteri', 'f-nomre', 'f-agent', 'f-erazi', 'f-emlak', 'f-tikili', 'f-budce', 'f-qeyd'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('#otaq-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected'); });
  selOtaqVal = ''; setStatus('Aktiv'); setPay('Nağd'); setDateField();
}

// ===== KART =====
function makeCard(r, showActions) {
  // Düymələr yalnız admin və ya canEdit=true olanlara göstərilir
  var canDoActions = showActions && currentUser && (currentUser.role === 'admin' || currentUser.canEdit);
  var btns = '';
  if (canDoActions) {
    btns = '<button class="m-edit-btn" onclick="openEdit(' + r.id + ')"><i class="ti ti-edit"></i> Düzəlt</button>'
      + '<button class="m-del-btn" onclick="delRec(' + r.id + ')"><i class="ti ti-trash"></i></button>';
  }
  return '<div class="m-card row-new">'
    + '<div class="m-card-top">'
    + '<div><div class="m-card-name">' + r.musteri + '</div>'
    + '<div style="font-size:12px;color:var(--text2);margin-top:2px"><i class="ti ti-phone" style="font-size:11px"></i> ' + r.nomre + '</div></div>'
    + '<span class="m-card-date">' + fmtDate(r.tarix) + '</span>'
    + '</div>'
    + '<div class="m-card-tags">'
    + statusBadge(r.status) + odemeBadge(r.odeme) + emlakBadge(r.emlak) + tikBadge(r.tikili)
    + '<span class="badge badge-blue">' + r.otaq + '</span>'
    + '<span class="badge badge-gray">' + r.erazi + '</span>'
    + '</div>'
    + '<div class="m-card-row">'
    + '<span class="m-card-budce">' + budceFmt(r.budce) + '</span>'
    + '<div style="display:flex;gap:6px">' + btns + '</div>'
    + '</div>'
    + '<div class="m-card-agent"><i class="ti ti-user" style="font-size:12px;color:var(--acc)"></i> Agent: <b>' + r.agent + '</b></div>'
    + (r.qeyd ? '<div style="font-size:12px;color:var(--text3);margin-top:5px;padding-top:5px;border-top:1px solid var(--border)">📝 ' + r.qeyd + '</div>' : '')
    + '</div>';
}

function renderList() {
  var st = document.getElementById('f-st').value;
  var ot = document.getElementById('f-ot').value;
  var od = document.getElementById('f-od').value;
  var data = DB.muracietler.filter(function (r) {
    if (st && r.status !== st) return false;
    if (ot && r.otaq !== ot) return false;
    if (od && r.odeme !== od) return false;
    return true;
  });
  document.getElementById('cedvel-count').textContent = data.length + ' nəticə';
  var el = document.getElementById('main-list');
  if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>Müraciət yoxdur</div>'; return; }
  el.innerHTML = data.map(function (r) { return makeCard(r, true); }).join('');
}

function delRec(id) {
  if (!currentUser || (!currentUser.canEdit && currentUser.role !== 'admin')) {
    showToast('⛔ Silmə hüququnuz yoxdur'); return;
  }
  if (!confirm('Silmək istədiyinizə əminsiniz?')) return;
  DB.muracietler = DB.muracietler.filter(function (r) { return r.id !== id; });
  showToast('🗑️ Silindi'); updateStats(); renderList(); renderDash();
}

function renderDash() {
  var el = document.getElementById('dash-list');
  var recent = DB.muracietler.slice(0, 5);
  if (!recent.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>Müraciət yoxdur</div>'; return; }
  el.innerHTML = recent.map(function (r) { return makeCard(r, false); }).join('');
}

function updateStats() {
  var all = DB.muracietler;
  document.getElementById('s-total').textContent = all.length;
  document.getElementById('s-aktiv').textContent = all.filter(function (r) { return r.status === 'Aktiv'; }).length;
  var today = new Date().toDateString();
  document.getElementById('s-today').textContent = all.filter(function (r) { return new Date(r.tarix).toDateString() === today; }).length;
  document.getElementById('s-ipoteka').textContent = all.filter(function (r) { return r.odeme === 'İpoteka'; }).length;
}

// ===== MODAL =====
function openEdit(id) {
  if (!currentUser || (!currentUser.canEdit && currentUser.role !== 'admin')) {
    showToast('⛔ Redakt hüququnuz yoxdur'); return;
  }
  var r = DB.muracietler.find(function (x) { return x.id === id; });
  if (!r) return;
  document.getElementById('e-id').value = id;
  document.getElementById('e-agent').value = r.agent;
  document.getElementById('e-musteri').value = r.musteri;
  document.getElementById('e-nomre').value = r.nomre;
  document.getElementById('e-budce').value = r.budce === '—' ? '' : r.budce;
  document.getElementById('e-erazi').value = r.erazi;
  document.getElementById('e-emlak').value = r.emlak;
  document.getElementById('e-tikili').value = r.tikili;
  document.getElementById('e-qeyd').value = r.qeyd || '';
  setEditStatus(r.status); setEditPay(r.odeme);
  document.querySelectorAll('#e-otaq-chips .otaq-chip').forEach(function (c) {
    c.classList.toggle('selected', c.getAttribute('data-val') === r.otaq);
  });
  document.getElementById('e-otaq').value = r.otaq;
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
function selEditOtaq(el, val) {
  document.querySelectorAll('#e-otaq-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected'); });
  el.classList.add('selected'); document.getElementById('e-otaq').value = val;
}
function saveEdit() {
  var id = Number(document.getElementById('e-id').value);
  var r = DB.muracietler.find(function (x) { return x.id === id; });
  if (!r) return;
  r.status = document.getElementById('e-status').value;
  r.agent = document.getElementById('e-agent').value.trim();
  r.musteri = document.getElementById('e-musteri').value.trim();
  r.nomre = document.getElementById('e-nomre').value.trim();
  r.budce = document.getElementById('e-budce').value || '—';
  r.erazi = document.getElementById('e-erazi').value;
  r.emlak = document.getElementById('e-emlak').value;
  r.tikili = document.getElementById('e-tikili').value;
  r.odeme = document.getElementById('e-odeme').value;
  r.otaq = document.getElementById('e-otaq').value;
  r.qeyd = document.getElementById('e-qeyd').value;
  closeModal(); renderList(); renderDash(); updateStats(); showToast('✅ Yeniləndi!');
}
function closeModal() { document.getElementById('edit-modal').classList.remove('show'); }

// ===== AXTARIŞ =====
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
}
function doSearch() {
  var st = document.getElementById('ax-status').value;
  var od = document.getElementById('ax-odeme').value;
  var erazi = document.getElementById('ax-erazi').value;
  var emlak = document.getElementById('ax-emlak').value;
  var tikili = document.getElementById('ax-tikili').value;
  var bmin = document.getElementById('ax-b-min').value;
  var bmax = document.getElementById('ax-b-max').value;
  var agent = document.getElementById('ax-agent').value.trim().toLowerCase();
  var res = DB.muracietler.filter(function (r) {
    if (st && r.status !== st) return false;
    if (od && r.odeme !== od) return false;
    if (erazi && r.erazi !== erazi) return false;
    if (emlak && r.emlak !== emlak) return false;
    if (tikili && r.tikili !== tikili) return false;
    if (axOtaqVals.length > 0 && axOtaqVals.indexOf(r.otaq) < 0) return false;
    if (bmin && r.budce !== '—' && Number(r.budce) < Number(bmin)) return false;
    if (bmax && r.budce !== '—' && Number(r.budce) > Number(bmax)) return false;
    if (agent && r.agent.toLowerCase().indexOf(agent) < 0) return false;
    return true;
  });
  document.getElementById('ax-count').textContent = res.length + ' nəticə';
  var el = document.getElementById('ax-list');
  if (!res.length) { el.innerHTML = '<div class="empty-state"><i class="ti ti-search-off"></i>Nəticə tapılmadı</div>'; return; }
  el.innerHTML = res.map(function (r) { return makeCard(r, false); }).join('');
}
function clearSearch() {
  ['ax-status', 'ax-odeme', 'ax-erazi', 'ax-emlak', 'ax-tikili', 'ax-b-min', 'ax-b-max', 'ax-agent'].forEach(function (id) { document.getElementById(id).value = ''; });
  axOtaqVals = [];
  document.querySelectorAll('#ax-chips .otaq-chip').forEach(function (c) { c.classList.remove('selected', 'multi-selected'); });
  var allChip = document.querySelector('#ax-chips .otaq-chip[data-val=""]');
  if (allChip) allChip.classList.add('selected');
  document.getElementById('ax-otaq-info').textContent = '';
  document.getElementById('ax-count').textContent = '';
  document.getElementById('ax-list').innerHTML = '<div class="empty-state" style="color:var(--text3)">Axtarış edin</div>';
}

// ===== BİLDİRİŞLƏR =====
function addNotification(msg) {
  DB.notifications.unshift({ msg: msg, time: new Date().toISOString(), read: false });
  var cnt = DB.notifications.filter(function (n) { return !n.read; }).length;
  var el = document.getElementById('notif-count'); el.textContent = cnt; el.style.display = cnt > 0 ? 'flex' : 'none';
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
  var p = document.getElementById('notif-panel'); p.style.display = p.style.display === 'block' ? 'none' : 'block';
  renderNotifs();
}
function clearNotifs() { DB.notifications = []; renderNotifs(); document.getElementById('notif-panel').style.display = 'none'; }

document.addEventListener('click', function (e) {
  var p = document.getElementById('notif-panel');
  if (p.style.display === 'block' && !p.contains(e.target) && !e.target.closest('.notif-btn')) p.style.display = 'none';
  var m = document.getElementById('edit-modal');
  if (m.classList.contains('show') && e.target === m) closeModal();
});

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
