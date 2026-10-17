
/* ---------- support (players) ---------- */
const TST = () => ({ OPEN: L('Ждёт ответа', 'Waiting'), ANSWERED: L('Есть ответ', 'Answered'), CLOSED: L('Закрыто', 'Closed') });
VIEWS.support = async ({ arg }) => {
  if (arg) {
    const d = await GET('/api/support/' + encodeURIComponent(arg)); await refreshMe(); chrome();
    return `<div class="wrap narrow"><a class="back" href="#/support">← ${L('Все обращения', 'All requests')}</a>
      <section class="sec" style="padding-top:18px"><p class="eyebrow">${d.ticket.id} · ${TST()[d.ticket.status]}</p><h1 class="h2" style="margin-top:8px">${esc(d.ticket.subject)}</h1>
      ${Thread(d.messages, false)}
      <form class="reply" id="replyForm" data-id="${d.ticket.id}"><label class="sr-only" for="rbody">${L('Сообщение', 'Message')}</label><textarea class="field" id="rbody" rows="3" maxlength="4000" placeholder="${L('Ваше сообщение…', 'Your message…')}" required></textarea><p class="err" id="rerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form></section></div>`;
  }
  const d = await GET('/api/support');
  return `<div class="wrap narrow"><section class="page-head"><div><p class="eyebrow">${L('Поддержка', 'Support')}</p><h1 class="h1" style="margin-top:12px">${L('Написать нам', 'Contact us')}</h1><p class="lede" style="margin-top:10px">${L('Проблема с кейсом, платежом или номером — опишите, и администратор ответит здесь же.', 'A problem with a case, a payment or a plate — describe it and the admin will answer right here.')}</p></div></section>
    <form class="panel" id="ticketForm" style="display:grid;gap:14px;margin-bottom:24px"><div class="fld"><label for="tsubj">${L('Тема', 'Subject')}</label><input class="field" id="tsubj" maxlength="120" required placeholder="${L('Например: не пришли PLT', 'E.g. PLT did not arrive')}"></div>
      <div class="fld"><label for="tbody">${L('Сообщение', 'Message')}</label><textarea class="field" id="tbody" rows="4" maxlength="4000" required></textarea></div><p class="err" id="terr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form>
    <section style="padding-bottom:80px">${SH(L('Мои обращения', 'My requests'))}${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/support/' + t.id, t.userUnread)).join('')}</div>` : `<p class="small">${L('Обращений пока нет.', 'No requests yet.')}</p>`}</section></div>`;
};
VIEWS.support.auth = true;
const TicketRow = (t, href, unread, who = '') => `<a class="trow2${unread ? ' unread' : ''}" href="${href}"><span class="tdot"></span><div><b>${esc(t.subject)}</b><span class="small">${who ? esc(who) + ' · ' : ''}${esc((t.last || '').slice(0, 90))}</span></div><span class="tag s-${t.status === 'CLOSED' ? 'CANCELLED' : t.status === 'OPEN' ? 'ACTIVE' : 'SOLD'}">${TST()[t.status]}</span><span class="when">${rel(t.updated)}</span></a>`;
const Thread = (ms, adminView) => `<div class="thread">${ms.map(m => `<div class="msg ${m.fromAdmin ? 'adm' : 'usr'}${(adminView ? !m.fromAdmin : m.fromAdmin) ? ' other' : ''}"><div class="mhead"><b>${m.fromAdmin ? 'Plate Club' : esc(m.author)}</b><span>${date(m.at)}</span></div><p>${esc(m.body).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>`;
function supportHooks() {
  const tf = $('#ticketForm'); tf && tf.addEventListener('submit', async e => { e.preventDefault(); const b = tf.querySelector('[type=submit]'); busy(b, true, '…'); try { const r = await POST('/api/support', { subject: $('#tsubj').value, body: $('#tbody').value }); toast(L('Отправлено. Ответ придёт сюда.', 'Sent. The answer will appear here.')); go('#/support/' + r.id); } catch (x) { $('#terr').hidden = false; $('#terr').textContent = x.message; busy(b, false); } });
  const rf = $('#replyForm'); rf && rf.addEventListener('submit', async e => { e.preventDefault(); const b = rf.querySelector('[type=submit]'); busy(b, true, '…'); try { await POST('/api/support/' + rf.dataset.id + '/reply', { body: $('#rbody').value }); render(false); } catch (x) { $('#rerr').hidden = false; $('#rerr').textContent = x.message; busy(b, false); } });
}

/* ---------- admin control panel ---------- */
const AD = { q: '', status: 'ACTIVE', tk: 'OPEN', qs: 'PENDING' }; const ADMIN_ACTS = {};
const ADMIN_TABS = () => [['overview', L('Обзор', 'Overview'), 'chart'], ['users', L('Участники', 'Players'), 'users'], ['support', L('Сообщения', 'Messages'), 'chat'], ['quests', L('Задания', 'Quests'), 'gift'], ['market', L('Рынок', 'Market'), 'market'], ['cases', L('Кейсы', 'Cases'), 'cases'], ['promos', L('Промокоды', 'Promo codes'), 'gift'], ['settings', L('Настройки', 'Settings'), 'sliders'], ['log', L('Журнал', 'Log'), 'list']];
const ACT_NAMES = () => ({ claim_admin: L('Админ активирован', 'Admin claimed'), quest_pay: L('Задание оплачено', 'Quest paid'), quest_reject: L('Задание отклонено', 'Quest rejected'), make_admin: L('Назначен админ', 'Admin appointed'), remove_admin: L('Снят админ', 'Admin removed'), grant_plt: L('Начислено', 'Granted'), deduct_plt: L('Списано', 'Deducted'), remove_listing: L('Снято объявление', 'Listing removed'), create_promo: L('Создан промокод', 'Promo created'), enable_promo: L('Промокод включён', 'Promo enabled'), disable_promo: L('Промокод выключен', 'Promo disabled'), message: L('Сообщение', 'Message'), block_user: L('Блокировка', 'Blocked'), unblock_user: L('Разблокировка', 'Unblocked'), gift_plate: L('Подарен номер', 'Plate gifted'), grant_all: L('Бонус всем', 'Bonus to all'), settings: L('Настройки', 'Settings') });
const LogRow = e => `<div class="tx"><span class="lbl">${ACT_NAMES()[e.action] || e.action} · ${esc(e.target || '')}${e.reason ? ' — ' + esc(e.reason) : ''}</span><span class="when">${date(e.at)} · ${esc(e.admin)}</span><span class="amt">${e.amount ? (e.amount > 0 ? '+' : '−') + fmt(Math.abs(e.amount)) : ''}</span></div>`;
const KV = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

VIEWS.admin = async (r) => {
  if (ME.role !== 'admin') return `<div class="wrap auth"><form class="auth-card" id="claimForm"><div style="text-align:center"><h1 class="h2">${L('Доступ администратора', 'Admin access')}</h1><p class="small" style="margin:8px 0 0">${L('Введите одноразовый код.', 'Enter the one-time code.')}</p></div><div class="fld"><label for="acode">${L('Код', 'Code')}</label><input class="field mono" id="acode" autocomplete="off" required></div><p class="err" id="aerr" hidden></p><button class="btn btn-chrome btn-lg" type="submit">${L('Войти как админ', 'Enter as admin')}</button></form></div>`;
  const tab = ADMIN_TABS().some(t => t[0] === r.arg) ? r.arg : 'overview'; const id = r.query && r.query.get('id');
  const body = await ADMIN_VIEWS[tab](id);
  return `<div class="wrap adm"><div class="adm-top"><div><p class="eyebrow">${L('Панель управления', 'Control panel')} · ${esc(ME.nickname)}</p><h1 class="h2" style="margin-top:6px">${ADMIN_TABS().find(t => t[0] === tab)[1]}</h1></div></div>
    <div class="adm-grid"><nav class="adm-nav" aria-label="${L('Разделы', 'Sections')}">${ADMIN_TABS().map(([k, t, ic]) => `<a href="#/admin/${k}"${k === tab ? ' aria-current="page"' : ''}>${IC[ic] || ''}<span>${t}</span>${k === 'support' && ME.inbox ? `<i class="cnt">${ME.inbox}</i>` : ''}</a>`).join('')}</nav>
    <div class="adm-main">${body}</div></div></div>`;
};
VIEWS.admin.auth = true;
const ADMIN_VIEWS = {};

ADMIN_VIEWS.overview = async () => {
  const [o, e] = await Promise.all([GET('/api/admin/overview'), GET('/api/admin/economy')]); const O = o.overview, E = e.economy;
  const st = (k, v, cls = '') => `<div class="stat"><span>${k}</span><b class="${cls}">${v}</b></div>`;
  const qa = (h, ic, t, sub, hot) => `<a class="qa${hot ? ' hot' : ''}" href="#/admin/${h}">${IC[ic] || ''}<b>${t}</b><span>${sub}</span></a>`;
  return `<div class="qa-row">${qa('users', 'users', L('Игроки', 'Players'), L('найти, начислить, заблокировать', 'find, grant, block'))}${qa('support', 'chat', L('Сообщения', 'Messages'), E.open_tickets ? L(`ждут ответа: ${E.open_tickets}`, `waiting: ${E.open_tickets}`) : L('новых нет', 'nothing new'), E.open_tickets)}${qa('quests', 'gift', L('Задания', 'Quests'), E.open_quests ? L(`на проверке: ${E.open_quests}`, `in review: ${E.open_quests}`) : L('новых нет', 'nothing new'), E.open_quests)}${qa('settings', 'sliders', L('Настройки', 'Settings'), L('бонусы, цены, объявление', 'bonuses, prices, banner'))}</div>
    <div class="stats s4">${st(L('Игроков', 'Players'), fmt(O.users))}${st(L('Новых за сутки', 'New, 24h'), fmt(E.new24))}${st(L('Активных за сутки', 'Active, 24h'), fmt(E.active24))}${st(L('Открытых обращений', 'Open requests'), `<a href="#/admin/support">${fmt(E.open_tickets)}</a>`, E.open_tickets ? 'up' : '')}
      ${st(L('Открыто кейсов', 'Cases opened'), fmt(O.opens))}${st(L('Потрачено на кейсы', 'Spent on cases'), fmt(E.case_spent))}${st(L('Продаж · оборот', 'Sales · volume'), fmt(O.sold) + ' · ' + fmt(O.volume))}${st(L('Ваша комиссия', 'Your fees'), fmt(O.fees), 'up')}
      ${st(L('PLT у игроков', 'PLT with players'), fmt(O.user_plt))}${st(L('Выплачено банком', 'Paid by the bank'), fmt(E.bank_paid))}${st(L('Выплачено скупщиком', 'Paid by the dealer'), fmt(E.dealer_paid))}${st(L('Бонусы и награды', 'Bonuses & rewards'), fmt(E.bonuses))}</div>
    <div class="split" style="margin-top:20px">
      <form class="panel" id="allGrant" style="display:grid;gap:12px;align-content:start"><h2 class="h3">${L('Бонус всем игрокам', 'Bonus to every player')}</h2><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="agamt">${L('PLT каждому', 'PLT each')}</label><input class="field mono" id="agamt" type="number" min="1" max="1000000" required></div><div class="fld" style="flex:2"><label for="agr">${L('Причина', 'Reason')}</label><input class="field" id="agr" maxlength="200" required placeholder="${L('Праздник, турнир…', 'Holiday, tournament…')}"></div></div><p class="err" id="agerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Начислить всем', 'Grant to all')}</button></form>
      <form class="panel" id="allMsg" style="display:grid;gap:12px;align-content:start"><h2 class="h3">${L('Сообщение всем игрокам', 'Message every player')}</h2><div class="fld"><label for="amsubj">${L('Тема', 'Subject')}</label><input class="field" id="amsubj" maxlength="120" required></div><div class="fld"><label for="ambody">${L('Текст', 'Text')}</label><textarea class="field" id="ambody" rows="3" maxlength="4000" required></textarea></div><p class="err" id="amerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить всем', 'Send to all')}</button></form></div>
    <div class="panel row" style="margin-top:20px;justify-content:space-between"><div><h2 class="h3">${L('Демо-игроки', 'Demo players')}</h2><p class="small" style="margin:4px 0 0">${L('Добавит 15 игроков с ником demo_… и номерами, чтобы сайт не выглядел пустым. Повторно не создаются.', 'Adds 15 players named demo_… with plates so the site does not look empty. Created once.')}</p></div><button class="btn btn-ghost" data-act="ademo">${L('Добавить 15 демо-игроков', 'Add 15 demo players')}</button></div>
    <section class="sec">${SH(L('Последние действия', 'Recent actions'), '', `<a class="sh-link" href="#/admin/log">${L('Весь журнал', 'Full log')}</a>`)}<div class="panel">${o.log.slice(0, 8).map(LogRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div></section>`;
};

ADMIN_VIEWS.users = async (id) => {
  if (id) return adminUser(id);
  const us = await GET('/api/admin/users?q=' + encodeURIComponent(AD.q));
  return `<label class="search" style="margin-bottom:14px">${IC.search}<span class="sr-only">${L('Поиск игрока', 'Find player')}</span><input id="aq" type="search" placeholder="${L('Ник или email', 'Nickname or email')}" value="${esc(AD.q)}" style="text-transform:none;font-family:var(--f-body)"></label>
    <p class="small" style="margin:0 0 10px">${us.users.length} ${pl(us.users.length, ['участник', 'участника', 'участников'], ['player', 'players'])}. ${L('Нажмите на игрока, чтобы открыть карточку: начислить PLT, подарить номер, написать, заблокировать.', 'Click a player to open their card: send PLT, gift a plate, message, block.')}</p>
    <div class="panel tbl-wrap" style="padding:8px"><table class="tbl click"><thead><tr><th>${L('Игрок', 'Player')}</th><th>Email</th><th class="n">PLT</th><th class="n">${L('Номеров', 'Plates')}</th><th class="n">${L('Оценка', 'Value')}</th><th>${L('С нами с', 'Joined')}</th></tr></thead><tbody>${us.users.map(u => `<tr data-act="auser" data-id="${u.id}"><td><b>${esc(u.nickname)}</b>${u.role === 'admin' ? ' <span class="tag admin">admin</span>' : ''}${u.blocked ? ` <span class="tag s-CANCELLED">${L('блок', 'blocked')}</span>` : ''}</td><td class="small">${esc(u.email)}</td><td class="n mono">${fmt(u.balance)}</td><td class="n mono">${u.plates}</td><td class="n mono">${fmt(u.value || 0)}</td><td class="small">${day(u.joined)}</td></tr>`).join('')}</tbody></table></div>`;
};
async function adminUser(id) {
  const d = await GET('/api/admin/users/' + encodeURIComponent(id)); const u = d.user;
  const quick = [100, 500, 1000, 5000, 10000, 100000];
  return `<a class="back" href="#/admin/users">← ${L('Все участники', 'All players')}</a>
    <div class="ucard panel"><div class="row" style="gap:16px">${Ava(u.nickname).replace('class="ava"', 'class="ava" style="width:58px;height:58px;font-size:26px;border-radius:18px"')}<div><h2 class="h2">${esc(u.nickname)} ${u.role === 'admin' ? '<span class="tag admin">admin</span>' : ''}${u.blocked ? ` <span class="tag s-CANCELLED">${L('заблокирован', 'blocked')}</span>` : ''}</h2><p class="small" style="margin:4px 0 0">${esc(u.email)} · ID ${u.id} · ${L('с', 'since')} ${day(u.joined)}${u.lastActive ? ' · ' + L('активность', 'active') + ' ' + rel(u.lastActive) : ''}</p>${u.blocked ? `<p class="small" style="margin:4px 0 0;color:#f87171">${L('Причина', 'Reason')}: ${esc(u.blockedReason || '')}</p>` : ''}</div></div>
      <div class="stats s4" style="margin-top:18px"><div class="stat"><span>PLT</span><b>${fmt(u.balance)}</b></div><div class="stat"><span>${L('Номеров', 'Plates')}</span><b>${d.plates.length}</b></div><div class="stat"><span>${L('Кейсов открыто', 'Cases opened')}</span><b>${fmt(u.opens)}</b></div><div class="stat"><span>${L('Пополнения', 'Top-ups')}</span><b>${fmt(u.topups)}</b></div></div></div>
    <div class="split" style="margin-top:18px">
      <form class="panel" id="uGrant" data-id="${u.id}" style="display:grid;gap:12px;align-content:start"><h3 class="h3">${L('Отправить PLT', 'Send PLT')}</h3>
        <div class="row" style="gap:6px">${quick.map(v => `<button type="button" class="chip" data-act="qamt" data-v="${v}">+${fmt(v)}</button>`).join('')}</div>
        <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="ugamt">${L('Сумма (минус — списать)', 'Amount (negative deducts)')}</label><input class="field mono" id="ugamt" type="number" step="1" required></div><div class="fld" style="flex:2"><label for="ugr">${L('Причина (игрок увидит)', 'Reason (player sees it)')}</label><input class="field" id="ugr" maxlength="200" required value="${L('Подарок от Plate Club', 'Gift from Plate Club')}"></div></div>
        <p class="err" id="ugerr" hidden></p><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></form>
      <div style="display:grid;gap:18px;align-content:start">
        <form class="panel" id="uGift" data-id="${u.id}" style="display:grid;gap:12px"><h3 class="h3">${L('Подарить номер', 'Gift a plate')}</h3><div class="row" style="gap:10px;flex-wrap:nowrap"><select class="field" id="gtier">${CFG.tiers.map(t => `<option value="${t.id}">${tierName(t.id)}</option>`).join('')}</select><select class="field" id="gcountry"><option value="RU">${L('Россия', 'Russia')}</option><option value="BY">${L('Беларусь', 'Belarus')}</option></select></div><button class="btn btn-ghost" type="submit">${L('Выпустить и подарить', 'Mint and gift')}</button></form>
        <div class="panel row" style="gap:10px"><button class="btn btn-ghost" data-act="umsg" data-id="${u.id}" data-n="${esc(u.nickname)}">${IC.chat}${L('Написать', 'Message')}</button>${u.role === 'user' ? (u.blocked ? `<button class="btn btn-ghost" data-act="ublock" data-id="${u.id}" data-b="0">${L('Разблокировать', 'Unblock')}</button>` : `<button class="btn btn-ghost danger" data-act="ublock" data-id="${u.id}" data-b="1">${L('Заблокировать', 'Block')}</button>`) : ''}<a class="btn btn-ghost" href="#/u/${esc(u.nickname)}">${L('Профиль', 'Profile')}</a>${u.id !== ME.id ? `<button class="btn btn-ghost" data-act="urole" data-id="${u.id}" data-n="${esc(u.nickname)}" data-a="${u.role === 'admin' ? 0 : 1}">${IC.crown}${u.role === 'admin' ? L('Снять админа', 'Remove admin') : L('Сделать админом', 'Make admin')}</button>` : ''}</div></div></div>
    <section class="sec">${SH(L('Номера', 'Plates'))}${d.plates.length ? `<div class="pgrid">${d.plates.slice(0, 24).map(p => PlateCard(p, { pl: true })).join('')}</div>` : `<p class="small">${L('Номеров нет.', 'No plates.')}</p>`}</section>
    <div class="split" style="padding-bottom:60px"><div class="panel">${SH(L('Операции', 'Transactions'))}${d.ledger.map(TxRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>
      <div class="panel" style="align-self:start">${SH(L('Обращения', 'Requests'))}${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/admin/support?id=' + t.id, t.adminUnread)).join('')}</div>` : `<p class="small">${L('Обращений нет.', 'No requests.')}</p>`}</div></div>`;
}

ADMIN_VIEWS.support = async (id) => {
  if (id) {
    const d = await GET('/api/admin/support/' + encodeURIComponent(id)); await refreshMe(); chrome(); const t = d.ticket;
    return `<a class="back" href="#/admin/support">← ${L('Все сообщения', 'All messages')}</a>
      <div class="panel"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">${t.id} · ${TST()[t.status]}</p><h2 class="h3" style="margin-top:6px">${esc(t.subject)}</h2><p class="small" style="margin:4px 0 0">${L('От', 'From')} <a href="#/admin/users?id=${t.userId}">${esc(t.nickname)}</a> · ${date(t.created)}</p></div>
        <div class="row">${t.status !== 'CLOSED' ? `<button class="btn btn-sm btn-ghost" data-act="tstatus" data-id="${t.id}" data-s="CLOSED">${L('Закрыть', 'Close')}</button>` : `<button class="btn btn-sm btn-ghost" data-act="tstatus" data-id="${t.id}" data-s="OPEN">${L('Открыть снова', 'Reopen')}</button>`}</div></div>
      ${Thread(d.messages, true)}
      <form class="reply" id="aReply" data-id="${t.id}"><label class="sr-only" for="arbody">${L('Ответ', 'Answer')}</label><textarea class="field" id="arbody" rows="3" maxlength="4000" placeholder="${L('Ваш ответ…', 'Your answer…')}" required></textarea><p class="err" id="arerr" hidden></p><div class="row"><button class="btn btn-chrome" type="submit">${L('Ответить', 'Reply')}</button><button class="btn btn-ghost" type="submit" data-close="1">${L('Ответить и закрыть', 'Reply and close')}</button></div></form></div>`;
  }
  const d = await GET('/api/admin/support?status=' + AD.tk);
  const F = [['OPEN', L('Ждут ответа', 'Waiting')], ['ANSWERED', L('Отвечено', 'Answered')], ['CLOSED', L('Закрыто', 'Closed')], ['ALL', L('Все', 'All')]];
  return `<div class="row" style="margin-bottom:14px">${F.map(([k, t]) => `<button class="chip" data-act="atk" data-s="${k}" aria-pressed="${AD.tk === k}">${t}</button>`).join('')}</div>
    ${d.tickets.length ? `<div class="tlist">${d.tickets.map(t => TicketRow(t, '#/admin/support?id=' + t.id, t.adminUnread, t.nickname)).join('')}</div>` : Empty(L('Сообщений нет', 'No messages'), L('Когда игрок напишет, обращение появится здесь.', 'When a player writes, the request appears here.'))}`;
};

ADMIN_VIEWS.market = async () => {
  const [ls, st, s] = await Promise.all([GET('/api/admin/listings?status=' + AD.status), GET('/api/market/stats'), GET('/api/admin/settings')]);
  const ST = { ACTIVE: L('Активные', 'Active'), SOLD: L('Проданные', 'Sold'), CANCELLED: L('Снятые', 'Cancelled'), ALL: L('Все', 'All') };
  return `<div class="stats s4"><div class="stat"><span>${L('В продаже', 'Listed')}</span><b>${fmt(st.active)}</b></div><div class="stat"><span>${L('Ниже оценки', 'Below value')}</span><b class="up">${fmt(st.deals)}</b></div><div class="stat"><span>${L('Сделок за сутки', 'Trades, 24h')}</span><b>${fmt(st.sales)}</b></div><div class="stat"><span>${L('Оборот за сутки', 'Volume, 24h')}</span><b>${fmt(st.volume)}</b></div></div>
    <form class="panel" id="botForm" style="display:grid;gap:12px;margin-top:18px"><h2 class="h3">Plate Club Market</h2><p class="small" style="margin:0">${L('Сколько номеров маркетмейкер держит на рынке. Новые лоты появляются при следующем открытии рынка.', 'How many plates the market maker keeps listed. New lots appear the next time the market loads.')}</p>
      <div class="row" style="gap:10px"><div class="fld" style="width:160px"><label for="bsize">${L('Лотов', 'Lots')}</label><input class="field mono" id="bsize" type="number" min="0" max="200" value="${s.settings.botSize}"></div><button class="btn btn-chrome" type="submit" style="align-self:end">${L('Сохранить', 'Save')}</button><button class="btn btn-ghost" type="button" data-act="restock" style="align-self:end">${L('Пополнить сейчас', 'Restock now')}</button></div></form>
    <section class="sec">${SH(L('Объявления', 'Listings'), L('Снятый номер вернётся владельцу.', 'A removed plate returns to its owner.'))}
      <div class="row" style="margin-bottom:14px">${Object.entries(ST).map(([k, t]) => `<button class="chip" data-act="astatus" data-s="${k}" aria-pressed="${AD.status === k}">${t}</button>`).join('')}</div>
      <div class="panel tbl-wrap" style="padding:8px">${ls.listings.length ? `<table class="tbl"><thead><tr><th>${L('Номер', 'Plate')}</th><th>${L('Продавец', 'Seller')}</th><th>${L('Покупатель', 'Buyer')}</th><th class="n">${L('Цена', 'Price')}</th><th class="n">${L('Оценка', 'Value')}</th><th>${L('Статус', 'Status')}</th><th></th></tr></thead><tbody>${ls.listings.map(l => `<tr><td><a href="#/plate/${l.plate.id}">${esc(plateStr(l.plate))}</a></td><td>${esc(l.seller)}</td><td>${l.buyer ? esc(l.buyer) : '—'}</td><td class="n mono">${fmt(l.price)}</td><td class="n mono">${fmt(l.plate.value)}</td><td><span class="tag s-${l.status}">${l.status}</span></td><td>${l.status === 'ACTIVE' ? `<button class="btn btn-sm btn-ghost" data-act="aremove" data-id="${l.id}">${L('Снять', 'Remove')}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="small" style="margin:12px">${L('Пусто.', 'Empty.')}</p>`}</div></section>`;
};

ADMIN_VIEWS.cases = async () => {
  const [s, e] = await Promise.all([GET('/api/admin/settings'), GET('/api/admin/economy')]); const ov = s.settings.cases || {};
  const all = s.cases; const stat = Object.fromEntries(e.cases.map(c => [c.id, c]));
  return `<p class="small" style="margin:0 0 12px">${L('Меняйте цену кейса или скрывайте его с сайта. Пустая цена — расчётная. Шансы выпадения задаются в коде игры.', 'Change a case price or hide it from the site. Empty price means the calculated one. Drop odds live in the game code.')}</p>
    <form id="casesForm"><div class="panel tbl-wrap" style="padding:8px"><table class="tbl"><thead><tr><th>№</th><th>${L('Кейс', 'Case')}</th><th class="n">${L('Расчётная', 'Calculated')}</th><th>${L('Своя цена', 'Custom price')}</th><th>${L('Показывать', 'Visible')}</th><th class="n">${L('Открыто', 'Opened')}</th><th class="n">${L('Выручка', 'Revenue')}</th></tr></thead>
    <tbody>${all.map(c => `<tr><td class="mono">${c.id}</td><td><span class="cdot" style="background:${c.color}"></span>${esc(caseName(c))}<br><span class="small">${catName(c.cat)}</span></td><td class="n mono">${fmt(c.price)}</td><td><input class="field mono cprice" data-id="${c.id}" type="number" min="1" max="10000000" placeholder="${c.price}" value="${ov[c.id] && ov[c.id].price ? ov[c.id].price : ''}" style="width:120px;min-height:38px"></td><td><label class="switch"><input type="checkbox" class="cvis" data-id="${c.id}" ${ov[c.id] && ov[c.id].hidden ? '' : 'checked'}><span></span></label></td><td class="n mono">${stat[c.id] ? fmt(stat[c.id].opens) : 0}</td><td class="n mono">${stat[c.id] ? fmt(stat[c.id].spent) : 0}</td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin:16px 0 60px"><button class="btn btn-chrome btn-lg" type="submit">${L('Сохранить кейсы', 'Save cases')}</button><p class="err" id="cerr" hidden></p></div></form>`;
};

ADMIN_VIEWS.promos = async () => {
  const pr = await GET('/api/admin/promos');
  return `<div class="split"><form id="promoAdm" class="panel" style="display:grid;gap:14px;align-content:start"><h2 class="h3">${L('Новый промокод', 'New promo code')}</h2>
      <div class="fld"><label for="pcode">${L('Код', 'Code')}</label><input class="field mono" id="pcode" maxlength="24" placeholder="SUMMER500" required style="text-transform:uppercase"></div>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="fld" style="flex:1"><label for="pamt">PLT</label><input class="field mono" id="pamt" type="number" min="1" max="1000000" required></div><div class="fld" style="flex:1"><label for="puses">${L('Лимит', 'Limit')}</label><input class="field mono" id="puses" type="number" min="1" placeholder="∞"></div><div class="fld" style="flex:1"><label for="pdays">${L('Дней', 'Days')}</label><input class="field mono" id="pdays" type="number" min="1" max="3650" placeholder="∞"></div></div>
      <div class="fld"><label for="pnote">${L('Заметка', 'Note')}</label><input class="field" id="pnote" maxlength="120"></div>
      <p class="err" id="perr" hidden></p><button class="btn btn-chrome" type="submit">${L('Создать', 'Create')}</button></form>
    <div class="panel tbl-wrap">${SH(L('Промокоды', 'Promo codes'))}<table class="tbl"><thead><tr><th>${L('Код', 'Code')}</th><th class="n">PLT</th><th class="n">${L('Активаций', 'Uses')}</th><th>${L('Срок', 'Expires')}</th><th></th></tr></thead><tbody>${pr.promos.map(x => `<tr><td class="mono">${esc(x.code)}${x.note ? `<br><span class="small">${esc(x.note)}</span>` : ''}</td><td class="n mono">${fmt(x.amount)}</td><td class="n mono">${x.uses}${x.maxUses ? ' / ' + x.maxUses : ''}</td><td class="small">${x.expires ? day(x.expires) : '∞'}</td><td><button class="btn btn-sm btn-ghost" data-act="ptoggle" data-c="${esc(x.code)}">${x.active ? L('Выключить', 'Disable') : L('Включить', 'Enable')}</button></td></tr>`).join('')}</tbody></table></div></div>`;
};

ADMIN_VIEWS.settings = async () => {
  const s = (await GET('/api/admin/settings')).settings;
  const f = (id, label, val, hint, attrs) => `<div class="fld"><label for="${id}">${label}</label><input class="field mono" id="${id}" type="number" value="${val}" ${attrs}><span class="small">${hint}</span></div>`;
  return `<form class="panel" id="setForm" style="display:grid;gap:18px;max-width:760px;margin-bottom:60px">
    <div class="fld"><label for="sann">${L('Объявление на сайте', 'Site announcement')}</label><input class="field" id="sann" maxlength="280" value="${esc(s.announcement)}" placeholder="${L('Например: турнир в субботу! Пусто — скрыть.', 'E.g. tournament on Saturday! Empty hides it.')}"><span class="small">${L('Показывается вверху каждой страницы.', 'Shown at the top of every page.')}</span></div>
    <div class="set-grid">
      ${f('ssign', L('Бонус за регистрацию, PLT', 'Sign-up bonus, PLT'), s.signupBonus, L('Новый игрок получает при регистрации.', 'A new player gets it on sign-up.'), 'min="0" max="100000"')}
      ${f('sdaily', L('Ежедневный бонус, PLT', 'Daily bonus, PLT'), s.dailyBonus, L('Раз в сутки в «Бонусах».', 'Once a day in Bonuses.'), 'min="0" max="100000"')}
      ${f('sbank', L('Банк выкупает, %', 'Bank buys at, %'), Math.round(s.bankRate * 100), L('Процент от оценки номера.', 'Percent of the plate value.'), 'min="0" max="95"')}
      ${f('sfee', L('Комиссия рынка, %', 'Market fee, %'), Math.round(s.marketFee * 1000) / 10, L('Удерживается с продавца, приходит вам.', 'Taken from the seller, paid to you.'), 'min="0" max="30" step="0.5"')}
      ${f('sdeal', L('Скупщик платит, %', 'Dealer pays, %'), Math.round(s.dealerRate * 100), L('Процент от оценки за номера из спроса дня.', 'Percent of value for plates in today’s demand.'), 'min="50" max="200"')}
      ${f('sdper', L('Скупщик: номеров в день', 'Dealer: plates a day'), s.dealerPerDay, L('Лимит на одного игрока.', 'Limit per player.'), 'min="0" max="50"')}
      ${f('sbot', L('Лотов маркетмейкера', 'Market-maker lots'), s.botSize, L('Сколько номеров держит Plate Club Market.', 'How many plates Plate Club Market keeps listed.'), 'min="0" max="200"')}
    </div><p class="err" id="serr" hidden></p><div class="row"><button class="btn btn-chrome btn-lg" type="submit">${L('Сохранить', 'Save')}</button><button class="btn btn-ghost" type="button" data-act="sreset">${L('Вернуть по умолчанию', 'Reset to defaults')}</button></div></form>`;
};

ADMIN_VIEWS.log = async () => {
  const o = await GET('/api/admin/overview');
  return `<div class="panel" style="margin-bottom:60px">${o.log.map(LogRow).join('') || `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>`;
};

function adminHooks() {
  const cf = $('#claimForm'); cf && cf.addEventListener('submit', async e => { e.preventDefault(); const b = cf.querySelector('[type=submit]'); busy(b, true, '…'); try { const r = await POST('/api/admin/claim', { code: $('#acode').value.trim() }); await refreshMe(); sfx('grail'); toast(r.granted ? `+${fmt(r.granted)} PLT` : 'OK'); render(false); } catch (x) { $('#aerr').hidden = false; $('#aerr').textContent = x.message; busy(b, false); } });
  const form = (id, fn) => { const f = $(id); f && f.addEventListener('submit', async e => { e.preventDefault(); const b = e.submitter || f.querySelector('[type=submit]'); const err = f.querySelector('.err'); if (err) err.hidden = true; busy(b, true, '…'); try { await fn(f, e); } catch (x) { if (err) { err.hidden = false; err.textContent = x.message; } else toast(x.message, true); busy(b, false); } }); };
  form('#uGrant', async f => {
    const amt = Math.round(+$('#ugamt').value), reason = $('#ugr').value.trim();
    const ok = await confirmDialog({ title: amt > 0 ? L('Отправить PLT', 'Send PLT') : L('Списать PLT', 'Deduct PLT'), rows: [[L('Сумма', 'Amount'), (amt > 0 ? '+' : '−') + fmt(Math.abs(amt)) + ' PLT', 1], [L('Причина', 'Reason'), esc(reason)]], ok: L('Подтвердить', 'Confirm'), danger: amt < 0 });
    if (!ok) return busy(f.querySelector('[type=submit]'), false);
    const r = await POST('/api/admin/grant', { userId: Number(f.dataset.id), amount: amt, reason }); toast(`${r.nickname}: ${fmt(r.balance)} PLT`); sfx('coin'); await refreshMe(); render(false);
  });
  form('#uGift', async f => { const r = await POST(`/api/admin/users/${f.dataset.id}/plate`, { tier: $('#gtier').value, country: $('#gcountry').value }); toast(L('Подарен номер ', 'Gifted ') + plateStr(r.plate)); render(false); });
  form('#allGrant', async () => { const amt = Math.round(+$('#agamt').value); const ok = await confirmDialog({ title: L('Бонус всем игрокам', 'Bonus to every player'), rows: [[L('Каждому', 'Each'), '+' + fmt(amt) + ' PLT', 1]], ok: L('Начислить', 'Grant') }); if (!ok) return busy($('#allGrant [type=submit]'), false); const r = await POST('/api/admin/grant-all', { amount: amt, reason: $('#agr').value }); toast(L(`Начислено ${r.players} игрокам`, `Granted to ${r.players} players`)); render(false); });
  form('#allMsg', async () => { const r = await POST('/api/admin/message', { all: true, subject: $('#amsubj').value, body: $('#ambody').value }); toast(L(`Отправлено: ${r.sent}`, `Sent: ${r.sent}`)); render(false); });
  form('#aReply', async (f, e) => { await POST(`/api/admin/support/${f.dataset.id}/reply`, { body: $('#arbody').value, close: !!(e.submitter && e.submitter.dataset.close) }); toast(L('Ответ отправлен', 'Answer sent')); render(false); });
  form('#botForm', async () => { await POST('/api/admin/settings', { botSize: Math.round(+$('#bsize').value) }); toast(L('Сохранено', 'Saved')); await POST('/api/admin/market/restock'); render(false); });
  form('#setForm', async () => { await POST('/api/admin/settings', { announcement: $('#sann').value, signupBonus: +$('#ssign').value, dailyBonus: +$('#sdaily').value, bankRate: +$('#sbank').value / 100, marketFee: +$('#sfee').value / 100, dealerRate: +$('#sdeal').value / 100, dealerPerDay: +$('#sdper').value, botSize: +$('#sbot').value }); CFG = await GET('/api/config'); toast(L('Настройки сохранены', 'Settings saved')); render(false); });
  form('#casesForm', async () => { const cases = {}; $$('#casesForm .cprice').forEach(i => { if (i.value) (cases[i.dataset.id] = cases[i.dataset.id] || {}).price = Math.round(+i.value); }); $$('#casesForm .cvis').forEach(i => { if (!i.checked) (cases[i.dataset.id] = cases[i.dataset.id] || {}).hidden = true; }); await POST('/api/admin/settings', { cases }); CFG = await GET('/api/config'); toast(L('Кейсы сохранены', 'Cases saved')); render(false); });
  form('#promoAdm', async () => { await POST('/api/admin/promos', { code: $('#pcode').value, amount: Math.round(+$('#pamt').value), maxUses: $('#puses').value ? Math.round(+$('#puses').value) : null, days: $('#pdays').value ? Math.round(+$('#pdays').value) : null, note: $('#pnote').value }); toast(L('Промокод создан', 'Promo code created')); render(false); });
  let t; const aq = $('#aq'); aq && aq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { AD.q = aq.value; render(false).then(() => { const n = $('#aq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); });
}
ADMIN_ACTS.ademo = async btn => { busy(btn, true, '…'); try { const r = await POST('/api/admin/demo-players', {}); toast(L(`Добавлено: ${r.made}`, `Added: ${r.made}`)); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
ADMIN_ACTS.auser = el => go('#/admin/users?id=' + el.dataset.id);
ADMIN_ACTS.qamt = btn => { const i = $('#ugamt'); i.value = btn.dataset.v; i.focus(); };
ADMIN_ACTS.atk = btn => { AD.tk = btn.dataset.s; render(false); };
ADMIN_ACTS.tstatus = async btn => { try { await POST(`/api/admin/support/${btn.dataset.id}/status`, { status: btn.dataset.s }); render(false); } catch (e) { toast(e.message, true); } };
ADMIN_ACTS.restock = async btn => { busy(btn, true, '…'); try { await POST('/api/admin/market/restock'); toast(L('Рынок пополнен', 'Market restocked')); render(false); } catch (e) { toast(e.message, true); busy(btn, false); } };
ADMIN_ACTS.sreset = async () => { const ok = await confirmDialog({ title: L('Вернуть настройки по умолчанию?', 'Reset settings to defaults?'), ok: L('Вернуть', 'Reset') }); if (!ok) return; const d = (await GET('/api/admin/settings')).defaults; await POST('/api/admin/settings', { ...d, cases: (await GET('/api/admin/settings')).settings.cases }); CFG = await GET('/api/config'); toast('OK'); render(false); };
ADMIN_ACTS.umsg = btn => {
  openDialog(`<form class="dlg" id="umForm" novalidate><h2 class="h3" id="dlgTitle">${L('Сообщение для', 'Message to')} ${esc(btn.dataset.n)}</h2><div class="fld"><label for="umsubj">${L('Тема', 'Subject')}</label><input class="field" id="umsubj" maxlength="120" value="${L('Сообщение от Plate Club', 'Message from Plate Club')}"></div><div class="fld"><label for="umbody">${L('Текст', 'Text')}</label><textarea class="field" id="umbody" rows="4" maxlength="4000" required autofocus></textarea></div><p class="err" id="umerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отправить', 'Send')}</button></div></form>`);
  $('#umForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST('/api/admin/message', { userId: Number(btn.dataset.id), subject: $('#umsubj').value, body: $('#umbody').value }); dlg.close(); toast(L('Отправлено', 'Sent')); render(false); } catch (x) { $('#umerr').hidden = false; $('#umerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_VIEWS.quests = async () => {
  const d = await GET('/api/admin/quests?status=' + AD.qs);
  const seg = `<div class="seg" role="group">${[['PENDING', L('На проверке', 'In review')], ['PAID', L('Начислено', 'Paid')], ['REJECTED', L('Отклонено', 'Rejected')]].map(([v, t]) => `<button data-act="aqs" data-s="${v}" aria-pressed="${AD.qs === v}">${t}${v === 'PENDING' && d.pending ? ` (${d.pending})` : ''}</button>`).join('')}</div>`;
  const row = x => `<div class="panel qrow"><div><p class="eyebrow">${x.kind === 'story' ? 'Instagram / Stories' : 'TikTok'} · ${date(x.at)}</p>
      <h3 class="h3" style="margin:6px 0"><a href="#/u/${esc(x.nickname)}">${esc(x.nickname)}</a> · <span class="mono small">${esc(x.handle)}</span></h3>
      <p class="small" style="margin:0"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.slice(0, 70))}</a></p>
      ${x.note ? `<p class="small" style="margin:6px 0 0;opacity:.8">${esc(x.note)}</p>` : ''}
      ${x.status !== 'PENDING' ? `<p class="small" style="margin:6px 0 0">${QSTAT()[x.status]}${x.amount ? ' · +' + fmt(x.amount) + ' PLT' : ''}${x.views ? ' · ' + fmt(x.views) + ' ' + L('просмотров', 'views') : ''}${x.reason ? ' · ' + esc(x.reason) : ''}</p>` : ''}</div>
    ${x.status === 'PENDING' ? `<div class="qacts">${x.kind === 'tiktok' ? `<input class="field mono" id="qv-${x.id}" type="number" min="0" max="100000000" placeholder="${L('просмотров', 'views')}" style="max-width:130px">` : ''}
      <button class="btn btn-sm btn-chrome" data-act="aqok" data-id="${x.id}" data-k="${x.kind}">${L('Начислить', 'Pay')}</button>
      <button class="btn btn-sm btn-ghost danger" data-act="aqno" data-id="${x.id}">${L('Отклонить', 'Reject')}</button></div>` : ''}</div>`;
  return `<p class="small" style="margin:0 0 10px">${L('Проверьте публикацию по ссылке: аккаунт открыт, есть отметка Plate Club. Для TikTok впишите просмотры — начислится 1 PLT за просмотр.', 'Open the link and check: public account, Plate Club mentioned. For TikTok type the view count — 1 PLT per view.')}</p>
    <div class="tools-row" style="margin-bottom:12px">${seg}</div>
    <div class="qlist">${d.quests.length ? d.quests.map(row).join('') : `<p class="small">${L('Пусто.', 'Empty.')}</p>`}</div>`;
};
ADMIN_ACTS.aqs = btn => { AD.qs = btn.dataset.s; render(false); };
ADMIN_ACTS.aqok = async btn => {
  const id = btn.dataset.id, views = btn.dataset.k === 'tiktok' ? Number(($('#qv-' + id) || {}).value || 0) : 0;
  if (btn.dataset.k === 'tiktok' && !(views > 0)) return toast(L('Впишите количество просмотров.', 'Enter the view count.'), true);
  busy(btn, true, '…');
  try { const r = await POST(`/api/admin/quests/${id}`, { approve: true, views }); toast(`+${fmt(r.amount)} PLT`); render(false); } catch (e) { toast(e.message, true); busy(btn, false); }
};
ADMIN_ACTS.aqno = btn => {
  openDialog(`<form class="dlg" id="qnForm"><h2 class="h3" id="dlgTitle">${L('Отклонить заявку', 'Reject the request')}</h2><div class="fld"><label for="qnr">${L('Причина — игрок её увидит', 'Reason — the player sees it')}</label><input class="field" id="qnr" maxlength="200" required autofocus></div><p class="err" id="qnerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Отклонить', 'Reject')}</button></div></form>`);
  $('#qnForm').addEventListener('submit', async e => { e.preventDefault(); const b = e.target.querySelector('[type=submit]'); busy(b, true, '…');
    try { await POST(`/api/admin/quests/${btn.dataset.id}`, { approve: false, reason: $('#qnr').value }); dlg.close(); toast(L('Отклонено', 'Rejected')); render(false); } catch (x) { $('#qnerr').hidden = false; $('#qnerr').textContent = x.message; busy(b, false); } });
};
ADMIN_ACTS.urole = btn => {
  const mk = btn.dataset.a === '1';
  openDialog(`<form class="dlg" id="roForm" novalidate><h2 class="h3" id="dlgTitle">${mk ? L('Сделать админом', 'Make admin') : L('Снять админа', 'Remove admin')}: ${esc(btn.dataset.n)}</h2><p class="small" style="margin:0">${mk ? L('Админ видит всех игроков, начисляет PLT и меняет настройки. Назначайте только тех, кому доверяете.', 'Admins see all players, grant PLT and change settings. Only appoint people you trust.') : L('Игрок потеряет доступ к панели и выйдет со всех устройств.', 'The player loses panel access and is signed out everywhere.')}</p><div class="fld"><label for="ropw">${L('Ваш пароль для подтверждения', 'Your password to confirm')}</label><input class="field" id="ropw" type="password" autocomplete="current-password" required autofocus></div><p class="err" id="roerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Подтвердить', 'Confirm')}</button></div></form>`);
  $('#roForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/users/${btn.dataset.id}/role`, { admin: mk, password: $('#ropw').value }); dlg.close(); toast(mk ? L('Назначен админом', 'Now an admin') : L('Админ снят', 'Admin removed')); render(false); } catch (x) { $('#roerr').hidden = false; $('#roerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_ACTS.ublock = async btn => {
  const block = btn.dataset.b === '1';
  if (!block) { try { await POST(`/api/admin/users/${btn.dataset.id}/block`, { block: false }); toast(L('Разблокирован', 'Unblocked')); render(false); } catch (e) { toast(e.message, true); } return; }
  openDialog(`<form class="dlg" id="blForm" novalidate><h2 class="h3" id="dlgTitle">${L('Заблокировать игрока', 'Block player')}</h2><p class="small" style="margin:0">${L('Игрок выйдет из аккаунта, его объявления снимутся с рынка.', 'The player is signed out and their listings are removed.')}</p><div class="fld"><label for="blr">${L('Причина', 'Reason')}</label><input class="field" id="blr" maxlength="200" required autofocus></div><p class="err" id="blerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Заблокировать', 'Block')}</button></div></form>`);
  $('#blForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/users/${btn.dataset.id}/block`, { block: true, reason: $('#blr').value }); dlg.close(); toast(L('Заблокирован', 'Blocked')); render(false); } catch (x) { $('#blerr').hidden = false; $('#blerr').textContent = x.message; busy(sb, false); } });
};
ADMIN_ACTS.ptoggle = async btn => { try { const r = await POST(`/api/admin/promos/${encodeURIComponent(btn.dataset.c)}/toggle`); toast(r.active ? L('Промокод включён', 'Promo enabled') : L('Промокод выключен', 'Promo disabled')); render(false); } catch (e) { toast(e.message, true); } };
ADMIN_ACTS.astatus = btn => { AD.status = btn.dataset.s; render(false); };
ADMIN_ACTS.aremove = btn => {
  openDialog(`<form class="dlg" id="remForm" novalidate><h2 class="h3" id="dlgTitle">${L('Снять объявление', 'Remove listing')} ${btn.dataset.id}</h2><div class="fld"><label for="rreason">${L('Причина', 'Reason')}</label><input class="field" id="rreason" maxlength="200" required autofocus></div><p class="err" id="rerr" hidden></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" data-act="dlgclose">${L('Отмена', 'Cancel')}</button><button class="btn btn-chrome" type="submit">${L('Снять', 'Remove')}</button></div></form>`);
  $('#remForm').addEventListener('submit', async e => { e.preventDefault(); const sb = e.target.querySelector('[type=submit]'); busy(sb, true, '…'); try { await POST(`/api/admin/listings/${btn.dataset.id}/remove`, { reason: $('#rreason').value.trim() }); dlg.close(); toast('OK'); render(false); } catch (x) { $('#rerr').hidden = false; $('#rerr').textContent = x.message; busy(sb, false); } });
};
