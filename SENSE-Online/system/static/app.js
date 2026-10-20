const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
let room = null, session = null, socket, tab = 'play', entryMode = new URLSearchParams(location.search).has('room') ? 'join' : 'create';
let questions = [], selectedQuestion = null, setupMode = 'preset', librarySearch = '', libraryCategory = '', audioEnabled = false;
let eventSeen = -1, connectionGeneration = 0, reconnectAttempts = 0, reconnectTimer, toastTimer, lastSecond = -1;
let countdownPlayed = new Set(), timeUpShown = false, serverAnchor = Date.now() / 1000, monotonicAnchor = performance.now(), samples = [];
const reactionKinds = [['good', '👍', 'グッド'], ['surprise', '😲', 'びっくり'], ['joy', '😄', '喜び'], ['heart', '❤️', 'ハート'], ['sad', '😢', '悲しい'], ['angry', '😠', '怒り']];
const reactionSeen = new Set();
let musicKey = '', ytPlayer = null, ytReady = false, ytLoading = false, duckedUntil = 0;
let youtubeClosed = false;
try {
    youtubeClosed = localStorage.getItem('sense:youtube-closed') === 'true';
}
catch { }
let prefs = { master: .7, effects: .6, bgm: .35, effectsOn: true, bgmOn: true, countdownOn: true };
try {
    prefs = { ...prefs, ...JSON.parse(localStorage.getItem('sense:audio') || '{}') };
}
catch { }
const bgm = $('#bgm');
const sounds = {};
const labels = { LOBBY: 'ロビー', QUESTION_SETUP: '問題を準備中', ANSWERING: '回答受付中', CLOSED_PENDING_REVEAL: '結果公開待ち', RESULT: 'ラウンド結果', FINISHED: '最終ランキング' };
const format = (n) => Number(n).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
function player(id) { return room?.players.find(p => p.id === id); }
function avatar(p, i = 0) { return `<span class="avatar c${i % 5}">${esc(p.nickname.slice(0, 1))}</span>`; }
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function modal(html) { $('#modal-content').innerHTML = html; if (!$('#modal').open)
    $('#modal').showModal(); }
function now() { return serverAnchor + (performance.now() - monotonicAnchor) / 1000; }
function syncTime(server, rtt = 0) { serverAnchor = server + rtt / 2000; monotonicAnchor = performance.now(); }
async function api(path, data, method = 'POST') {
    const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) {
        if (body.detail?.code === 'PLAYER_KICKED')
            leaveRoom(body.detail.message);
        throw new Error(typeof body.detail === 'string' ? body.detail : body.detail?.message || '処理できませんでした。入力内容を確認してください。');
    }
    return body;
}
async function act(action, data = {}) { await api(`/api/rooms/${session.code}/${action}`, data); }
function sound(name, countdown = false) {
    if (!audioEnabled || !prefs.effectsOn || (countdown && !prefs.countdownOn))
        return;
    const a = sounds[name] || (sounds[name] = new Audio(`/static/sounds/${name}.wav`));
    a.currentTime = 0;
    a.volume = Math.min(1, prefs.master * prefs.effects);
    a.play().catch(() => { });
    if (['reveal', 'finish'].includes(name)) {
        duckedUntil = performance.now() + 2200;
        updateVolume();
        setTimeout(updateVolume, 2250);
    }
}
function updateVolume() {
    const volume = audioEnabled && prefs.bgmOn ? Math.max(0, Math.min(1, prefs.master * prefs.bgm)) : 0;
    bgm.volume = volume * (performance.now() < duckedUntil ? .3 : 1);
    if (ytReady && ytPlayer?.setVolume) {
        ytPlayer.setVolume(volume * 100);
        if (volume === 0)
            ytPlayer.mute();
        else
            ytPlayer.unMute();
    }
}
async function enableAudio() { audioEnabled = true; sound('confirm'); updateVolume(); musicKey = ''; updateMusic(); render(); toast('音声を有効にしました'); }
function audioSettings() {
    modal(`<div class="eyebrow">YOUR SOUND, YOUR WAY</div><h2 class="dialog-title">音声設定</h2><p class="subtext">設定はこのブラウザに保存されます。</p><div class="dialog-section">${[['master', 'マスター音量'], ['effects', '効果音'], ['bgm', 'BGM']].map(([key, label]) => `<div class="volume-row"><label for="volume-${key}">${label}</label><input id="volume-${key}" data-volume="${key}" type="range" min="0" max="100" value="${Math.round(prefs[key] * 100)}"><span id="value-${key}">${Math.round(prefs[key] * 100)}%</span></div>`).join('')}${[['effectsOn', '効果音を再生'], ['bgmOn', 'BGMを再生'], ['countdownOn', 'カウントダウン音を再生']].map(([key, label]) => `<label class="switch-row">${label}<input data-audio-toggle="${key}" type="checkbox" ${prefs[key] ? 'checked' : ''}></label>`).join('')}</div><button class="btn primary full" data-action="enable-audio">${audioEnabled ? '音声を有効化済み' : '音声を有効化'}</button>`);
}
function rules() {
    modal(`<div class="eyebrow">HOW TO PLAY</div><h2 class="dialog-title">みんなの「ふつう」を当てよう。</h2><ol class="rules-list"><li>3〜10人でルームに集合。ホストも回答できます。</li><li>問題を見て、自分の感覚を数字で回答。公開まで他の人の回答は秘密です。</li><li>中央値モードは、重複を除いた数字を並べ、真ん中の値が正解。偶数種類なら大きい側を採用します。</li><li>平均値モードは、全員の平均にいちばん近い人が正解。同率なら全員正解です。</li><li>初期設定は正解 +100点、最大・最小は −50点。正解を優先します。</li><li>締切後は主催者が追加回答を許可できます。結果は主催者の「結果を公開」、または設定した自動公開で確定します。未回答や訂正待ちの人がいる間は、自動公開を待ちます。</li></ol><p class="subtext">通常は有効回答が3人未満のラウンドは無得点。主催者が設定でデバッグモードを有効にすると、1人から開始・採点を確認できます。</p>`);
}
function landing() {
    return `<div class="welcome-banner"><div><div class="eyebrow">A LITTLE QUIZ, A LOT OF DISCOVERY</div><h1 style="margin-top:10px">みんなで、感覚あわせ。</h1><p class="subtext">数字からはじまる、ちょっと新しい会話。</p></div><span class="badge">● 3〜10人でプレイ</span></div>
  <div class="welcome-layout"><section class="hero"><div><div class="eyebrow">WHAT'S YOUR NORMAL?</div><h1>みんなの「<em>ふつう</em>」を、<br>数字であそぼう。</h1><p>ちょっと贅沢なランチは、何円から？<br>答えは人それぞれ。真ん中を当てるのは、だれ？</p></div><div class="number-art" aria-label="回答例 1000円、1500円、3000円"><div class="number-card"><span>YOUR SENSE</span><b>1,000</b><span>円</span></div><div class="number-card"><span>OUR MIDDLE</span><b>1,500</b><span>円</span></div><div class="number-card"><span>YOUR SENSE</span><b>3,000</b><span>円</span></div><span class="art-star">✳</span></div><div class="hero-bottom"><span>NO RIGHT ANSWER. JUST OUR ANSWER.</span><span>01 — ∞</span></div></section>
  <section class="card entry-card"><div class="entry-tabs"><button class="entry-tab ${entryMode === 'create' ? 'active' : ''}" data-entry="create">ルームを作成</button><button class="entry-tab ${entryMode === 'join' ? 'active' : ''}" data-entry="join">ルームに参加</button></div><h2>${entryMode === 'create' ? '今日のメンバーを、招待しよう。' : 'みんなのいるルームへ。'}</h2><p class="subtext">${entryMode === 'create' ? 'あなたが主催者。まずは名前を教えてください。' : '6桁のルームコードで、すぐに合流できます。'}</p><form id="entry-form"><div class="field"><label for="nickname">ニックネーム</label><input id="nickname" name="nickname" maxlength="20" autocomplete="nickname" placeholder="例：はる" required></div>${entryMode === 'join' ? `<div class="field"><label for="code">ルームコード</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="6桁の数字" value="${esc(new URLSearchParams(location.search).get('room') || '')}" required></div>` : ''}<button class="btn primary full" type="submit">${entryMode === 'create' ? 'ルームをつくる' : 'ルームに参加する'} <span>↗</span></button><p class="answer-note">インストール不要・スマートフォンからも参加できます</p></form><div class="entry-foot">${entryMode === 'create' ? 'ルームを作成すると、招待リンクが発行されます。<br>3人以上集まったら、ゲームをはじめましょう。' : 'ニックネームは同じルームで重複できません。<br>再読み込みしても、参加状態は保存されます。'}</div></section></div>
  <div class="feature-row"><div class="feature"><span class="feature-num">01</span><div><b>感覚で、答える。</b><p>知識はいりません。あなたの思う数字を。</p></div></div><div class="feature"><span class="feature-num">02</span><div><b>真ん中を、ねらう。</b><p>中央値と平均値、2つのモードで楽しもう。</p></div></div><div class="feature"><span class="feature-num">03</span><div><b>ちがいを、楽しむ。</b><p>「え、その数字!?」が会話のきっかけに。</p></div></div></div>`;
}
function roomHeader(title, subtitle) {
    return `<div class="page-heading"><div>${room.settings.debug_mode ? '<span class="badge yellow" style="margin-bottom:10px">デバッグモード · 1人から動作確認中</span>' : ''}<div class="eyebrow">${room.state === 'LOBBY' ? 'GATHER YOUR PEOPLE' : `ROUND ${String(room.round_number).padStart(2, '0')} ${room.round_limit ? `/ ${String(room.round_limit).padStart(2, '0')}` : '/ ∞'}`}</div><h1 style="margin-top:8px">${title}</h1><p class="subtext">${subtitle}</p></div><div class="room-code"><span class="code-caption">ROOM</span><b>${room.code}</b><button data-action="copy" aria-label="招待リンクをコピー">⧉</button></div></div>` + reactionBar();
}
function reactionBar() {
    return `<section class="reaction-bar" aria-label="リアクション"><span class="reaction-caption">いまの気持ち</span><div class="reaction-buttons">${reactionKinds.map(([kind, emoji, label]) => `<button class="reaction-button" data-reaction="${kind}" aria-label="${label}のリアクションを送る"><span aria-hidden="true">${emoji}</span><small>${label}</small></button>`).join('')}</div></section>`;
}
function showReaction(message) {
    if (!room || message.code !== room.code || reactionSeen.has(message.id))
        return;
    const kind = reactionKinds.find(([key]) => key === message.kind);
    if (!kind)
        return;
    reactionSeen.add(message.id);
    if (reactionSeen.size > 100)
        reactionSeen.delete(reactionSeen.values().next().value);
    const feed = $('#reaction-feed'), item = document.createElement('div');
    item.className = 'reaction-pop';
    const emoji = document.createElement('span');
    emoji.className = 'reaction-emoji';
    emoji.textContent = kind[1];
    const caption = document.createElement('span');
    caption.textContent = `${message.nickname} · ${kind[2]}`;
    item.append(emoji, caption);
    feed.append(item);
    while (feed.children.length > 3)
        feed.firstElementChild.remove();
    setTimeout(() => item.remove(), 4500);
}
function leaveRoom(message = '') {
    if (message && session)
        localStorage.removeItem(`sense:room:${session.code}`);
    connectionGeneration++;
    clearTimeout(reconnectTimer);
    socket?.close();
    room = null;
    session = null;
    selectedQuestion = null;
    localStorage.removeItem('sense:current');
    history.replaceState(null, '', '/');
    bgm.pause();
    if (ytReady)
        ytPlayer.pauseVideo();
    $('#youtube-panel').hidden = true;
    $('#youtube-reopen').hidden = true;
    $('#reaction-feed').replaceChildren();
    reactionSeen.clear();
    $('#connection').textContent = 'オンラインで、いっしょに。';
    $('#connection').classList.remove('offline');
    eventSeen = -1;
    tab = 'play';
    render();
    $('#modal').close();
    if (message)
        modal(`<h2 class="dialog-title">ルームから退出しました</h2><p class="subtext">${esc(message)}</p>`);
}
function notice() { return !audioEnabled ? `<div class="sound-notice"><span>♫ 効果音やBGMで、もっと楽しく。</span><button class="btn small" data-action="enable-audio">音声を有効化</button></div>` : ''; }
function participants() {
    const rd = room.round, submitted = rd?.submitted_ids || [], members = room.players.filter(p => !p.kicked);
    return `<section class="card mini-card"><header><h3>参加メンバー</h3><span class="badge">${rd?.question ? `${submitted.length} / ${rd.eligible_ids.length} 回答済み` : `${members.length} 人`}</span></header><div class="participants">${members.map((p, i) => `<div class="person member-row">${avatar(p, i)}<div class="member-info"><div class="person-name">${esc(p.nickname)} ${p.id === room.me ? '<small class="muted">(あなた)</small>' : ''}</div><div class="person-detail">${p.id === room.host_id ? '主催者' : p.id === rd?.presenter_id ? '今回の出題者' : !p.active ? 'おやすみ中' : p.connected ? 'オンライン' : 'オフライン'}</div></div><span class="status ${submitted.includes(p.id) ? 'done' : rd?.allowed_late_player_ids?.includes(p.id) ? 'late' : ''}">${rd?.question ? (submitted.includes(p.id) ? '✓ 回答済み' : !rd.eligible_ids.includes(p.id) ? '出題のみ' : rd.allowed_late_player_ids.includes(p.id) ? '追加回答OK' : '考え中…') : (p.connected ? '●' : '○')}</span>${room.is_host && p.id !== room.me ? `<button class="member-kick" data-action="kick" data-player="${esc(p.id)}" aria-label="${esc(p.nickname)}をキック">キック</button>` : ''}</div>`).join('')}</div></section>`;
}
function ranking() {
    const sorted = room.players.filter(p => !p.kicked).sort((a, b) => b.total_score - a.total_score);
    let lastScore, rank = 0;
    return `<section class="card mini-card"><header><h3>現在のランキング</h3><span class="eyebrow" style="font-size:8px">LEADERBOARD</span></header><div class="participants">${sorted.map((p, i) => { if (p.total_score !== lastScore)
        rank = i + 1; lastScore = p.total_score; return `<div class="person"><span class="rank">${rank === 1 ? '♔' : String(rank).padStart(2, '0')}</span>${avatar(p, i)}<span class="person-name">${esc(p.nickname)}</span><span class="points">${format(p.total_score)}<small>pt</small></span></div>`; }).join('')}</div></section>`;
}
function settingsForm() {
    const s = room.settings;
    const select = (id, title, opts, value) => `<label>${title}<select id="setting-${id}" name="${id}" ${!room.is_host ? 'disabled' : ''}>${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(value) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<form id="settings-form"><div class="settings-grid">${select('mode', '判定モード', [['median', '中央値（重複を除く）'], ['mean', '平均値']], s.mode)}${select('time_limit', '回答制限時間', [[0, '制限なし'], [30, '30秒'], [60, '60秒'], [90, '90秒'], [120, '120秒'], [s.time_limit, `${s.time_limit}秒（現在）`]], s.time_limit)}<label>全員回答後、結果公開までの秒数<input name="auto_reveal_delay" type="number" min="0" max="3600" step="1" value="${s.auto_reveal_delay ?? 5}" ${!room.is_host ? 'disabled' : ''}><small class="muted">0〜3600秒。0秒はすぐに公開</small></label>${select('presenter_mode', '出題の順番', [['rotation', 'みんなで順番に'], ['host', '主催者が出題'], ['manual', '主催者が自由に指名']], s.presenter_mode)}${select('presenter_answers', '出題者の回答', [[true, '出題者も回答する'], [false, '出題者は回答しない']], s.presenter_answers)}${select('rounds', 'ラウンド数', [[0, '人数 × 出題回数'], [3, '3ラウンド'], [5, '5ラウンド'], [10, '10ラウンド']], s.rounds)}<label>1人あたり出題回数<input name="rounds_per_player" type="number" min="0" max="100" value="${s.rounds_per_player}" ${!room.is_host ? 'disabled' : ''}><small class="muted">0回でラウンド数無制限</small></label><label>正解の得点<input name="correct_score" type="number" value="${s.correct_score}" ${!room.is_host ? 'disabled' : ''}></label><label>最大値のペナルティ<input name="max_penalty" type="number" value="${s.max_penalty}" ${!room.is_host ? 'disabled' : ''}></label><label>最小値のペナルティ<input name="min_penalty" type="number" value="${s.min_penalty}" ${!room.is_host ? 'disabled' : ''}></label><label>任意の制限秒数<input name="custom_time" type="number" min="0" max="86400" placeholder="選択肢以外の場合" ${!room.is_host ? 'disabled' : ''}></label></div><label style="margin-top:16px"><input name="auto_reveal" type="checkbox" ${s.auto_reveal ? 'checked' : ''} ${!room.is_host ? 'disabled' : ''}>全員の回答がそろったら結果を自動公開する</label><p class="answer-note">未回答・回答訂正待ちの人がいる場合は、制限時間が切れても自動公開しません。追加回答がそろうと、設定した秒数だけ待って公開します。</p><label style="margin-top:16px"><input name="allow_repeat" type="checkbox" ${s.allow_repeat ? 'checked' : ''} ${!room.is_host ? 'disabled' : ''}>同じ問題の再出題を許可する</label><label style="margin-top:16px"><input name="debug_mode" type="checkbox" ${s.debug_mode ? 'checked' : ''} ${!room.is_host ? 'disabled' : ''}>デバッグモード（1人で開始・採点）</label><p class="answer-note">動作確認用です。1人でも出題・回答・結果公開を試せます。</p>${room.is_host ? '<button class="btn full" type="submit" style="margin-top:12px">設定を保存</button>' : ''}</form>`;
}
function lobby() {
    return roomHeader('さあ、みんなを集めよう。', '招待リンクをシェアして、ゲームの準備を。') + notice() + `<div class="lobby-grid"><div class="stack"><section class="card"><div class="row between"><h3>招待する</h3><span class="badge">PRIVATE ROOM</span></div><div class="invite-visual"><div class="eyebrow">YOUR ROOM CODE</div><div class="code">${room.code}</div><p>このコードを、今日のメンバーへ。</p></div><button class="btn primary full" data-action="copy">⧉ 招待リンクをコピー</button></section>${participants()}${room.is_host ? `<button class="btn lime full" data-action="start" ${room.players.filter(p => p.active).length < (room.settings.debug_mode ? 1 : 3) ? 'disabled' : ''}>ゲームをはじめる →</button><p class="answer-note">${room.settings.debug_mode ? 'デバッグモード：1人以上で開始できます。' : '3人以上で開始できます。'}現在 ${room.players.filter(p => p.active).length} 人</p>` : '<div class="card success-panel"><b>入室しました ✧</b><p>主催者がゲームを開始するまでお待ちください。</p></div>'}<button class="text-button" data-action="leave">ホームへ戻る（参加情報は保存されます）</button></div><section class="card"><div class="row between" style="margin-bottom:22px"><h3>ゲームの設定</h3><span class="eyebrow">MAKE IT YOURS</span></div>${settingsForm()}</section></div>` + musicBar();
}
function questionFields(q = { text: '', category: 'その他', unit: '', allow_decimal: false }) {
    return `<div class="field"><label for="question-text">問題文</label><textarea id="question-text" name="text" required maxlength="500" placeholder="みんなに聞いてみたいことは？">${esc(q.text)}</textarea></div><div class="grid2"><label>単位<input name="unit" maxlength="20" value="${esc(q.unit)}" placeholder="円、分、回など"></label><label>カテゴリー<input name="category" maxlength="40" value="${esc(q.category)}" list="categories"></label></div><div class="grid2" style="margin-top:12px"><label>最小値（任意）<input name="min_value" type="number" step="0.01" value="${esc(q.min_value)}"></label><label>最大値（任意）<input name="max_value" type="number" step="0.01" value="${esc(q.max_value)}"></label></div><label style="margin-top:16px"><input name="allow_decimal" type="checkbox" ${q.allow_decimal ? 'checked' : ''}>小数第2位まで回答を許可</label><datalist id="categories">${[...new Set(questions.map(q => q.category))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>`;
}
function presenterSelection() {
    if (room.settings.presenter_mode !== 'manual' || !room.is_host)
        return '';
    return `<section class="card" style="margin-bottom:18px"><h3>今回の出題者を選ぶ</h3><p class="subtext">ラウンドごとに自由に指名できます。同じ人を続けて選ぶこともできます。</p><form id="presenter-form" class="row" style="margin-top:14px"><label style="flex:1;min-width:160px">出題者<select name="player_id" required><option value="" ${!room.round.presenter_id ? 'selected' : ''} disabled>参加者を選んでください</option>${room.players.filter(p => p.active).map(p => `<option value="${esc(p.id)}" ${p.id === room.round.presenter_id ? 'selected' : ''}>${esc(p.nickname)}${p.id === room.host_id ? '（主催者）' : ''}</option>`).join('')}</select></label><button class="btn primary" type="submit">出題者を決定</button></form><p class="subtext">問題を公開するまで変更できます。</p></section>`;
}
const questionGenres = ['社会', '生活', '定義基準', '個人'];
const genreDescriptions = ['世の中の数字を想像する', '身近な暮らしの感覚', 'あいまいな境界を数字に', 'このメンバーならどうする？'];
function questionChoices() {
    const choices = room.round.preset_choices || [];
    return `<div class="choice-heading"><div><h3>4ジャンルから、ひとつ。</h3><p class="subtext">各ジャンルからランダムに1問ずつ。気になる問題を選んでください。</p></div><button class="btn small" data-action="random">⤨ 4問を引き直す</button></div><div class="question-choices">${questionGenres.map((genre, i) => {
        const q = choices.find(q => q.category === genre);
        return `<section class="choice-card genre-${i}"><div class="choice-genre"><span class="choice-number">0${i + 1}</span><h3>${genre}</h3></div><p class="choice-description">${genreDescriptions[i]}</p>${q ? `<p class="choice-question">${esc(q.text.replaceAll('{name}', '○○'))}</p><span class="choice-unit">数字で回答 · ${esc(q.unit || '単位なし')}</span><button class="btn full" data-choice="${esc(q.id)}">この問題を選ぶ →</button>` : '<p class="choice-question muted">このジャンルの未使用問題がありません。</p><p class="subtext">問題を追加するか、再出題を許可できます。</p>'}</section>`;
    }).join('')}</div><p class="answer-note">選ばなかった問題は次回以降も抽選されます。自由出題・問題ライブラリも利用できます。</p>`;
}
function publishEditor() {
    const personal = selectedQuestion?.text.includes('{name}');
    return `<form id="publish-form">${personal ? `<div class="personal-target"><label>この問題の対象メンバー<select id="question-person" name="target_player_id" required><option value="" selected disabled>誰について出題する？</option>${room.players.filter(p => p.active).map(p => `<option value="${esc(p.id)}">${esc(p.nickname)}</option>`).join('')}</select></label><p class="subtext">選んだ人の名前を問題文に入れます。公開前に文章を編集できます。</p></div>` : ''}${questionFields(selectedQuestion || undefined)}<div class="row" style="margin-top:22px"><button class="btn primary" type="submit">問題を公開する ↗</button><button class="btn" type="button" data-action="pick-reset">選び直す</button></div></form>`;
}
function setup() {
    const rd = room.round, can = !!rd.presenter_id && (room.me === rd.presenter_id || (room.is_host && rd.host_proxy));
    const proxy = room.is_host && rd.presenter_id && rd.presenter_id !== room.me;
    return roomHeader('次は、どんな感覚を聞く？', rd.presenter_id ? `${esc(player(rd.presenter_id)?.nickname)} さんの出題ターンです。` : '主催者が今回の出題者を選んでいます。') + notice() + `<div class="game-layout"><div>${presenterSelection()}<section class="card"><div class="row between" style="margin-bottom:20px"><h3>問題を準備する</h3><span class="badge">${room.settings.mode === 'median' ? '中央値' : '平均値'}モード</span></div>${rd.host_proxy ? '<p class="proxy-notice">主催者が代理出題中です。出題者も引き続き問題を選べます。</p>' : ''}${can ? `<div class="entry-tabs setup-tabs"><button class="entry-tab ${setupMode === 'preset' ? 'active' : ''}" data-setup="preset">プリセットから</button><button class="entry-tab ${setupMode === 'custom' ? 'active' : ''}" data-setup="custom">自由に出題</button></div>${setupMode === 'preset' && !selectedQuestion ? questionChoices() : publishEditor()}` : `<div class="empty"><div class="waiting-icon">✳</div>${rd.presenter_id ? '出題者が問題を選んでいます。<br>どんな質問になるか、お楽しみに。' : '今回の出題者を選んでから問題を準備します。'}</div>`}${proxy ? `<button class="btn full" data-action="proxy-toggle" style="margin-top:18px">${rd.host_proxy ? '代理出題をやめる' : '代理で出題する'}</button>` : ''}</section>${room.is_host ? `<details class="host-panel"><summary>主催者メニュー · ラウンド設定</summary><div style="margin-top:18px">${settingsForm()}</div><button class="btn danger" data-action="finish" style="margin-top:15px">ここでゲームを終了</button></details>` : ''}</div><div class="side-panels">${participants()}<div><h3 class="section-title">ここまでのスコア</h3>${ranking()}</div></div></div>` + musicBar();
}
function revealStatus() {
    const rd = room.round;
    if (!rd.settings.auto_reveal)
        return '';
    const missing = rd.eligible_ids.filter(id => !rd.submitted_ids.includes(id)).length;
    let message = rd.auto_reveal_held ? 'このラウンドは自動公開を停止中です。主催者の結果公開をお待ちください。' : rd.correction_allowed_ids.length ? '回答訂正を待っています。訂正が完了すると自動公開のカウントダウンを始めます。' : missing ? `未回答が ${missing} 人。全員の回答がそろうまで、自動公開を待ちます。` : '全員の回答がそろいました。';
    return `<div class="reveal-status"><span class="eyebrow">結果の自動公開</span><p>${message}</p>${rd.auto_reveal_deadline != null ? '<strong id="reveal-countdown" role="timer" aria-label="結果公開までの残り時間"></strong>' : ''}${room.is_host && !rd.auto_reveal_held ? '<button class="btn" data-action="reveal-hold">このラウンドの自動公開を止める</button>' : ''}</div>`;
}
function timerMarkup() { return `<div class="timer-box" id="timer-box"><div class="timer-top"><span id="timer-label">残り時間</span><strong class="timer-digits" id="timer-digits">--:--</strong><span id="timer-status">考えてみよう</span></div><div class="timer-track"><div class="timer-fill" id="timer-fill"></div></div></div>`; }
function answerArea() {
    const rd = room.round, answered = rd.submitted_ids.includes(room.me), edit = rd.correction_allowed_ids.includes(room.me);
    const allowed = rd.eligible_ids.includes(room.me) && (room.state === 'ANSWERING' || rd.allowed_late_player_ids.includes(room.me));
    if (allowed && (!answered || edit))
        return `<form id="answer-form"><label for="answer-value">${edit ? '主催者から回答訂正が許可されました' : 'あなたの感覚を、数字で。'}</label><div class="answer-input"><input id="answer-value" name="value" type="number" step="${rd.question.allow_decimal ? '.01' : '1'}" ${rd.question.min_value != null ? `min="${esc(rd.question.min_value)}"` : ''} ${rd.question.max_value != null ? `max="${esc(rd.question.max_value)}"` : ''} placeholder="0" inputmode="${rd.question.allow_decimal ? 'decimal' : 'numeric'}" required><span>${esc(rd.question.unit)}</span></div><button class="btn primary full" type="submit">この回答で確定する <span>→</span></button><p class="answer-note">回答は結果公開まで、ほかの人には見えません。</p></form>`;
    return `<div class="success-panel"><b>${answered ? '✓ 回答を受け付けました' : !rd.eligible_ids.includes(room.me) ? '今回は出題のみの参加です' : '回答受付は終了しました'}</b><p>${answered ? `あなたの回答：${format(rd.own_answer)} ${esc(rd.question.unit)}<br>` : ''}${room.state === 'CLOSED_PENDING_REVEAL' ? '結果公開をお待ちください。' : 'みんなの回答がそろうまで、ひとやすみ。'}</p></div>`;
}
function hostControls() {
    if (!room.is_host)
        return '';
    const rd = room.round, closed = room.state === 'CLOSED_PENDING_REVEAL';
    return `<section class="host-panel"><div class="row between" style="margin-top:0"><h3>♔ 主催者のコントロール</h3><span class="badge ${closed ? 'yellow' : ''}">${closed ? '回答受付終了' : '進行中'}</span></div><p>${closed ? (rd.auto_reveal_deadline != null ? '全員の回答がそろったため、自動公開を待っています。必要なら自動公開を止めて回答訂正を許可できます。' : '追加回答を許可するか、結果を公開してください。まだ回答の内容は公開されていません。') : '必要に応じて時間を延長・一時停止できます。'}</p>${closed ? `<div class="row">${[10, 30, 60, 0].map(s => `<button class="btn" data-action="reopen" data-seconds="${s}">${s ? `${s}秒で再開` : '無制限で再開'}</button>`).join('')}</div>${rd.eligible_ids.filter(id => !rd.submitted_ids.includes(id)).map(id => `<div class="row between"><span style="font-size:11px">${esc(player(id)?.nickname)}：未回答</span><button class="btn" data-action="allow" data-player="${id}">${rd.allowed_late_player_ids.includes(id) ? '許可済み' : 'この人の回答を許可'}</button></div>`).join('')}<div class="row"><button class="btn primary" data-action="reveal">結果を公開する ✧</button><button class="btn danger" data-action="cancel">無得点で中止</button></div>` : `<div class="row">${[10, 30, 60].map(s => `<button class="btn" data-action="extend" data-seconds="${s}">+${s}秒</button>`).join('')}<input id="extra-seconds" type="number" min="1" max="86400" placeholder="任意秒数" aria-label="任意の追加秒数"><button class="btn" data-action="extend-custom">追加</button><button class="btn" data-action="${rd.timer_paused ? 'resume' : 'pause'}">${rd.timer_paused ? '▶ 再開' : 'Ⅱ 一時停止'}</button><button class="btn" data-action="close">回答を締め切る</button></div>`}<details style="margin-top:16px;font-size:10px;color:#87957a"><summary>回答済みプレイヤーの訂正を許可</summary><div class="row">${rd.submitted_ids.map(id => `<button class="btn" data-action="edit-allow" data-player="${id}">${esc(player(id)?.nickname)} の訂正を許可</button>`).join('') || '<span>回答はまだありません</span>'}</div></details></section>`;
}
function answering() {
    return roomHeader('みんなの感覚、どのくらい？', '正解はひとつ。でも、答えは人それぞれ。') + notice() + `<div class="game-layout"><div><section class="card question-card"><div class="question-meta"><span>QUESTION ${String(room.round_number).padStart(2, '0')} <span style="margin-left:13px">${esc(room.round.question.category)}</span></span><span class="badge">${room.round.settings.mode === 'median' ? '中央値' : '平均値'}モード</span></div><div class="question-content"><div class="eyebrow">TRUST YOUR SENSE</div><h2>${esc(room.round.question.text)}</h2><p class="question-hint">${room.round.settings.mode === 'median' ? 'みんなの回答の「真ん中」をねらおう。' : 'みんなの回答の「平均」に近い数字をねらおう。'}</p>${timerMarkup()}${revealStatus()}</div><div class="answer-zone">${answerArea()}</div></section>${hostControls()}</div><div class="side-panels">${participants()}<div><h3 class="section-title">ここまでのスコア</h3>${ranking()}</div></div></div>` + musicBar();
}
function resultTable(rd) {
    const result = rd.result, answers = rd.answers || {};
    return `<table class="result-table"><thead><tr><th>プレイヤー</th><th>回答 ${esc(rd.question?.unit || '')}</th><th>判定</th><th>獲得点</th></tr></thead><tbody>${[...rd.eligible_ids].sort((a, b) => (answers[a] === undefined ? Infinity : Number(answers[a])) - (answers[b] === undefined ? Infinity : Number(answers[b]))).map((id, i) => { const p = player(id); if (!p)
        return ''; const delta = result?.deltas[id] || 0; return `<tr class="${result?.winners.includes(id) ? 'winner' : ''}"><td><div class="person">${avatar(p, i)}${esc(p.nickname)}</div></td><td>${answers[id] === undefined ? '—' : format(answers[id])}</td><td>${result?.winners.includes(id) ? '<span class="positive">✧ 正解</span>' : esc(result?.reasons[id] || '未回答')}</td><td class="${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">${delta > 0 ? '+' : ''}${delta}</td></tr>`; }).join('')}</tbody></table>`;
}
function results() {
    const rd = room.round;
    return roomHeader('なるほど、これがみんなの感覚。', 'その数字にした理由も、聞いてみよう。') + notice() + `<div class="game-layout"><div><section class="card question-card"><div class="question-meta"><span>ROUND ${String(room.round_number).padStart(2, '0')} — RESULT</span><span class="badge">${rd.settings?.mode === 'median' ? '中央値' : '平均値'}モード</span></div><div class="question-content"><h2>${esc(rd.question?.text || '')}</h2><div class="result-target"><small>${rd.result.cancelled ? 'このラウンドは無得点です' : rd.settings.mode === 'median' ? 'みんなの真ん中（重複を除く）' : 'みんなの平均値'}</small><strong>${rd.result.target === null ? '—' : format(rd.result.target)}<span>${esc(rd.question?.unit || '')}</span></strong></div></div><div style="padding:0 20px 24px">${resultTable(rd)}<p class="revision">SCORE REVISION ${room.score_revision} · 同点の正解者には全員に得点が入ります</p></div></section>${room.is_host ? `<div class="row" style="margin-top:20px"><button class="btn primary" data-action="next">${room.round_limit && room.round_number >= room.round_limit ? '最終ランキングへ' : '次のラウンドへ'} →</button><button class="btn" data-action="correction">採点訂正</button><button class="text-button" data-action="finish">ゲームを終了</button></div>` : '<p class="subtext">主催者が次のラウンドを準備しています。</p>'}${auditMarkup()}</div><div class="side-panels">${ranking()}<div><h3 class="section-title">参加メンバー</h3>${participants()}</div></div></div>` + musicBar();
}
function auditMarkup() {
    const logs = room.administrative_action_log.filter(l => l.action === 'SCORE_CORRECTION');
    return logs.length ? `<details class="host-panel"><summary style="font-size:11px">採点訂正履歴（${logs.length}件）</summary><div class="audit">${logs.map(l => `${new Date(l.at * 1000).toLocaleTimeString('ja-JP')} · ${esc(player(l.detail.player_id)?.nickname)}：${esc(l.detail.before ?? '未回答')} → ${esc(l.detail.after)}<br>理由：${esc(l.detail.reason)}`).join('<hr>')}</div></details>` : '';
}
function finished() {
    const top = Math.max(...room.players.filter(p => !p.kicked).map(p => p.total_score));
    return roomHeader('今日の、ベストセンス。', 'いろんな「ふつう」が集まりました。また一緒にあそぼう。') + `<div class="game-layout"><div><section class="card" style="text-align:center;padding:35px"><div class="eyebrow">THANKS FOR PLAYING</div><div class="final-crown">♔</div><h2 class="final-title">GOOD SENSE!</h2><p class="subtext">${room.players.filter(p => !p.kicked && p.total_score === top).length > 1 ? '同率優勝' : '本日の優勝'}</p><div class="winner-name">${room.players.filter(p => !p.kicked && p.total_score === top).map(p => esc(p.nickname)).join(' & ')}</div><p class="subtext">${format(top)} pt</p><div style="margin-top:30px">${ranking()}</div>${room.is_host ? '<button class="btn primary full" data-action="start" style="margin-top:25px">同じメンバーでもう一度 →</button>' : ''}<button class="text-button" data-tab="history" style="margin-top:20px">ラウンドを振り返る</button></section>${auditMarkup()}</div><div class="side-panels">${participants()}</div></div>` + musicBar();
}
function library() {
    const filtered = questions.filter(q => (!librarySearch || (q.text + q.category).includes(librarySearch)) && (!libraryCategory || q.category === libraryCategory));
    return `<div class="page-heading"><div><div class="eyebrow">QUESTION LIBRARY</div><h1 style="margin-top:8px">会話のきっかけを、探そう。</h1><p class="subtext">日常のあれこれ、みんなの感覚が気になる質問たち。</p></div>${room?.is_host ? '<button class="btn primary" data-action="preset-new">＋ 問題を追加</button>' : ''}</div><section class="card"><div class="row between"><h3>${questions.length} の質問</h3><div class="row"><button class="btn small" data-action="export">JSONを書き出す</button>${room?.is_host ? '<button class="btn small" data-action="import">JSONを読み込む</button>' : ''}</div></div><div class="library-head"><input id="library-search" placeholder="問題文やカテゴリーで検索" value="${esc(librarySearch)}" aria-label="問題を検索"><select id="library-category" aria-label="カテゴリーで絞り込む"><option value="">すべてのカテゴリー</option>${[...new Set(questions.map(q => q.category))].map(c => `<option ${c === libraryCategory ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div class="preset-list">${filtered.map((q, i) => `<div class="preset-item"><span class="preset-index">${String(i + 1).padStart(2, '0')}</span><div class="preset-info"><b>${esc(q.text)}</b><p>${esc(q.category)} · ${esc(q.unit || '単位なし')} · ${q.allow_decimal ? '小数可' : '整数'}</p></div><div class="row">${room?.state === 'QUESTION_SETUP' && (room.is_host || room.me === room.round.presenter_id) ? `<button class="btn small" data-pick="${esc(q.id)}">出題</button>` : ''}${room?.is_host ? `<button class="text-button" data-edit="${esc(q.id)}">編集</button><button class="text-button" data-delete="${esc(q.id)}">削除</button>` : ''}</div></div>`).join('') || '<div class="empty">条件に合う問題がありません。</div>'}</div>${!room ? '<p class="answer-note">ルームを作成すると、オリジナル問題を登録できます。</p>' : ''}</section>`;
}
function historyPage() {
    if (!room)
        return '<div class="card empty">ルームに参加すると、ラウンド履歴がここに表示されます。</div>';
    const rounds = [...room.history];
    if (room.round?.result && !rounds.some(h => h.id === room.round.id))
        rounds.push(room.round);
    return roomHeader('数字で振り返る、今日の時間。', 'みんなの感覚が集まったラウンドの記録。') + `<section class="card">${rounds.reverse().map(rd => `<details class="history-item"><summary><span class="badge">ROUND ${String(rd.number).padStart(2, '0')}</span> <b style="margin-left:10px">${esc(rd.question?.text)}</b></summary>${resultTable(rd)}<p class="subtext">基準値 ${rd.result?.target == null ? '—' : format(rd.result.target)} ${esc(rd.question?.unit)} · ${rd.settings?.mode === 'median' ? '中央値' : '平均値'}モード</p></details>`).join('') || '<div class="empty">まだ結果が公開されたラウンドはありません。</div>'}</section>` + auditMarkup();
}
function musicBar() {
    const m = room.music;
    return `<section class="music-bar"><div class="music-icon">♫</div><div><div class="music-name">${esc(m.name)}</div><div class="music-caption">ROOM BGM · ${m.source === 'none' ? '音楽でも、場をつくろう。' : m.playback_state === 'playing' ? 'PLAYING' : m.playback_state === 'paused' ? 'PAUSED' : 'STOPPED'}</div></div><div class="music-controls">${room.is_host ? `<button data-action="music-${m.playback_state === 'playing' ? 'pause' : 'play'}" aria-label="${m.playback_state === 'playing' ? 'BGMを一時停止' : 'BGMを再生'}">${m.playback_state === 'playing' ? 'Ⅱ' : '▷'}</button><button data-action="music-stop" aria-label="BGMを停止">□</button>` : ''}<button data-action="audio-settings" aria-label="個人の音量設定">${prefs.bgmOn ? '♫' : '⊘'}</button></div>${room.is_host ? '<button class="btn" data-action="music-settings">BGMを選ぶ ↗</button>' : ''}</section>`;
}
function render() {
    const oldKey = app.dataset.key, newKey = `${tab}:${room?.state || 'landing'}:${room?.round?.id || ''}:${entryMode}:${setupMode}:${room?.is_host && room?.round?.host_proxy || false}`;
    const values = {}, focused = document.activeElement;
    const focusId = focused?.id;
    let selection = null;
    try {
        selection = focused?.selectionStart;
    }
    catch { }
    if (oldKey === newKey)
        app.querySelectorAll('input,textarea,select').forEach((e) => { if (!e.disabled && (e.id || e.name))
            values[e.id || e.name] = { value: e.value, checked: e.checked }; });
    app.innerHTML = tab === 'library' ? library() : tab === 'history' ? historyPage() : !room ? landing() : room.state === 'LOBBY' ? lobby() : room.state === 'QUESTION_SETUP' ? setup() : ['ANSWERING', 'CLOSED_PENDING_REVEAL'].includes(room.state) ? answering() : room.state === 'RESULT' ? results() : finished();
    app.dataset.key = newKey;
    if (oldKey === newKey)
        app.querySelectorAll('input,textarea,select').forEach((e) => { const v = values[e.id || e.name]; if (v) {
            e.value = v.value;
            if (e.type === 'checkbox')
                e.checked = v.checked;
        } });
    if (focusId && oldKey === newKey) {
        const el = $(`#${focusId}`);
        if (el) {
            el.focus({ preventScroll: true });
            if (selection !== null)
                try {
                    el.setSelectionRange(selection, selection);
                }
                catch { }
        }
    }
    document.querySelectorAll('[data-tab]').forEach(e => e.classList.toggle('selected', e.getAttribute('data-tab') === tab));
    $('#page-label').textContent = tab === 'library' ? '問題ライブラリ' : tab === 'history' ? 'ラウンド履歴' : room ? labels[room.state] : 'ようこそ';
    $('#my-avatar').textContent = room ? player(room.me)?.nickname.slice(0, 1) : 'S';
    timerTick();
}
function showTimeUp() { if (timeUpShown)
    return; timeUpShown = true; $('#time-up').hidden = false; sound('timeout'); setTimeout(() => $('#time-up').hidden = true, 1800); }
function roundIntroTick() {
    const dialog = $('#round-intro'), rd = room?.round;
    const remaining = room?.state === 'QUESTION_SETUP' && rd?.presenter_id && rd.intro_until != null ? rd.intro_until - now() : 0;
    if (remaining <= 0) {
        if (dialog.open)
            dialog.close();
        return;
    }
    $('#round-intro-turn').textContent = `第 ${room.round_number} ターン`;
    $('#round-intro-total').textContent = room.round_limit ? `全 ${room.round_limit} ターン` : 'ターン数の制限なし';
    $('#round-intro-presenter').textContent = `${player(rd.presenter_id)?.nickname || '出題者'} さん`;
    $('#round-intro-hint').textContent = rd.presenter_id === room.me ? 'あなたの出題ターンです。まもなく問題選択へ。' : 'まもなく出題者が問題を選びます。';
    $('#round-intro-progress').style.width = `${Math.max(0, Math.min(100, remaining / Math.max(1, rd.intro_duration) * 100))}%`;
    if (!dialog.open) {
        $('#modal').close();
        $('#time-up').hidden = true;
        dialog.showModal();
    }
}
function timerTick() {
    roundIntroTick();
    if (!room?.round?.question || !['ANSWERING', 'CLOSED_PENDING_REVEAL'].includes(room.state))
        return;
    const rd = room.round, box = $('#timer-box');
    let remaining = room.state === 'CLOSED_PENDING_REVEAL' ? 0 : rd.timer_paused ? rd.timer_remaining_on_pause : rd.timer_deadline === null ? null : Math.max(0, rd.timer_deadline - now());
    const seconds = remaining === null ? null : Math.ceil(remaining);
    const revealCountdown = $('#reveal-countdown');
    if (revealCountdown && rd.auto_reveal_deadline != null) {
        const left = Math.max(0, Math.ceil(rd.auto_reveal_deadline - now()));
        revealCountdown.textContent = left ? `あと ${left} 秒で結果公開` : '結果を公開しています…';
    }
    if (box) {
        box.className = `timer-box ${seconds !== null && seconds <= 10 ? 'urgent' : seconds !== null && seconds < 30 ? 'warning' : ''} ${seconds !== null && seconds <= 5 && seconds > 0 && !rd.timer_paused ? 'pulse' : ''}`;
        $('#timer-digits').textContent = seconds === null ? '∞' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        $('#timer-label').textContent = room.state === 'CLOSED_PENDING_REVEAL' ? '回答受付終了' : rd.timer_paused ? '一時停止中' : remaining === null ? '制限時間なし' : '残り時間';
        $('#timer-status').textContent = room.state === 'CLOSED_PENDING_REVEAL' ? '受付終了' : rd.timer_paused ? '主催者が停止中' : seconds === null ? 'じっくりどうぞ' : seconds <= 10 ? 'まもなく締切' : seconds < 30 ? 'あと少し' : '考えてみよう';
        $('#timer-fill').style.width = remaining === null ? '100%' : `${Math.min(100, Math.max(0, remaining / Math.max(1, rd.timer_total) * 100))}%`;
        if (remaining === 0 && room.state === 'ANSWERING')
            app.querySelectorAll('#answer-form button').forEach((b) => b.disabled = true);
    }
    if (seconds !== lastSecond && room.state === 'ANSWERING' && !rd.timer_paused && seconds !== null) {
        if (seconds === 10 && !countdownPlayed.has(10)) {
            sound('countdown', true);
            countdownPlayed.add(10);
        }
        if (seconds >= 1 && seconds <= 5 && !countdownPlayed.has(seconds)) {
            sound('tick', true);
            countdownPlayed.add(seconds);
        }
        if (seconds === 0)
            showTimeUp();
    }
    lastSecond = seconds;
}
function receive(next, initial = false) {
    if (room && next.event_id < room.event_id)
        return;
    const old = room, changed = next.event_id !== eventSeen;
    room = next;
    if (!samples.length)
        syncTime(next.server_time);
    if (next.round?.presenter_id !== old?.round?.presenter_id || (next.is_host && next.round?.host_proxy !== old?.round?.host_proxy)) {
        selectedQuestion = null;
        setupMode = 'preset';
    }
    if (next.round?.choices_revision !== old?.round?.choices_revision)
        selectedQuestion = null;
    if (next.round?.id !== old?.round?.id) {
        selectedQuestion = null;
        countdownPlayed.clear();
        timeUpShown = false;
        lastSecond = -1;
    }
    if (changed && !initial && eventSeen !== -1) {
        const event = next.last_event;
        if (event === 'QUESTION_PUBLISHED')
            sound('start');
        if (event === 'PLAYER_KICKED')
            toast('主催者が参加者を退出させました');
        if (event === 'PRESENTER_PROXY_UPDATED')
            toast(next.round.host_proxy ? '主催者が代理出題を開始しました' : '主催者が代理出題を終了しました');
        if (event === 'TIME_UP')
            showTimeUp();
        if (event === 'ANSWER_REOPENED') {
            countdownPlayed.clear();
            timeUpShown = false;
            sound('reopen');
            toast('主催者が回答受付を再開・追加許可しました');
        }
        if (event === 'ROUND_REVEALED') {
            sound('reveal');
            if (next.round.result.winners.includes(next.me))
                setTimeout(() => sound('correct'), 650);
            const d = next.round.result.deltas[next.me] || 0;
            if (d)
                setTimeout(() => sound(d > 0 ? 'score-up' : 'score-down'), 1300);
        }
        if (event === 'AUTO_REVEAL_HELD')
            toast('このラウンドの自動公開を停止しました');
        if (event === 'SCORE_CORRECTED') {
            sound('reveal');
            toast('主催者が採点を訂正しました。得点と変更履歴を更新しました。');
        }
        if (event === 'GAME_FINISHED')
            sound('finish');
        if (event === 'TIMER_EXTEND')
            toast('制限時間が延長されました');
        if (event === 'PRESENTER_SELECTED')
            toast(`今回の出題者は ${player(next.round.presenter_id)?.nickname} さんです`);
    }
    eventSeen = next.event_id;
    render();
    updateMusic();
}
function scheduleReconnect(saved) {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(saved).catch(err => {
        if (!session)
            return;
        $('#connection').textContent = '再接続しています…';
        $('#connection').classList.add('offline');
        scheduleReconnect(saved);
    }), Math.min(1000 * 2 ** reconnectAttempts++, 10000));
}
async function connect(saved) {
    clearTimeout(reconnectTimer);
    const generation = ++connectionGeneration;
    if (socket)
        socket.close();
    session = saved;
    const start = performance.now();
    const snapshot = await api(`/api/rooms/${saved.code}/state`, undefined, 'GET');
    if (generation !== connectionGeneration)
        return;
    syncTime(snapshot.server_time, performance.now() - start);
    samples = [];
    receive(snapshot, true);
    const ws = socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/rooms/${saved.code}`);
    ws.onopen = () => { if (generation !== connectionGeneration)
        return; reconnectAttempts = 0; ws.send(JSON.stringify({ token: saved.token })); $('#connection').textContent = 'リアルタイム接続中'; $('#connection').classList.remove('offline'); };
    ws.onmessage = e => {
        if (generation !== connectionGeneration)
            return;
        const data = JSON.parse(e.data);
        if (data.type === 'kicked') {
            leaveRoom(data.message);
            return;
        }
        if (data.type === 'reaction') {
            showReaction(data);
            return;
        }
        if (data.type === 'pong') {
            const rtt = performance.now() - data.client_time;
            samples.push({ rtt, server: data.server_time, received: performance.now() });
            samples = samples.slice(-8);
            const best = samples.reduce((a, b) => a.rtt < b.rtt ? a : b);
            syncTime(best.server + (performance.now() - best.received) / 1000, best.rtt);
        }
        else
            receive(data);
    };
    ws.onclose = e => { if (generation !== connectionGeneration || !session)
        return; $('#connection').textContent = '再接続しています…'; $('#connection').classList.add('offline'); if (e.code === 1008) {
        toast('認証に失敗しました。ホームから参加し直してください。');
        return;
    } scheduleReconnect(saved); };
}
function persistSession(s) { localStorage.setItem(`sense:room:${s.code}`, JSON.stringify(s)); localStorage.setItem('sense:current', s.code); history.replaceState(null, '', `/?room=${s.code}`); }
function formQuestion(form) { const d = new FormData(form); return { id: form.id === 'publish-form' ? selectedQuestion?.id : form.dataset.id || undefined, text: String(d.get('text')), category: String(d.get('category') || 'その他'), unit: String(d.get('unit') || ''), allow_decimal: d.get('allow_decimal') === 'on', min_value: d.get('min_value') ? String(d.get('min_value')) : null, max_value: d.get('max_value') ? String(d.get('max_value')) : null }; }
function correctionModal() { modal(`<div class="eyebrow">ADMINISTRATIVE CORRECTION</div><h2 class="dialog-title">公開済み回答の採点訂正</h2><p class="subtext">変更は全員に通知され、理由とともに履歴へ記録します。</p><form id="correction-form" style="margin-top:22px"><label>訂正するプレイヤー<select name="player_id">${room.round.eligible_ids.map(id => `<option value="${id}">${esc(player(id)?.nickname)}（${esc(room.round.answers[id] ?? '未回答')}）</option>`).join('')}</select></label><label>正しい回答値<input name="value" type="number" step="${room.round.question.allow_decimal ? '.01' : '1'}" required></label><label>訂正理由<input name="reason" maxlength="300" placeholder="入力時の桁間違いなど" required></label><button class="btn primary full" type="submit" style="margin-top:16px">変更を通知して再採点</button></form>`); }
function presetModal(q) { modal(`<div class="eyebrow">YOUR QUESTION</div><h2 class="dialog-title">${q ? '問題を編集' : '問題を追加'}</h2><form id="preset-form" data-id="${esc(q?.id || '')}" style="margin-top:22px">${questionFields(q)}<button type="submit" class="btn primary full" style="margin-top:22px">ライブラリに保存</button></form>`); }
function musicSettings() {
    modal(`<div class="eyebrow">SET THE MOOD</div><h2 class="dialog-title">ルームのBGM</h2><p class="subtext">利用権限のある音源を登録してください。各自で音量を調整できます。</p><div class="dialog-section"><h3>同梱BGM・登録した音源</h3><input id="music-upload" type="file" accept=".mp3,.wav,.ogg" aria-label="BGM音源をアップロード"><p class="subtext">MP3 / WAV / OGG · 最大30MB</p><div class="preset-list">${(room.tracks || []).map(t => `<div class="preset-item"><div class="preset-info"><b>${esc(t.name)}</b><p>${t.builtin ? '同梱BGM' : 'アップロードした音源'}</p></div><button class="btn small" data-track="${esc(t.id)}">選択</button></div>`).join('')}</div></div><div class="dialog-section"><h3>YouTube</h3><form id="youtube-form"><input type="url" name="url" required placeholder="https://www.youtube.com/watch?v=…" aria-label="YouTube動画またはプレイリストのURL"><button class="btn full" type="submit" style="margin-top:12px">動画・プレイリストを共有</button></form><p class="subtext">プレイヤーを表示して再生します。端末ごとの再生時刻には差が生じます。</p></div><hr><label class="switch-row">ループ再生<input id="music-loop" type="checkbox" ${room.music.loop ? 'checked' : ''}></label><form id="phase-music-form"><label>現在選択中の音源を場面に割り当てる<select name="phase"><option value="answering">問題公開・回答中</option><option value="result">結果発表</option><option value="finished">ゲーム終了</option></select></label><button class="btn full" type="submit">自動切替を設定</button></form><button class="text-button" data-action="music-none" style="margin-top:16px">BGMをオフにする</button>`);
}
function updateMusic() {
    if (!room)
        return;
    const m = room.music, key = JSON.stringify([m.source, m.id, m.playback_state, m.started_at, m.position, m.loop, audioEnabled, prefs.bgmOn, youtubeClosed]);
    $('#youtube-reopen').hidden = !(m.source.startsWith('youtube') && youtubeClosed);
    updateVolume();
    if (key === musicKey)
        return;
    musicKey = key;
    if (m.source === 'local') {
        $('#youtube-panel').hidden = true;
        if (ytReady)
            ytPlayer.pauseVideo();
        const url = `/api/rooms/${room.code}/music/files/${encodeURIComponent(m.id)}?token=${encodeURIComponent(session.token)}`;
        if (bgm.getAttribute('src') !== url) {
            bgm.src = url;
            bgm.onloadedmetadata = () => seekLocal();
        }
        bgm.loop = m.loop;
        seekLocal();
        if (m.playback_state === 'playing' && audioEnabled && prefs.bgmOn)
            bgm.play().catch(() => toast('BGMの再生には「音声を有効化」を押してください'));
        else
            bgm.pause();
    }
    else if (m.source.startsWith('youtube')) {
        bgm.pause();
        if (youtubeClosed) {
            if (ytReady)
                ytPlayer.pauseVideo();
            $('#youtube-panel').hidden = true;
            return;
        }
        $('#youtube-panel').hidden = false;
        if (!ytReady) {
            loadYouTube();
            return;
        }
        applyYouTube();
    }
    else {
        bgm.pause();
        $('#youtube-panel').hidden = true;
        if (ytReady)
            ytPlayer.pauseVideo();
    }
}
function setYouTubeClosed(closed) {
    youtubeClosed = closed;
    if (closed && ytReady)
        ytPlayer.pauseVideo();
    try {
        localStorage.setItem('sense:youtube-closed', String(closed));
    }
    catch { }
    musicKey = '';
    updateMusic();
    if (closed) {
        $('#youtube-reopen').focus();
        toast('YouTubeを閉じ、この端末の再生を一時停止しました');
    }
    else
        $('#youtube-close').focus();
}
function seekLocal() { if (!room || !Number.isFinite(bgm.duration))
    return; const m = room.music; let position = m.position + (m.playback_state === 'playing' && m.started_at ? Math.max(0, now() - m.started_at) : 0); if (m.loop)
    position %= bgm.duration; if (Math.abs(bgm.currentTime - position) > 2)
    bgm.currentTime = Math.min(position, bgm.duration); }
let ytTrack = '';
function loadYouTube() {
    if (ytLoading)
        return;
    ytLoading = true;
    window.onYouTubeIframeAPIReady = () => {
        ytPlayer = new YT.Player('youtube-player', { width: '100%', height: '215', playerVars: { origin: location.origin, playsinline: 1 }, events: { onReady: () => { ytReady = true; musicKey = ''; updateMusic(); }, onError: (e) => { $('#youtube-message').textContent = `再生エラー（${e.data}）。埋め込み可能な動画に変更するか、YouTubeで確認してください。`; }, onAutoplayBlocked: () => { $('#youtube-message').textContent = '自動再生が制限されました。プレイヤーの再生ボタンを押してください。'; }, onStateChange: (e) => { if (youtubeClosed) {
                    if (e.data === 1 || e.data === 3)
                        ytPlayer.pauseVideo();
                    return;
                } if (e.data === 0 && room?.music.loop && room.music.source === 'youtube' && audioEnabled && prefs.bgmOn) {
                    ytPlayer.seekTo(0);
                    ytPlayer.playVideo();
                } } } });
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { ytLoading = false; $('#youtube-message').textContent = 'YouTubeに接続できません。ネットワークを確認してください。'; };
    document.head.append(script);
}
function applyYouTube() {
    if (youtubeClosed) {
        ytPlayer.pauseVideo();
        return;
    }
    const m = room.music, key = m.source + ':' + m.id;
    if (ytTrack !== key) {
        ytTrack = key;
        $('#youtube-message').textContent = '再生されない場合はプレイヤーの再生ボタンを押してください。';
        if (m.source === 'youtube_playlist')
            ytPlayer.cuePlaylist({ list: m.id, listType: 'playlist' });
        else
            ytPlayer.cueVideoById(m.id);
    }
    if (m.source === 'youtube_playlist')
        ytPlayer.setLoop(m.loop);
    updateVolume();
    if (m.playback_state === 'playing' && audioEnabled && prefs.bgmOn)
        ytPlayer.playVideo();
    else if (m.playback_state === 'stopped')
        ytPlayer.stopVideo();
    else
        ytPlayer.pauseVideo();
}
async function copyInvite() { const invite = await api(`/api/rooms/${room.code}/invite`, undefined, 'GET'); const text = invite.url; try {
    await navigator.clipboard.writeText(text);
    toast(invite.public ? '遠隔参加用の招待リンクをコピーしました' : '招待リンクをコピーしました');
}
catch {
    modal(`<h2 class="dialog-title">招待リンク</h2><input readonly value="${esc(text)}" aria-label="コピー用の招待URL"><p class="subtext">URLを選択してコピーしてください。</p>`);
} }
document.addEventListener('click', async (e) => {
    const target = e.target.closest('button,[data-tab],[data-action]');
    if (!target)
        return;
    if (target.tagName === 'A' && target.dataset.action)
        e.preventDefault();
    const d = target.dataset;
    try {
        if (d.reaction) {
            const button = target;
            button.disabled = true;
            try {
                showReaction(await api(`/api/rooms/${session.code}/reactions`, { kind: d.reaction }));
            }
            finally {
                setTimeout(() => button.disabled = false, 1000);
            }
            return;
        }
        if (d.tab) {
            tab = d.tab;
            render();
            return;
        }
        if (d.entry) {
            entryMode = d.entry;
            render();
            return;
        }
        if (d.setup) {
            setupMode = d.setup;
            selectedQuestion = null;
            render();
            return;
        }
        if (d.choice) {
            selectedQuestion = room.round.preset_choices?.find(q => q.id === d.choice);
            if (!selectedQuestion)
                throw new Error('候補が変わりました。もう一度選んでください。');
            setupMode = 'preset';
            render();
            return;
        }
        if (d.pick) {
            selectedQuestion = questions.find(q => q.id === d.pick);
            tab = 'play';
            render();
            return;
        }
        if (d.edit) {
            presetModal(questions.find(q => q.id === d.edit));
            return;
        }
        if (d.delete) {
            modal(`<h2 class="dialog-title">この問題を削除しますか？</h2><p class="subtext">${esc(questions.find(q => q.id === d.delete)?.text)}</p><button class="btn danger full" style="margin-top:20px" data-action="delete-confirm" data-id="${esc(d.delete)}">削除する</button>`);
            return;
        }
        if (d.track) {
            await act('music/select', { source: 'local', id: d.track });
            $('#modal').close();
            return;
        }
        const action = d.action;
        if (!action)
            return;
        if (action === 'enable-audio') {
            await enableAudio();
            return;
        }
        if (action === 'audio-settings') {
            audioSettings();
            return;
        }
        if (action === 'youtube-close') {
            setYouTubeClosed(true);
            return;
        }
        if (action === 'youtube-open') {
            setYouTubeClosed(false);
            return;
        }
        if (action === 'copy') {
            await copyInvite();
            return;
        }
        if (action === 'leave') {
            leaveRoom();
            return;
        }
        if (action === 'kick') {
            const p = player(d.player);
            if (!p)
                return;
            modal(`<h2 class="dialog-title">${esc(p.nickname)}さんをキックしますか？</h2><p class="subtext">ルームから退出させます。過去の得点・履歴は残し、未公開ラウンドの回答は対象から外します。</p><button class="btn danger full" style="margin-top:20px" data-action="kick-confirm" data-player="${esc(p.id)}">この人を退出させる</button>`);
            return;
        }
        if (action === 'kick-confirm') {
            await act('players/kick', { player_id: d.player });
            $('#modal').close();
            return;
        }
        if (action === 'proxy-toggle') {
            await act('questions/proxy', { round_id: room.round.id, enabled: !room.round.host_proxy });
            return;
        }
        if (action === 'random') {
            const button = target;
            button.disabled = true;
            try {
                await act('questions/redraw', { round_id: room.round.id });
            }
            finally {
                button.disabled = false;
            }
            return;
        }
        if (action === 'pick-reset') {
            selectedQuestion = null;
            setupMode = 'preset';
            render();
            return;
        }
        if (action === 'correction') {
            correctionModal();
            return;
        }
        if (action === 'preset-new') {
            presetModal();
            return;
        }
        if (action === 'delete-confirm') {
            await act('presets/delete', { id: d.id });
            questions = await api('/api/questions', undefined, 'GET');
            $('#modal').close();
            render();
            toast('問題を削除しました');
            return;
        }
        if (action === 'export') {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' }));
            a.download = 'sense-questions.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            return;
        }
        if (action === 'import') {
            modal('<h2 class="dialog-title">問題をJSONから読み込む</h2><p class="subtext">最大400問。問題オブジェクトの配列を指定してください。</p><input id="preset-import" type="file" accept=".json" aria-label="問題JSONファイル" style="margin-top:22px">');
            return;
        }
        if (action === 'music-settings') {
            musicSettings();
            return;
        }
        if (action === 'music-none') {
            await act('music/select', { source: 'none' });
            $('#modal').close();
            return;
        }
        if (action.startsWith('music-')) {
            await act('music/control', { control: action.slice(6) });
            return;
        }
        if (action === 'reveal-hold') {
            await act('reveal/hold', { round_id: room.round.id });
            return;
        }
        if (action === 'allow') {
            await act('answers/allow', { player_id: d.player });
            return;
        }
        if (action === 'edit-allow') {
            await act('answers/edit-allow', { player_id: d.player });
            return;
        }
        if (action === 'reopen') {
            await act('answers/reopen', { seconds: Number(d.seconds) });
            return;
        }
        if (action === 'extend' || action === 'extend-custom') {
            await act('timer/extend', { seconds: Number(d.seconds || $('#extra-seconds')?.value) });
            return;
        }
        if (action === 'pause' || action === 'resume') {
            await act(`timer/${action}`);
            return;
        }
        const button = target;
        button.disabled = true;
        try {
            await act(action);
        }
        finally {
            button.disabled = false;
        }
    }
    catch (err) {
        toast(err.message);
    }
});
document.addEventListener('submit', async (e) => {
    const form = e.target;
    e.preventDefault();
    const data = new FormData(form), button = form.querySelector('button[type=submit]');
    if (button)
        button.disabled = true;
    try {
        if (form.id === 'entry-form') {
            const code = String(data.get('code') || '');
            const saved = entryMode === 'join' ? localStorage.getItem(`sense:room:${code}`) : null;
            const result = saved ? JSON.parse(saved) : await api(entryMode === 'create' ? '/api/rooms' : `/api/rooms/${code}/join`, { nickname: data.get('nickname') });
            persistSession(result);
            await connect(result);
        }
        else if (form.id === 'presenter-form') {
            await act('presenter', { round_id: room.round.id, player_id: data.get('player_id') });
        }
        else if (form.id === 'settings-form') {
            const values = {};
            for (const [key, value] of data.entries()) {
                if (key === 'custom_time')
                    continue;
                values[key] = ['mode', 'presenter_mode'].includes(key) ? value : key === 'presenter_answers' ? value === 'true' : Number(value);
            }
            values.allow_repeat = data.get('allow_repeat') === 'on';
            values.debug_mode = data.get('debug_mode') === 'on';
            values.auto_reveal = data.get('auto_reveal') === 'on';
            if (data.get('custom_time'))
                values.time_limit = Number(data.get('custom_time'));
            await api(`/api/rooms/${session.code}/settings`, values, 'PATCH');
            toast('ゲーム設定を保存しました');
        }
        else if (form.id === 'publish-form') {
            await act('questions', formQuestion(form));
        }
        else if (form.id === 'answer-form') {
            await act('answers', { round_id: room.round.id, value: data.get('value') });
            sound('confirm');
        }
        else if (form.id === 'correction-form') {
            await act('answers/correction', Object.fromEntries(data));
            $('#modal').close();
        }
        else if (form.id === 'preset-form') {
            await act('presets/save', formQuestion(form));
            questions = await api('/api/questions', undefined, 'GET');
            $('#modal').close();
            render();
            toast('問題を保存しました');
        }
        else if (form.id === 'youtube-form') {
            await act('music/select', { source: 'youtube', url: data.get('url') });
            $('#modal').close();
        }
        else if (form.id === 'phase-music-form') {
            const m = room.music;
            if (m.source === 'none')
                throw new Error('先に音源を選択してください。');
            await act('music/select', m.source === 'local' ? { source: 'local', id: m.id, phase: data.get('phase') } : { source: 'youtube', url: m.source === 'youtube' ? `https://www.youtube.com/watch?v=${m.id}` : `https://www.youtube.com/playlist?list=${m.id}`, phase: data.get('phase') });
            toast('場面ごとのBGMを設定しました');
        }
    }
    catch (err) {
        toast(err.message);
    }
    finally {
        if (button)
            button.disabled = false;
    }
});
document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.volume) {
        prefs[t.dataset.volume] = Number(t.value) / 100;
        $(`#value-${t.dataset.volume}`).textContent = t.value + '%';
        localStorage.setItem('sense:audio', JSON.stringify(prefs));
        updateVolume();
    }
    if (t.id === 'library-search') {
        librarySearch = t.value;
        render();
    }
});
document.addEventListener('change', async (e) => {
    const t = e.target;
    try {
        if (t.dataset.audioToggle) {
            prefs[t.dataset.audioToggle] = t.checked;
            localStorage.setItem('sense:audio', JSON.stringify(prefs));
            musicKey = '';
            updateMusic();
        }
        if (t.id === 'question-person' && selectedQuestion) {
            const target = player(t.value);
            if (target)
                $('#question-text').value = selectedQuestion.text.replaceAll('{name}', target.nickname);
        }
        if (t.id === 'library-category') {
            libraryCategory = t.value;
            render();
        }
        if (t.id === 'music-loop')
            await act('music/control', { control: 'loop', loop: t.checked });
        if (t.id === 'music-upload' && t.files?.[0]) {
            const file = t.files[0];
            if (file.size > 30 * 1024 * 1024)
                throw new Error('音源の上限は30MBです。');
            const res = await fetch(`/api/rooms/${session.code}/music/upload`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'X-File-Extension': file.name.split('.').pop(), 'X-File-Name': encodeURIComponent(file.name) }, body: file });
            const result = await res.json();
            if (!res.ok)
                throw new Error(result.detail);
            await act('music/select', { source: 'local', id: result.id });
            $('#modal').close();
            toast('BGM音源を登録しました');
        }
        if (t.id === 'preset-import' && t.files?.[0]) {
            if (t.files[0].size > 1024 * 1024)
                throw new Error('JSONの上限は1MBです。');
            await act('presets/import', { questions: JSON.parse(await t.files[0].text()) });
            questions = await api('/api/questions', undefined, 'GET');
            $('#modal').close();
            render();
            toast('問題を読み込みました');
        }
    }
    catch (err) {
        toast(err.message);
    }
});
$('#close-modal').onclick = () => $('#modal').close();
$('#help-button').onclick = rules;
$('#rules-button').onclick = rules;
$('#sound-button').onclick = audioSettings;
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) {
    const rect = $('#modal').getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        $('#modal').close();
} });
$('#round-intro').addEventListener('cancel', e => e.preventDefault());
setInterval(timerTick, 150);
setInterval(() => { if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: 'ping', client_time: performance.now() })); }, 3000);
bgm.onerror = () => toast('音源を再生できません。対応する形式か確認してください。');
async function init() {
    try {
        questions = await api('/api/questions', undefined, 'GET');
    }
    catch {
        toast('サーバーへ接続できません。');
    }
    render();
    const code = new URLSearchParams(location.search).get('room') || localStorage.getItem('sense:current');
    if (code) {
        try {
            const saved = localStorage.getItem(`sense:room:${code}`);
            if (saved) {
                await connect(JSON.parse(saved));
                history.replaceState(null, '', `/?room=${code}`);
            }
        }
        catch (err) {
            room = null;
            session = null;
            render();
            toast(err.message);
        }
    }
}
init();
