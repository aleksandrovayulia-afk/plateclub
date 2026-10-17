
/* ---------- actions ---------- */
const A = Object.assign({}, ADMIN_ACTS, UA, GA);
A.drawer = () => openDrawer(); A.drawerclose = () => closeDrawer(); A.drawerbg = (el, e) => { if (e.target === el) closeDrawer(); };
A.lang = btn => { const l = btn.dataset.l; if (l === LANG) return; LANG = l; store.set('lang', l); applyPrefs(); sfx('click'); render(false); LIVE_SIG = ''; liveFeed(); };
A.ccat = btn => { CF.cat = btn.dataset.k; $$('.cats .chip').forEach(b => b.setAttribute('aria-pressed', b === btn)); $('#cgridBox').innerHTML = casesGrid(); fx($('#cgridBox')); };
let opening = false;
A.open = async btn => {
  if (opening) return; opening = true;
  const c = caseById(btn.dataset.case);
  const count = Math.max(1, Math.min(3, Number(btn.dataset.n) || 1));
  const st = openStage(c); sfx('open');
  const req = POST(`/api/cases/${c.id}/open`, { count }, { key: rid() }).then(r => ({ r }), e => ({ e }));
  try {
    await spinCase(st, req);
    const { r, e } = await req;
    if (e) { closeStage(); toast(e.message, true); return; }
    ME.balance = r.balance; ME.stats.opened += (r.count || 1); chrome();
    if (st.dead) { toast(L(`Номер ${plateStr(r.plate)} уже в коллекции`, `${plateStr(r.plate)} is in your collection`)); refreshMe().then(refreshPerks); return; }
    await burstCase(st); if (st.dead) return;
    await roll(st.el, c, r.plate); if (st.dead) return;
    celebrate(st.el, r.plate);
    await wait(reduced() ? 0 : ({ common: 800, fine: 1000, rare: 1300, elite: 1600, grail: 2100 })[r.plate.tier]); if (st.dead) return;
    st.el.querySelector('.st-res').innerHTML = r.plates && r.plates.length > 1 ? resultMulti(c, r.plates, r.count) : resultHtml(c, r.plate); st.el.classList.add('st-done'); st.el.querySelector('.st-skip').hidden = true;
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
    <dl class="kv"><dt>ID</dt><dd><span class="pidv"><span class="iri-t">${p.id}</span>${VB()}</span></dd><dt>${L('Редкость', 'Rarity')}</dt><dd>${tierName(p.tier)}</dd><dt>${L('Регион', 'Region')}</dt><dd>${esc(regionLabel(p))}</dd><dt>${L('Продавец', 'Seller')}</dt><dd>${esc(l.seller)}</dd><dt>${L('Оценка', 'Value')}</dt><dd>${fmt(p.value)} PLT</dd>
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
A.mkmore = btn => { MK_SHOW += 24; mkSig = ''; busy(btn, true, '…'); loadMarket(); };
A.refcopy = async btn => { const i = $('#refLink'); try { await navigator.clipboard.writeText(i.value); } catch { i.select(); document.execCommand('copy'); } toast(L('Ссылка скопирована', 'Link copied')); busy(btn, false); };
// Draws a shareable card with the plate — players post these, and a story is worth 5 000 PLT.
A.shareplate = async btn => {
  const id = btn.dataset.id;
  let p; try { p = (await GET('/api/plates/' + encodeURIComponent(id))).plate; } catch (e) { return toast(e.message, true); }
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b1220'); g.addColorStop(.55, '#070a12'); g.addColorStop(1, '#0d1726');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, H * .42, 40, W / 2, H * .42, W * .75);
  rg.addColorStop(0, 'rgba(74,168,238,.35)'); rg.addColorStop(1, 'transparent'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  const round = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
  // the plate itself
  const by = p.country === 'BY';
  const pw = 820, ph = by ? 210 : 230, px = (W - pw) / 2, py = H * .30;
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 50; x.shadowOffsetY = 24;
  round(px, py, pw, ph, 26); x.fillStyle = '#f3f5f7'; x.fill(); x.restore();
  round(px, py, pw, ph, 26); x.lineWidth = 7; x.strokeStyle = '#cfd6dd'; x.stroke();
  x.fillStyle = '#0b0c0f'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const main = by ? `${p.digits} - ${p.region}` : `${p.letters[0]}${p.digits}${p.letters.slice(1)}`;
  x.font = '700 128px "IBM Plex Mono", ui-monospace, monospace';
  x.fillText(main, px + pw * (by ? .5 : .40), py + ph / 2);
  if (!by) { x.beginPath(); x.moveTo(px + pw * .72, py + 10); x.lineTo(px + pw * .72, py + ph - 10); x.lineWidth = 6; x.strokeStyle = '#cfd6dd'; x.stroke();
    x.font = '700 76px "IBM Plex Mono", ui-monospace, monospace'; x.fillText(p.region, px + pw * .86, py + ph * .42);
    x.font = '700 26px "IBM Plex Mono", ui-monospace, monospace'; x.fillStyle = '#555'; x.fillText('RUS', px + pw * .86, py + ph * .76); }
  // rarity + value
  x.textAlign = 'center';
  x.fillStyle = ({ common: '#9FB4CC', fine: '#8FD3FF', rare: '#C9A8FF', elite: '#FF7AD9', grail: '#FFD25E' })[p.tier] || '#fff';
  x.font = '800 62px Unbounded, Manrope, system-ui, sans-serif';
  x.fillText(tierName(p.tier).toUpperCase(), W / 2, py + ph + 110);
  x.fillStyle = '#DCE9F7'; x.font = '600 44px Manrope, system-ui, sans-serif';
  x.fillText(`${L('оценка', 'value')} ${fmt(p.value)} PLT`, W / 2, py + ph + 186);
  x.fillStyle = 'rgba(220,233,247,.6)'; x.font = '500 32px "IBM Plex Mono", ui-monospace, monospace';
  x.fillText(p.id, W / 2, py + ph + 246);
  // footer
  x.fillStyle = '#8FD3FF'; x.font = '700 40px "IBM Plex Mono", ui-monospace, monospace';
  x.fillText('plate-club.netlify.app', W / 2, H - 96);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '600 30px Manrope, system-ui, sans-serif';
  x.fillText('PLATE CLUB', W / 2, H - 150);
  const url = c.toDataURL('image/png');
  // a ready-to-send message with the player's own invite link
  let link = location.origin; try { const r = REF || (await GET('/api/referral')); REF = r; link = r.link || link; } catch {}
  const bonus = CFG.referral ? fmt((CFG.referral.signupFriend || 0) + (CFG.referral.friend || 0)) : '';
  const msg = L(`Мне выпал номер ${plateStr(p)} — ${tierName(p.tier)}, ${fmt(p.value)} PLT 🔥 Собираю коллекционные номера в PLATE CLUB. Заходи по моей ссылке${bonus ? ` — получишь ${bonus} PLT` : ''}: ${link}`,
    `I just pulled ${plateStr(p)} — ${tierName(p.tier)}, ${fmt(p.value)} PLT 🔥 Collecting plates in PLATE CLUB. Join with my link${bonus ? ` and get ${bonus} PLT` : ''}: ${link}`);
  SHARE = { msg, link, url, id: p.id, blob: await new Promise(r => c.toBlob(r, 'image/png')) };
  const enc = encodeURIComponent;
  openDialog(`<div class="dlg qrbox"><h2 class="h3" id="dlgTitle">${L('Похвастаться другу', 'Show a friend')}</h2>
    <img src="${url}" alt="" style="width:min(240px,62vw);border-radius:16px">
    <textarea class="field share-msg" id="shareMsg" rows="4">${esc(msg)}</textarea>
    <div class="share-row"><button class="btn btn-chrome" data-act="sharesend">${L('Отправить', 'Send')}</button>
      <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://t.me/share/url?url=${enc(link)}&text=${enc(msg.replace(link, '').trim())}">Telegram</a>
      <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(msg)}">WhatsApp</a>
      <button class="btn btn-ghost" data-act="sharecopy">${L('Копировать', 'Copy')}</button></div>
    <p class="small" style="margin:0;text-align:center">${L('Друг зарегистрируется по ссылке — вам +1 000 PLT. Картинку можно выложить в сторис — за это ещё 5 000 PLT.', 'A friend signs up via the link — you get +1,000 PLT. Post the picture to your story for another 5,000 PLT.')}</p>
    <div class="dlg-acts"><a class="btn btn-ghost" href="${url}" download="plate-${esc(p.id)}.png">${L('Скачать картинку', 'Download picture')}</a><button class="btn btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div></div>`);
};
let SHARE = null;
A.sharecopy = async () => { const t = ($('#shareMsg') || {}).value || (SHARE && SHARE.msg) || ''; try { await navigator.clipboard.writeText(t); toast(L('Сообщение скопировано', 'Message copied')); } catch { $('#shareMsg')?.select(); } };
A.sharesend = async () => {
  if (!SHARE) return; const text = ($('#shareMsg') || {}).value || SHARE.msg;
  try {
    if (navigator.share) {
      let files; try { const b = SHARE.blob; const f = new File([b], `plate-${SHARE.id}.png`, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) files = [f]; } catch {}
      await navigator.share(files ? { text, files } : { text }); return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  A.sharecopy();
};
A.mlang = btn => { MEDIA_LANG = btn.dataset.l; render(false); };
A.refqr = () => {
  const link = $('#refLink').value;
  openDialog(`<div class="dlg qrbox"><h2 class="h3" id="dlgTitle">${L('Ваша ссылка', 'Your link')}</h2>${qrSvg(link, { quiet: 2 })}<p class="small mono" style="margin:0;text-align:center;word-break:break-all">${esc(link)}</p><p class="small" style="margin:0;text-align:center;opacity:.75">${L('Покажите камере телефона — друг сразу попадёт на сайт по вашей ссылке.', 'Point a phone camera at it — your friend lands on the site through your link.')}</p><div class="dlg-acts"><button class="btn btn-chrome" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div></div>`);
};
A.refshare = () => { const i = $('#refLink'); if (!navigator.share) { A.refcopy({}); return; } navigator.share({ title: 'PLATE CLUB', text: L('Собирай коллекционные автономера — лови стартовые PLT по моей ссылке.', 'Collect license plates — grab starting PLT with my link.'), url: i.value }).catch(() => {}); };
A.qsend = btn => {
  const kind = btn.dataset.k, story = kind === 'story';
  openDialog(`<form class="dlg" id="qsForm" novalidate><h2 class="h3" id="dlgTitle">${story ? L('Сторис с отметкой сайта', 'Story tagging the site') : L('TikTok с упоминанием', 'TikTok mentioning us')}</h2>
    <p class="small" style="margin:0">${story ? L('Выложите сторис со ссылкой на Plate Club, затем пришлите ссылку на неё или на профиль. Аккаунт должен быть открытым.', 'Post a story linking to Plate Club, then send the link to it or to your profile. Your account must be public.') : L('Пришлите ссылку на ролик. Начислим 1 PLT за просмотр после проверки.', 'Send the link to your video. We pay 1 PLT per view after review.')}</p>
    <div class="fld"><label for="qsHandle">${L('Ваш аккаунт (открытый)', 'Your account (public)')}</label><input class="field" id="qsHandle" maxlength="80" required autofocus placeholder="@nickname"></div>
    <div class="fld"><label for="qsUrl">${L('Ссылка на публикацию', 'Link to the post')}</label><input class="field" id="qsUrl" type="url" maxlength="400" required placeholder="https://…"></div>
    <div class="fld"><label for="qsNote">${L('Комментарий (не обязательно)', 'Comment (optional)')}</label><input class="field" id="qsNote" maxlength="500"></div>
    <p class="err" id="qsErr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></div></form>`);
  $('#qsForm').addEventListener('submit', async e => { e.preventDefault(); const b = e.target.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST('/api/quests', { kind, url: $('#qsUrl').value, handle: $('#qsHandle').value, note: $('#qsNote').value }); dlg.close(); toast(L('Отправлено на проверку. PLT придут после подтверждения.', 'Sent for review. PLT arrive once it is confirmed.')); loadQuests(); }
    catch (x) { $('#qsErr').hidden = false; $('#qsErr').textContent = x.message; busy(b, false); } });
};
A.tgjoin = async btn => { window.open(CFG.telegram.url, '_blank', 'noopener'); busy(btn, true, '…'); try { const r = await POST('/api/perks/telegram', {}); await refreshMe(); sfx('coin'); toast(L(`+${r.amount} PLT — спасибо, что с нами!`, `+${r.amount} PLT — thanks for joining!`)); render(false); } catch (x) { toast(x.message, true); busy(btn, false); } };
let installEvt = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; installBar(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// a visible "install the app" bar on phones (not when already installed, and not again for 3 days after closing it)
function installBar() {
  if (standalone() || $('#instBar') || !matchMedia('(max-width: 820px)').matches || parseRoute().name !== '') return;
  let until = 0; try { until = Number(localStorage.getItem('pc.instHide') || 0); } catch {}
  if (Date.now() < until) return;
  const el = document.createElement('div'); el.id = 'instBar'; el.className = 'inst-bar';
  el.innerHTML = `<img src="${BRAND('app-icon-192.png')}" alt=""><div><b>${L('Plate Club на телефон', 'Plate Club on your phone')}</b><span>${L('Иконка на рабочем столе, как приложение', 'An icon on your home screen, like an app')}</span></div><button class="btn btn-chrome btn-sm" data-act="install">${L('Установить', 'Install')}</button><button class="inst-x" data-act="instx" aria-label="${L('Закрыть', 'Close')}">×</button>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
}
A.instx = () => { try { localStorage.setItem('pc.instHide', String(Date.now() + 3 * 864e5)); } catch {} $('#instBar')?.remove(); };
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
A.install = async () => {
  if (installEvt) { closeDrawer(); installEvt.prompt(); try { const ch = await installEvt.userChoice; if (ch && ch.outcome === 'accepted') $('#instBar')?.remove(); } catch {} installEvt = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  closeDrawer();
  openDialog(`<div class="dlg"><h2 class="h3" id="dlgTitle">📲 ${L('Plate Club на телефоне', 'Plate Club on your phone')}</h2><p class="small" style="margin:0">${L('Сайт можно поставить на экран «Домой» — он откроется как приложение, на весь экран, без адресной строки.', 'Add the site to your home screen: it opens like an app, full screen, no address bar.')}</p>
    <ol class="steps-ol">${ios ? `<li>${L('Откройте сайт в Safari.', 'Open the site in Safari.')}</li><li>${L('Нажмите «Поделиться» (квадрат со стрелкой вверх).', 'Tap Share (square with an arrow).')}</li><li>${L('Выберите «На экран „Домой“» → «Добавить».', 'Choose “Add to Home Screen” → Add.')}</li>` : `<li>${L('Откройте сайт в Chrome.', 'Open the site in Chrome.')}</li><li>${L('Нажмите ⋮ в правом верхнем углу.', 'Tap ⋮ in the top-right corner.')}</li><li>${L('Выберите «Установить приложение» или «Добавить на гл. экран».', 'Choose “Install app” or “Add to Home screen”.')}</li>`}</ol>
    <div class="dlg-acts"><button class="btn btn-chrome" data-act="dlgclose">${L('Понятно', 'Got it')}</button></div></div>`);
};
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
// profile photo: cropped to a square and shrunk in the browser, so only a small JPEG is uploaded
async function avatarUpload(file) {
  if (!file || !/^image\//.test(file.type)) return toast(L('Выберите картинку', 'Pick an image'), true);
  if (file.size > 15e6) return toast(L('Файл слишком большой', 'File is too large'), true);
  let img; try { img = await createImageBitmap(file); } catch { return toast(L('Не удалось открыть картинку', 'Could not open the image'), true); }
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
  let q = 0.86, data = c.toDataURL('image/jpeg', q); while (data.length > 150000 && q > 0.4) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
  try { const r = await POST('/api/me/avatar', { image: data }); ME.av = r.av; toast(L('Фото обновлено', 'Photo updated')); sfx('confirm'); render(false); chrome(); } catch (e) { toast(e.message, true); }
}
document.addEventListener('change', e => { if (e.target && e.target.id === 'avaFile') avatarUpload(e.target.files[0]); });
A.avadel = async () => { try { await POST('/api/me/avatar', { image: null }); ME.av = null; render(false); } catch (e) { toast(e.message, true); } };
A.onlinelist = async () => {
  let d; try { d = await GET('/api/online'); } catch (e) { return toast(e.message, true); }
  openDialog(`<div class="dlg"><div class="row" style="justify-content:space-between"><h2 class="h3" id="dlgTitle"><span class="on-dot"></span>${L('Сейчас в игре', 'Online now')} · ${d.count}</h2><button class="btn btn-sm btn-ghost" data-act="dlgclose">✕</button></div>
    <div class="online-list">${d.players.length ? d.players.map(n => `<a href="#/u/${encodeURIComponent(n)}" class="online-i">${Ava(n)}<b>${esc(n)}</b><span>→</span></a>`).join('') : `<p class="small">${L('Пока никого', 'Nobody yet')}</p>`}</div></div>`);
};
A.ufilter = btn => { UF.tier = btn.dataset.t; render(false); };
A.rkby = btn => { RK.by = btn.dataset.k; render(false); };
A.odds = btn => { const c = caseById(btn.dataset.case); if (c) { sfx('click'); oddsDialog(c); } };
A.taskclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/tasks/${btn.dataset.id}/claim`, {}); coins(btn, 14); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); const row = btn.closest('.task'); if (row) { row.classList.add('claimed'); btn.outerHTML = `<span class="tag">✓ ${L('Получено', 'Claimed')}</span>`; } await refreshMe(); } catch (e) { toast(e.message, true); busy(btn, false); } };
let wfAngle = 0;
A.wspin = async btn => {
  if (btn.disabled) return; btn.disabled = true; btn.textContent = '…';
  let r; try { r = await POST('/api/wheel/spin', {}, { key: rid() }); } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = L('КРУТИТЬ', 'SPIN'); return; }
  const n = CFG.wheel.length, seg = 360 / n, rot = $('#wfRot');
  const target = 360 * 6 + (360 - (r.index * seg + seg / 2)) + (Math.random() - 0.5) * seg * 0.6;
  wfAngle = Math.ceil(wfAngle / 360) * 360 + target; sfx('whoosh');
  if (rot) { rot.style.transition = reduced() ? 'none' : 'transform 5.2s cubic-bezier(.12,.75,.12,1)'; rot.style.transform = `rotate(${wfAngle}deg)`; }
  if (!reduced()) { let k = 0; const tk = setInterval(() => { sfx('tick', Math.max(0.1, 1 - k / 40)); if (++k > 40) clearInterval(tk); }, 125); }
  await wait(reduced() ? 0 : 5300);
  const card = btn.closest('.wf-card'); btn.textContent = '✓';
  if (r.plate) { sfx(r.plate.tier); confetti(btn, '#FFD25E', 60); toast(L(`Выпал номер ${plateStr(r.plate)} · ${tierName(r.plate.tier)}!`, `You won ${plateStr(r.plate)} · ${tierName(r.plate.tier)}!`)); }
  else { coins(btn, 18); sfx('coin'); toast(`+${fmt(r.prize.amount)} PLT`); if (r.prize.amount >= 250) confetti(btn, '#C6FF3D', 40); }
  const note = card && card.querySelector('#wfNote'); if (note) { note.innerHTML = `${r.plate ? L('Номер уже в коллекции.', 'The plate is in your collection.') : `+${fmt(r.prize.amount)} PLT ${L('на балансе', 'added')}`} · ${L('следующий спин через', 'next spin in')} <span class="mono" id="wfCd" data-t="${r.nextAt}"></span>`; countdown($('#wfCd'), r.nextAt, () => {}); }
  await refreshMe();
};
A.daily = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/daily'); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.lvlclaim = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/perks/level/claim'); coins(btn, 18); sfx('coin'); toast(`+${fmt(r.amount)} PLT · LV ${r.level}`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.achclaim = async btn => { busy(btn, true, '…'); try { const r = await POST(`/api/perks/achievements/${btn.dataset.id}/claim`); coins(btn); sfx('coin'); toast(`+${fmt(r.amount)} PLT`); await refreshMe(); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
A.listdlg = async btn => {
  if (!ME) return go('#/login');
  let col; try { col = (await GET('/api/collection')).plates; } catch (e) { return toast(e.message, true); }
  const av = col.filter(p => !p.listing).sort((a, b) => b.value - a.value);
  if (!av.length) { openDialog(`<div class="dlg"><h2 class="h3" id="dlgTitle">${L('Выставить номер', 'List a plate')}</h2>${Empty(L('Нечего выставить', 'Nothing to list'), L('Здесь появятся ваши номера, которые ещё не на рынке.', 'Your plates that are not on the market will appear here.'), `<a class="btn btn-chrome" href="#/cases">${L('К кейсам', 'To cases')}</a>`)}<div class="dlg-acts"><button class="btn btn-ghost" data-act="dlgclose">${L('Закрыть', 'Close')}</button></div></div>`); return; }
  let sel = btn.dataset.id && av.find(p => p.id === btn.dataset.id) ? av.find(p => p.id === btn.dataset.id) : av[0];
  let q = '';
  const row = p => `<button type="button" class="lsrow${p.id === sel.id ? ' on' : ''}" data-lp="${p.id}">${Plate(p)}<span class="t"><b>${tierName(p.tier)}</b><span class="small">${esc(regionLabel(p))}</span></span><span class="v mono">${fmt(p.value)}</span></button>`;
  const list = () => { const f = q ? av.filter(p => (plateStr(p) + ' ' + p.id).toLowerCase().includes(q.toLowerCase())) : av;
    return f.length ? f.slice(0, 60).map(row).join('') : `<p class="small" style="padding:10px">${L('Ничего не нашлось.', 'Nothing found.')}</p>`; };
  openDialog(`<form class="dlg lsdlg" id="listForm" novalidate>
    <h2 class="h3" id="dlgTitle">${L('Выставить на рынок', 'List on the market')}</h2>
    <div class="lspick" id="lsPick">${Plate(sel)}<span class="t"><b id="lsTier">${tierName(sel.tier)}</b><span class="small" id="lsVal">${L('оценка', 'value')} ${fmt(sel.value)} PLT</span></span><button type="button" class="btn btn-sm btn-ghost" data-act="lstoggle">${L('Сменить', 'Change')}</button></div>
    <div class="lslist" id="lsList" hidden><label class="search" style="margin-bottom:8px">${IC.search}<input id="lsQ" type="search" placeholder="${L('Поиск по номеру', 'Search by plate')}" autocomplete="off"></label><div class="lsrows" id="lsRows">${list()}</div></div>
    <div class="fld"><label for="lprice">${L('Цена, PLT', 'Price, PLT')}</label><input class="field mono lsprice" id="lprice" type="number" inputmode="numeric" min="1" max="10000000" required></div>
    <div class="lschips" id="lsChips"></div>
    <dl class="kv" id="lcalc"></dl><p class="small" id="lsHint" style="margin:-6px 0 0;min-height:1.2em;color:var(--fg3)"></p><p class="err" id="lerr" hidden></p>
    <div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Выставить', 'List')}</button></div></form>`);
  const f = $('#listForm'), pr = $('#lprice');
  const chips = () => { const v = sel.value; const opts = [[0.9, '−10%'], [1, L('оценка', 'value')], [1.1, '+10%'], [1.25, '+25%'], [1.5, '+50%']];
    $('#lsChips').innerHTML = opts.map(([k, t]) => `<button type="button" class="chip" data-lsp="${Math.max(1, Math.round(v * k))}">${t}<small>${fmt(Math.max(1, Math.round(v * k)))}</small></button>`).join(''); };
  const calc = () => { const v = +pr.value || 0; $('#lcalc').innerHTML = feeRows(v);
    const d = v && sel.value ? Math.round((v / sel.value - 1) * 100) : 0;
    $$('#lsChips .chip').forEach(c => c.setAttribute('aria-pressed', +c.dataset.lsp === v));
    const hint = $('#lsHint'); if (hint) hint.textContent = d > 25 ? L('Дороже оценки — могут не купить', 'Above value — may not sell') : d < -10 ? L('Дешевле оценки — купят быстро', 'Below value — sells fast') : ''; };
  const pick = p => { sel = p; $('#lsPick').firstChild.outerHTML = Plate(p); $('#lsTier').textContent = tierName(p.tier); $('#lsVal').textContent = L('оценка', 'value') + ' ' + fmt(p.value) + ' PLT';
    pr.value = Math.round(p.value * 1.1); chips(); calc(); $('#lsList').hidden = true; };
  pr.value = Math.round(sel.value * 1.1); chips(); calc();
  f.addEventListener('input', e => { if (e.target.id === 'lprice') calc(); if (e.target.id === 'lsQ') { q = e.target.value; $('#lsRows').innerHTML = list(); } });
  f.addEventListener('click', e => {
    const c = e.target.closest('[data-lsp]'); if (c) { pr.value = c.dataset.lsp; calc(); return; }
    const r = e.target.closest('[data-lp]'); if (r) { const p = av.find(x => x.id === r.dataset.lp); if (p) pick(p); return; }
    if (e.target.closest('[data-act="lstoggle"]')) { const l = $('#lsList'); l.hidden = !l.hidden; if (!l.hidden) $('#lsQ').focus(); }
  });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const v = Math.round(+pr.value), err = $('#lerr');
    if (!(v >= 1 && v <= 1e7)) { err.hidden = false; err.textContent = L('Введите целую цену от 1 до 10 000 000 PLT.', 'Enter a whole price from 1 to 10 000 000 PLT.'); pr.focus(); return; }
    const sb = f.querySelector('[type=submit]'); busy(sb, true, '…');
    try { const r = await POST('/api/market/listings', { plateId: sel.id, price: v }); sfx('confirm'); dlg.close(); closeStage(); toast(L(`Выставлено за ${fmt(v)} PLT`, `Listed for ${fmt(v)} PLT`) + ` · ${r.listing.id}`); if (parseRoute().name !== 'case') { mkReset(); render(false); } }
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
A.mtier = btn => { const t = btn.dataset.t; M.tiers = M.tiers.includes(t) ? M.tiers.filter(x => x !== t) : [...M.tiers, t]; btn.setAttribute('aria-pressed', M.tiers.includes(t)); mkReset(); loadMarket(); };
A.mseg = btn => { M[btn.dataset.k] = btn.dataset.v; btn.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn)); mkReset(); loadMarket(); };
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
  if (t.id === 'mq') { M.q = t.value; clearTimeout(qT); qT = setTimeout(() => { mkReset(); loadMarket(); }, 220); }
  if (t.id === 'mmin' || t.id === 'mmax') { M[t.id === 'mmin' ? 'min' : 'max'] = t.value; clearTimeout(qT); qT = setTimeout(() => { mkReset(); loadMarket(); }, 300); }
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
    if (kind === 'register') { const r = await POST('/api/auth/register', { email: v('email').trim(), nickname: v('nickname').trim(), password: v('password'), terms: true, ref: store.get('ref', '') || undefined }); store.set('ref', ''); await refreshMe(); refreshPerks(); sfx('confirm'); toast(L(`Добро пожаловать, ${ME.nickname}! +${r.bonus} PLT`, `Welcome, ${ME.nickname}! +${r.bonus} PLT`)); go(/next=admin/.test(location.hash) ? '#/admin' : '#/cases'); }
    else if (kind === 'login') { await POST('/api/auth/login', { email: v('email').trim(), password: v('password') }); await refreshMe(); refreshPerks(); toast(L(`Вы вошли как ${ME.nickname}.`, `Signed in as ${ME.nickname}.`)); const nx = v('next'); go(nx && nx.startsWith('#/') && !nx.startsWith('#/login') ? nx : '#/'); }
    else if (kind === 'forgot') { await POST('/api/auth/forgot', { email: v('email').trim() }); busy(b, false); b.disabled = true; $('#formOk').innerHTML = `<div class="notice"><b>${L('Проверьте почту', 'Check your email')}</b>${L('Если аккаунт с этим email есть, ссылка уже в пути.', 'If an account with this email exists, the link is on its way.')}</div>`; return; }
    else if (kind === 'reset') { await POST('/api/auth/reset', { token: v('token'), password: v('password') }); await refreshMe(); toast(L('Пароль сохранён, вы вошли.', 'Password saved, you are signed in.')); history.replaceState(null, '', location.pathname); go('#/'); }
  } catch (x) { showErr(x.message, (x.data && x.data.fields) || {}); busy(b, false); }
});

/* drawer */
function openDrawer() {
  const g = (title, items) => `<div class="dgroup"><span class="eyebrow">${title}</span>${items.map(([h, t, ic]) => `<a href="#/${esc(h)}">${IC[ic]}${t}</a>`).join('')}</div>`;
  const game = g(L('Игра', 'Game'), [['cases', L('Кейсы', 'Cases'), 'cases'], ['battles', L('Кейс-баттл', 'Case battle'), 'swords'], ['auction', L('Аукцион дня', 'Auction of the day'), 'hammer'], ['sets', L('Коллекции', 'Collections'), 'layers'], ['swap', L('Обмен номерами', 'Plate swaps'), 'swap'], ['upgrade', L('Апгрейд', 'Upgrade'), 'up'], ['market', L('Рынок', 'Market'), 'market'], ['top', L('Топ аккаунтов', 'Top accounts'), 'trophy']]);
  const tg = CFG && CFG.telegram ? `<div class="dgroup"><a href="${esc(CFG.telegram.url)}" target="_blank" rel="noopener">✈️ ${L('Чат игроков в Telegram', 'Players’ chat on Telegram')}</a></div>` : '';
  const info = g(L('Инфо', 'Info'), [['settings', L('Настройки', 'Settings'), 'gear'], ['media', L('Баннеры для роликов', 'Banners for videos'), 'gift'], ['help', L('Помощь', 'Help'), 'help'], ['terms', L('Правила', 'Terms'), 'doc'], ['privacy', L('Конфиденциальность', 'Privacy'), 'doc']]);
  const lang = `<div class="dgroup"><span class="eyebrow">${L('Язык', 'Language')}</span><div class="lang" style="justify-self:start;margin-left:12px"><button data-act="lang" data-l="ru" aria-pressed="${LANG === 'ru'}">RU</button><button data-act="lang" data-l="en" aria-pressed="${LANG === 'en'}">EN</button></div></div>`;
  const body = ME
    ? g(L('Аккаунт', 'Account'), [['profile', L('Профиль', 'Profile'), 'user'], ['collection', L('Мои номера', 'My plates'), 'coll'], ['wallet', L('Кошелёк', 'Wallet'), 'wallet'], ['bonus', L('Бонусы и промокоды', 'Bonuses & promo codes'), 'gift'], ...(ME.role === 'admin' ? [['admin', L('Панель админа', 'Admin panel'), 'crown']] : []), ['trades', L('Мои сделки', 'My trades'), 'swap'], ['support', L('Поддержка', 'Support') + (ME.unread ? ' •' : ''), 'chat']]) + game + tg + lang + info + (matchMedia('(display-mode: standalone)').matches ? '' : `<div class="dgroup"><button data-act="install">📲 ${L('Установить на телефон', 'Install on your phone')}</button></div>`) + `<div class="dgroup"><button data-act="logout">${IC.out}${L('Выйти', 'Sign out')}</button></div>`
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
  // invite link: remember the code and send a new visitor straight to sign-up
  const pretty = (location.pathname.match(/^\/i\/([^/?#]+)/) || [])[1];
  const refCode = decodeURIComponent(pretty || params.get('ref') || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 24);
  if (refCode) { store.set('ref', refCode); history.replaceState(null, '', '/' + (location.hash || '')); if (!ME && !location.hash) location.hash = '#/register'; }
  await refreshPerks();
  await render(false); liveFeed(); setTimeout(installBar, 2500);
  const sp = $('#splash'); sp.classList.add('gone'); setTimeout(() => sp.remove(), 450);
}
boot();
