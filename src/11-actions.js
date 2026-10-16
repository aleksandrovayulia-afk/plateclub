
/* ---------- actions ---------- */
const A = Object.assign({}, ADMIN_ACTS, UA, GA);
A.drawer = () => openDrawer(); A.drawerclose = () => closeDrawer(); A.drawerbg = (el, e) => { if (e.target === el) closeDrawer(); };
A.lang = btn => { const l = btn.dataset.l; if (l === LANG) return; LANG = l; store.set('lang', l); applyPrefs(); sfx('click'); render(false); };
A.ccat = btn => { CF.cat = btn.dataset.k; $$('.cats .chip').forEach(b => b.setAttribute('aria-pressed', b === btn)); $('#cgridBox').innerHTML = casesGrid(); fx($('#cgridBox')); };
let opening = false;
A.open = async btn => {
  if (opening) return; opening = true;
  const c = caseById(btn.dataset.case);
  const st = openStage(c); sfx('open');
  const req = POST(`/api/cases/${c.id}/open`, {}, { key: rid() }).then(r => ({ r }), e => ({ e }));
  try {
    await spinCase(st, req);
    const { r, e } = await req;
    if (e) { closeStage(); toast(e.message, true); return; }
    if (st.dead) return;
    ME.balance = r.balance; ME.stats.opened++; chrome();
    await burstCase(st); if (st.dead) return;
    await roll(st.el, c, r.plate); if (st.dead) return;
    celebrate(st.el, r.plate);
    await wait(reduced() ? 0 : ({ common: 800, fine: 1000, rare: 1300, elite: 1600, grail: 2100 })[r.plate.tier]); if (st.dead) return;
    st.el.querySelector('.st-res').innerHTML = resultHtml(c, r.plate); st.el.classList.add('st-done'); st.el.querySelector('.st-skip').hidden = true;
    st.el.querySelector('.st-res [autofocus]')?.focus();
    if ($('#openAct')) { $('#openAct').innerHTML = openAction(c); if ($('#buybox')) $('#buybox').innerHTML = buyBox(c); }
    refreshMe().then(refreshPerks);
  } finally { opening = false; }
};
A.stskip = () => { if (!STAGE) return; STAGE.skipped = true; rollState && rollState.skip(); };
A.stclose = () => closeStage();
A.dealer = async () => {
  let d; try { d = await GET('/api/dealer'); } catch (e) { return toast(e.message, true); }
  const left = Math.max(0, d.perDay - d.used);
  openDialog(`<div class="dlg"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${L('Скупщик', 'Dealer')} · ${L('осталось сегодня', 'left today')} ${left}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${L('Продать скупщику', 'Sell to the dealer')}</h2></div><button class="btn btn-sm btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div>
    <p class="small" style="margin:0">${L(`Скупщик платит ${Math.round(d.rate * 100)}% оценки — больше, чем банк (${Math.round(CFG.bankRate * 100)}%) и почти всегда больше рынка.`, `The dealer pays ${Math.round(d.rate * 100)}% of value — more than the bank (${Math.round(CFG.bankRate * 100)}%) and usually more than the market.`)}</p>
    <div class="dl-list">${d.plates.length ? d.plates.map(p => `<div class="dl-row">${Plate(p, { iri: false })}<div class="small">${esc(L((d.demands.find(x => x.id === p.demand) || {}).ru || '', (d.demands.find(x => x.id === p.demand) || {}).en || ''))}<br>${L('Оценка', 'Value')} ${fmt(p.value)}${p.paid != null ? ` · ${L('куплен за', 'paid')} ${fmt(p.paid)}` : ''}</div><button class="btn btn-sm btn-chrome" data-act="dsell" data-id="${p.id}" ${left ? '' : 'disabled'}>+${fmt(p.offer)} PLT</button></div>`).join('') : `<p class="small">${L('Подходящих номеров нет. Купите такие на рынке дешевле оценки — и продайте скупщику.', 'No matching plates. Buy some below value on the market and sell them to the dealer.')}</p>`}</div></div>`);
};
A.dsell = async btn => {
  busy(btn, true, '…');
  try { const r = await POST('/api/dealer/sell', { plateId: btn.dataset.id }, { key: 'dl-' + btn.dataset.id + '-' + Date.now() }); sfx('coin'); toast(L(`Продано скупщику · +${fmt(r.amount)} PLT`, `Sold to the dealer · +${fmt(r.amount)} PLT`)); await refreshMe(); chrome(); await A.dealer(); if (parseRoute().name === 'market') render(false); }
  catch (e) { busy(btn, false); toast(e.message, true); }
};
A.bank = async btn => {
  const v = Number(btn.dataset.v), amt = Math.round(v * CFG.bankRate);
  const ok = await confirmDialog({ title: L('Продать банку', 'Sell to the bank'), lede: L(`${esc(btn.dataset.s)} навсегда уйдёт из коллекции.`, `${esc(btn.dataset.s)} leaves your collection for good.`), rows: [[L('Оценка', 'Value'), fmt(v) + ' PLT'], [L('Курс банка', 'Bank rate'), CFG.bankRate * 100 + '%'], [L('Вы получите', 'You get'), '+' + fmt(amt) + ' PLT', 1]], ok: L('Продать за ', 'Sell for ') + fmt(amt), danger: true });
  if (!ok) return;
  try { const r = await POST('/api/plates/' + btn.dataset.id + '/bank'); sfx('coin'); toast(L(`Продано банку · +${fmt(r.amount)} PLT`, `Sold to the bank · +${fmt(r.amount)} PLT`)); await refreshMe(); if (btn.dataset.after === 'stage') { closeStage(); const c = caseById(parseRoute().arg); if (c && $('#openAct')) { $('#openAct').innerHTML = openAction(c); if ($('#buybox')) $('#buybox').innerHTML = buyBox(c); } } else render(false); }
  catch (e) { toast(e.message, true); }
};
A.detail = async btn => {
  if (!ME) return go('#/login?next=' + encodeURIComponent(location.hash));
  const [d] = await Promise.all([GET('/api/plates/' + btn.dataset.id).catch(e => { toast(e.message, true); return null; }), refreshMe()]); if (!d) return;
  const l = d.listing, p = d.plate; if (!l) return toast(L('Этот номер больше не продаётся.', 'This plate is no longer for sale.'), true);
  const can = ME.balance >= l.price;
  openDialog(`<div class="dlg"><div><p class="eyebrow">${L('Объявление', 'Listing')} ${l.id}</p><h2 class="h3" id="dlgTitle" style="margin-top:6px">${L('Покупка', 'Buy')} ${esc(plateStr(p))}</h2></div><div class="dlg-plate">${Plate(p, { holo: true })}</div>
    <dl class="kv"><dt>ID</dt><dd class="iri-t">${p.id}</dd><dt>${L('Редкость', 'Rarity')}</dt><dd>${tierName(p.tier)}</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Продавец', 'Seller')}</dt><dd>${esc(l.seller)}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd>
      <dt class="tot">${L('К оплате', 'To pay')}</dt><dd class="tot">${fmt(l.price)} PLT</dd><dt>${L('Баланс после', 'Balance after')}</dt><dd>${can ? fmt(ME.balance - l.price) + ' PLT' : '—'}</dd></dl>
    ${can ? '' : `<p class="err">${L(`Не хватает ${fmt(l.price - ME.balance)} PLT.`, `${fmt(l.price - ME.balance)} PLT short.`)}</p>`}
    <div class="dlg-acts"><a class="btn btn-ghost" href="#/plate/${p.id}">${L('Сначала проверить', 'Verify first')}</a><button class="btn btn-chrome" data-act="buy" data-id="${l.id}" data-price="${l.price}" ${can ? '' : 'disabled'} autofocus>${L('Купить за', 'Buy for')} ${fmt(l.price)} PLT</button></div></div>`);
};
A.buy = async btn => {
  busy(btn, true, '…');
  try { await POST(`/api/market/listings/${btn.dataset.id}/buy`, { expectedPrice: Number(btn.dataset.price) }, { key: rid() }); sfx('buy'); dlg.close(); toast(L('Покупка подтверждена. Номер в вашей коллекции.', 'Purchase confirmed. The plate is in your collection.')); await refreshMe(); render(false); }
  catch (e) { toast(e.message, true); busy(btn, false); if (e.status === 409) { dlg.close(); if (parseRoute().name === 'market') loadMarket(true); else render(false); } }
};
A.cancel = async btn => { busy(btn, true, '…'); try { await DEL('/api/market/listings/' + btn.dataset.id); toast(L('Объявление снято.', 'Listing cancelled.')); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
const feeRows = v => `<dt>${L('Комиссия', 'Fee')} ${CFG.fee * 100}%</dt><dd>−${fmt(Math.round(v * CFG.fee))} PLT</dd><dt class="tot">${L('Вы получите', 'You get')}</dt><dd class="tot">${fmt(v - Math.round(v * CFG.fee))} PLT</dd>`;
A.editlisting = btn => {
  openDialog(`<form class="dlg" id="editForm" novalidate><h2 class="h3" id="dlgTitle">${L('Новая цена', 'New price')} · ${btn.dataset.id}</h2><div class="fld"><label for="eprice">${L('Цена, PLT', 'Price, PLT')}</label><input class="field mono" id="eprice" type="number" inputmode="numeric" min="1" max="10000000" value="${btn.dataset.price}" required></div><dl class="kv" id="ecalc"></dl><p class="err" id="eerr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Сохранить', 'Save')}</button></div></form>`);
  const pr = $('#eprice'); const calc = () => { $('#ecalc').innerHTML = feeRows(+pr.value || 0); }; calc(); pr.addEventListener('input', calc);
  $('#editForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await PATCH('/api/market/listings/' + btn.dataset.id, { price: Math.round(+pr.value) }); dlg.close(); toast(L('Цена обновлена.', 'Price updated.')); loadMarket(true); } catch (x) { $('#eerr').hidden = false; $('#eerr').textContent = x.message; busy(sb, false); } });
};
A.dlgclose = () => dlg.close();
A.reload = () => location.reload();
A.pwdlg = () => { openDialog(`<form class="dlg" id="pwForm"><h2 class="h3" id="dlgTitle">${L('Смена пароля', 'Change password')}</h2>
  <div class="fld"><label for="pwCur">${L('Текущий пароль', 'Current password')}</label><input class="field" id="pwCur" type="password" autocomplete="current-password" required></div>
  <div class="fld"><label for="pwNew">${L('Новый пароль', 'New password')}</label><input class="field" id="pwNew" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><p class="hint">${L('Минимум 8 символов.', 'At least 8 characters.')}</p></div>
  <p class="err" id="pwErr" hidden></p>
  <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Сохранить', 'Save')}</button></div></form>`);
  const f = $('#pwForm'); f.addEventListener('submit', async e => { e.preventDefault(); const b = f.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST('/api/auth/password', { current: $('#pwCur').value, password: $('#pwNew').value }); dlg.close(); toast(L('Пароль изменён. Другие устройства вышли из аккаунта.', 'Password changed. Other devices were signed out.')); }
    catch (x) { $('#pwErr').hidden = false; $('#pwErr').textContent = x.message; busy(b, false); } });
};
A.logoutothers = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/auth/logout-others', {}); toast(r.closed ? L(`Завершено сессий: ${r.closed}.`, `Sessions ended: ${r.closed}.`) : L('Других активных сессий нет.', 'No other active sessions.')); } catch (x) { toast(x.message, 'err'); } busy(btn, false); };
A.rkby = btn => { RK.by = btn.dataset.k; render(false); };
A.odds = btn => { const c = caseById(btn.dataset.case); if (c) { sfx('click'); oddsDialog(c); } };
A.daily = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/daily'); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.lvlclaim = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/level/claim'); coins(btn, 18); sfx('coin'); toast(`+${fmt(r.amount)} PLT · LV ${r.level}`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.achclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/perks/achievements/${btn.dataset.id}/claim`); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.listdlg = async btn => {
  if (!ME) return go('#/login');
  let col; try { col = (await GET('/api/collection')).plates; } catch (e) { return toast(e.message, true); }
  const av = col.filter(p => !p.listing).sort((a, b) => b.value - a.value);
  if (!av.length) { openDialog(`<div class="dlg"><h2 class="h3" id="dlgTitle">${L('Выставить номер', 'List a plate')}</h2>${Empty(L('Нечего выставить', 'Nothing to list'), L('Здесь появятся ваши номера, которые ещё не на рынке.', 'Your plates that are not on the market will appear here.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`)}<div class="dlg-acts"><button class="btn btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div></div>`); return; }
  const sel = btn.dataset.id && av.find(p => p.id === btn.dataset.id) ? btn.dataset.id : av[0].id;
  openDialog(`<form class="dlg" id="listForm" novalidate><h2 class="h3" id="dlgTitle">${L('Выставить на рынок', 'List on the market')}</h2>
    <fieldset style="border:0;padding:0;margin:0"><legend class="small" style="margin-bottom:8px;font-weight:700">${L('Номер', 'Plate')}</legend><div class="pick">${av.map(p => `<label><input type="radio" name="pl" value="${p.id}" ${p.id === sel ? 'checked' : ''}>${Plate(p)}<span class="small">${tierName(p.tier)} · ${fmt(p.value)}</span></label>`).join('')}</div></fieldset>
    <div class="fld"><label for="lprice">${L('Цена, PLT', 'Price, PLT')}</label><input class="field mono" id="lprice" type="number" inputmode="numeric" min="1" max="10000000" required></div>
    <dl class="kv" id="lcalc"></dl><p class="err" id="lerr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Выставить', 'List')}</button></div></form>`);
  const f = $('#listForm'), pr = $('#lprice'); const cur = () => av.find(p => p.id === f.pl.value);
  const calc = () => { $('#lcalc').innerHTML = feeRows(+pr.value || 0); };
  const def = () => { pr.value = Math.round(cur().value * 1.1); calc(); }; def();
  f.addEventListener('change', e => { if (e.target.name === 'pl') def(); }); pr.addEventListener('input', calc);
  f.addEventListener('submit', async e => {
    e.preventDefault(); const v = Math.round(+pr.value), err = $('#lerr');
    if (!(v >= 1 && v <= 1e7)) { err.hidden = false; err.textContent = L('Введите целую цену от 1 до 10 000 000 PLT.', 'Enter a whole price from 1 to 10 000 000 PLT.'); pr.focus(); return; }
    const sb = f.querySelector('[type=submit]'); busy(sb, true, '…');
    try { const r = await POST('/api/market/listings', { plateId: cur().id, price: v }); sfx('confirm'); dlg.close(); closeStage(); toast(L(`Выставлено за ${fmt(v)} PLT`, `Listed for ${fmt(v)} PLT`) + ` · ${r.listing.id}`); if (parseRoute().name !== 'case') render(false); }
    catch (x) { err.hidden = false; err.textContent = x.message; busy(sb, false); }
  });
};
A.verify = async btn => {
  const frame = $('#vfFrame'), idEl = $('#vfId'), res = $('#vfRes'); const id = btn.dataset.id;
  busy(btn, true, L('Проверяем…', 'Checking…')); res.innerHTML = ''; frame.classList.remove('ok', 'edge', 'scanning'); void frame.offsetWidth;
  const q = GET('/api/verify/' + encodeURIComponent(id)).catch(e => ({ verified: false, reason: e.message, checks: [] }));
  const w = ms => wait(reduced() ? 0 : ms);
  frame.classList.add('scanning'); await w(700); frame.classList.add('edge'); await w(900);
  const d = await q; frame.classList.remove('scanning', 'edge'); if (d.verified) frame.classList.add('ok');
  const checks = (d.checks || []).map(c => `<li><span class="${c.ok ? 'y' : 'n'}">${c.ok ? '✓' : '✕'}</span>${esc(srv(c.name))}</li>`).join('');
  res.innerHTML = d.verified
    ? `<div class="vf-mark ok">${VB()}</div><p class="vf-status iri-t">${L('Подлинный номер', 'Authentic plate')}</p><p class="mono small" style="margin:0">${esc(d.id)} · ${date(d.checkedAt)}</p><ul class="checks">${checks}</ul><p class="small" style="max-width:52ch;margin:6px 0 0">${L('Подтверждает запись игрового предмета внутри Plate Club. Это не проверка госномера.', 'Confirms the game record inside Plate Club. This is not a check of a real registration plate.')}</p>`
    : `<div class="vf-mark no" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.5"/></svg></div><p class="vf-status">${L('Не подтверждено', 'Not verified')}</p><p class="small" style="margin:0">${esc(srv(d.reason) || '')}</p>${checks ? `<ul class="checks">${checks}</ul>` : ''}`;
  sfx(d.verified ? 'rare' : 'fail'); busy(btn, false); btn.textContent = L('Проверить ещё раз', 'Check again');
};
A.mtier = btn => { const t = btn.dataset.t; M.tiers = M.tiers.includes(t) ? M.tiers.filter(x => x !== t) : [...M.tiers, t]; btn.setAttribute('aria-pressed', M.tiers.includes(t)); loadMarket(); };
A.mseg = btn => { M[btn.dataset.k] = btn.dataset.v; btn.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn)); loadMarket(); };
A.mreset = () => { Object.assign(M, { q: '', tiers: [], group: '', min: '', max: '', sort: 'deal', who: '' }); render(false); };
A.ctier = btn => { C.tier = btn.dataset.t; render(false); };
A.pwshow = btn => { const i = btn.previousElementSibling; const s = i.type === 'password'; i.type = s ? 'text' : 'password'; btn.textContent = s ? L('Скрыть', 'Hide') : L('Показать', 'Show'); };
A.logout = async () => { try { await POST('/api/auth/logout'); } catch {} ME = null; PERKS = null; toast(L('Вы вышли.', 'Signed out.')); go('#/'); };
A.resend = async btn => { busy(btn, true, '…'); try { await POST('/api/auth/resend-verify'); toast(L('Письмо отправлено.', 'Email sent.')); } catch (e) { toast(e.message, true); } busy(btn, false); };

document.addEventListener('click', e => {
  const inner = e.target.closest('[data-act]'); const card0 = e.target.closest('a[data-fx="case"]'); const a0 = e.target.closest('a');
  if (inner && a0 && a0 !== inner && a0.contains(inner)) { e.preventDefault(); const f = A[inner.dataset.act]; if (f) f(inner, e); return; }
  const card = card0;
  if (card && !e.metaKey && !e.ctrlKey && !e.button && !reduced()) {
    e.preventDefault(); const r = card.getBoundingClientRect(); const b = document.createElement('i'); b.className = 'burst'; b.style.setProperty('--c', getComputedStyle(card).getPropertyValue('--c')); b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height * 0.4 + 'px'; document.body.appendChild(b); setTimeout(() => b.remove(), 700);
    sfx('open'); card.classList.add('go'); setTimeout(() => go(card.getAttribute('href')), 380); return;
  }
  const el = e.target.closest('[data-act]'); if (!el) return; const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); if (el.disabled) return; fn(el, e);
});
document.addEventListener('pointerdown', e => { const b = e.target.closest('.btn'); if (!b || b.disabled || reduced()) return; const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height); const s = document.createElement('span'); s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`; b.appendChild(s); setTimeout(() => s.remove(), 650); });
let qT;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'mq') { M.q = t.value; clearTimeout(qT); qT = setTimeout(loadMarket, 220); }
  if (t.id === 'mmin' || t.id === 'mmax') { M[t.id === 'mmin' ? 'min' : 'max'] = t.value; clearTimeout(qT); qT = setTimeout(loadMarket, 300); }
  if (t.id === 'svol') { PREF.vol = +t.value; savePref(); $('#volTxt').textContent = Math.round(PREF.vol * 100) + '%'; }
  if (t.classList && t.classList.contains('field') && t.getAttribute('aria-invalid') === 'true' && t.id !== 'nickname') { t.removeAttribute('aria-invalid'); const er = $('#' + t.id + '-e'); if (er) er.hidden = true; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'csort') { C.sort = t.value; render(false); }
  if (t.id === 'csort2') { CF.sort = t.value; $('#cgridBox').innerHTML = casesGrid(); fx($('#cgridBox')); }
  if (t.id === 'smotion') { PREF.motion = t.value; savePref(); }
  if (t.id === 'svol') sfx('tick');
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'promoForm') {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type=submit]'), er = f.parentElement.querySelector('#promoErr'); er.hidden = true; busy(b, true, '…');
    try { const r = await POST('/api/promo/redeem', { code: f.promo.value.trim() }); coins(b, 18); sfx('coin'); toast(`${r.code}: +${fmt(r.amount)} PLT`); f.reset(); await refreshMe(); if (parseRoute().name === 'bonus') render(false); }
    catch (x) { er.hidden = false; er.textContent = x.message; }
    busy(b, false); return;
  }
  const f = e.target; if (f.id !== 'authForm') return; e.preventDefault();
  const kind = f.querySelector('[data-form]').dataset.form; const b = f.querySelector('[type=submit]');
  const showErr = (msg, fields = {}) => { const fe = $('#formErr'); fe.hidden = !msg; fe.textContent = msg || ''; Object.entries(fields).forEach(([k, v]) => { const el = $('#' + k + '-e'), inp = $('#' + k); if (el) { el.hidden = false; el.className = 'ferr'; el.textContent = srv(v); } if (inp) inp.setAttribute('aria-invalid', 'true'); }); const first = Object.keys(fields)[0]; if (first) $('#' + first)?.focus(); };
  f.querySelectorAll('.ferr').forEach(x => { if (x.id !== 'nickname-e') x.hidden = true; });
  const v = n => (f[n] ? f[n].value : ''); const local = {};
  if (['register', 'login', 'forgot'].includes(kind) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email').trim())) local.email = L('Введите корректный email, например name@example.com.', 'Enter a valid email, like name@example.com.');
  if (kind === 'register' && !/^[A-Za-z0-9_]{3,20}$/.test(v('nickname').trim())) local.nickname = L('3–20 латинских букв, цифр или «_».', '3–20 Latin letters, digits or “_”.');
  if ((kind === 'register' || kind === 'reset') && v('password').length < 8) local.password = L('Минимум 8 символов.', 'At least 8 characters.');
  if (kind === 'login' && !v('password')) local.password = L('Введите пароль.', 'Enter your password.');
  if (kind === 'register' && !f.terms.checked) local.terms = L('Примите правила и политику конфиденциальности.', 'Accept the terms and the privacy policy.');
  if (Object.keys(local).length) return showErr('', local);
  busy(b, true, '…');
  try {
    if (kind === 'register') { const r = await POST('/api/auth/register', { email: v('email').trim(), nickname: v('nickname').trim(), password: v('password'), terms: true }); await refreshMe(); refreshPerks(); sfx('confirm'); toast(L(`Добро пожаловать, ${ME.nickname}! +${r.bonus} PLT`, `Welcome, ${ME.nickname}! +${r.bonus} PLT`)); go('#/cases'); }
    else if (kind === 'login') { await POST('/api/auth/login', { email: v('email').trim(), password: v('password') }); await refreshMe(); refreshPerks(); toast(L(`Вы вошли как ${ME.nickname}.`, `Signed in as ${ME.nickname}.`)); const nx = v('next'); go(nx && nx.startsWith('#/') && !nx.startsWith('#/login') ? nx : '#/'); }
    else if (kind === 'forgot') { await POST('/api/auth/forgot', { email: v('email').trim() }); busy(b, false); b.disabled = true; $('#formOk').innerHTML = `<div class="notice"><b>${L('Проверьте почту', 'Check your email')}</b>${L('Если аккаунт с этим email есть, ссылка уже в пути.', 'If an account with this email exists, the link is on its way.')}</div>`; return; }
    else if (kind === 'reset') { await POST('/api/auth/reset', { token: v('token'), password: v('password') }); await refreshMe(); toast(L('Пароль сохранён, вы вошли.', 'Password saved, you are signed in.')); history.replaceState(null, '', location.pathname); go('#/'); }
  } catch (x) { showErr(x.message, (x.data && x.data.fields) || {}); busy(b, false); }
});

/* drawer */
function openDrawer() {
  const g = (title, items) => `<div class="dgroup"><span class="eyebrow">${title}</span>${items.map(([h, t, ic]) => `<a href="#/${esc(h)}">${IC[ic]}${t}</a>`).join('')}</div>`;
  const game = g(L('Игра', 'Game'), [['cases', L('Кейсы', 'Cases'), 'cases'], ['battles', L('Кейс-баттл', 'Case battle'), 'swords'], ['auction', L('Аукцион дня', 'Auction of the day'), 'hammer'], ['sets', L('Коллекции', 'Collections'), 'layers'], ['swap', L('Обмен номерами', 'Plate swaps'), 'swap'], ['upgrade', L('Апгрейд', 'Upgrade'), 'up'], ['market', L('Рынок', 'Market'), 'market'], ['top', L('Топ аккаунтов', 'Top accounts'), 'trophy']]);
  const info = g(L('Инфо', 'Info'), [['settings', L('Настройки', 'Settings'), 'gear'], ['help', L('Помощь', 'Help'), 'help'], ['terms', L('Правила', 'Terms'), 'doc'], ['privacy', L('Конфиденциальность', 'Privacy'), 'doc']]);
  const lang = `<div class="dgroup"><span class="eyebrow">${L('Язык', 'Language')}</span><div class="lang" style="justify-self:start;margin-left:12px"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>`;
  const body = ME
    ? g(L('Аккаунт', 'Account'), [['profile', L('Профиль', 'Profile'), 'user'], ['collection', L('Мои номера', 'My plates'), 'coll'], ['wallet', L('Кошелёк', 'Wallet'), 'wallet'], ['bonus', L('Бонусы и промокоды', 'Bonuses & promo codes'), 'gift'], ...(ME.role === 'admin' ? [['admin', L('Панель админа', 'Admin panel'), 'crown']] : []), ['trades', L('Мои сделки', 'My trades'), 'swap'], ['support', L('Поддержка', 'Support') + (ME.unread ? ' •' : ''), 'chat']]) + game + lang + info + `<div class="dgroup"><button data-act="logout">${IC.out}${L('Выйти', 'Sign out')}</button></div>`
    : g(L('Аккаунт', 'Account'), [['login', L('Войти', 'Sign in'), 'login'], ['register', L('Регистрация', 'Sign up'), 'user']]) + game + lang + info;
  $('#drawerHost').innerHTML = `<div class="drawer" data-act="drawerbg"><div class="drawer-in" role="dialog" aria-modal="true" aria-label="${L('Меню', 'Menu')}"><div class="row" style="justify-content:space-between;margin-bottom:12px"><img src="${BRAND('logo-chrome-360.png')}" alt="Plate Club" style="height:34px;width:auto"><button class="btn btn-sm btn-ghost" data-act="drawerclose">${L('Закрыть', 'Close')}</button></div>${ME ? `<div class="panel" style="padding:16px;margin-bottom:12px;display:flex;gap:12px;align-items:center">${Ava(ME.nickname)}<div><b>${esc(ME.nickname)}</b> ${Medals(ME.medals)} <span class="lvl-tag">LV ${ME.level.level}</span><div class="mono" style="margin-top:4px">${fmt(ME.balance)} PLT</div></div></div>` : ''}${body}</div></div>`;
  $('#drawerHost .drawer-in button').focus();
}
function closeDrawer() { $('#drawerHost').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#drawerHost').innerHTML) closeDrawer(); else if (STAGE && !dlg.open) { if (STAGE.el.classList.contains('st-done')) closeStage(); else A.stskip(); } });

/* ---------- boot ---------- */
async function boot() {
  applyPrefs(); document.documentElement.style.setProperty('--logo', `url("${BRAND('logo-chrome-900.png')}")`); document.documentElement.style.setProperty('--bgimg', `url("${IMG('hero-chrome.jpg')}")`);document.documentElement.style.setProperty('--tex', `url("${IMG('tex-1.jpg')}")`);
  const bar = $('#spBar'), step = $('#spStep'); const set = (p, s) => { if (bar) bar.style.width = p + '%'; if (step) step.textContent = s; };
  set(15, L('Загружаем каталог', 'Loading catalogue')); const params = new URLSearchParams(location.search);
  try { const [cfg] = await Promise.all([GET('/api/config'), refreshMe().then(() => set(70, L('Проверяем вход', 'Checking session')))]); CFG = cfg; set(85, L('Шрифты', 'Fonts')); await Promise.race([document.fonts ? document.fonts.ready : null, new Promise(r => setTimeout(r, 1500))]); }
  catch (e) { set(100, L('Нет связи', 'Offline')); $('#view').innerHTML = `<div class="wrap" style="padding-block:60px">${Empty(L('Plate Club недоступен', 'Plate Club is unavailable'), esc(e.message), `<button class="btn btn-chrome" data-act="reload">${L('Обновить', 'Reload')}</button>`)}</div>`; $('#splash').classList.add('gone'); return; }
  set(100, L('Готово', 'Ready'));
  if (params.get('verify')) { try { await POST('/api/auth/verify', { token: params.get('verify') }); await refreshMe(); toast(L('Email подтверждён.', 'Email verified.')); } catch (e) { toast(e.message, true); } history.replaceState(null, '', location.pathname + (location.hash || '#/profile')); }
  if (params.get('reset')) history.replaceState(null, '', location.pathname + '#/reset?token=' + encodeURIComponent(params.get('reset')));
  await refreshPerks();
  await render(false);
  const sp = $('#splash'); sp.classList.add('gone'); setTimeout(() => sp.remove(), 450);
}
boot();
