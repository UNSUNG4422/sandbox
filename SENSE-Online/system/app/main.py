import asyncio
import copy
import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .scoring import number, score
from .store import Store
from .presets import draw_choices, seed_library

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.getenv('QUIZ_DATA_DIR', ROOT / 'data'))
RUNTIME = Path(os.getenv('QUIZ_RUNTIME_DIR', ROOT / '.runtime'))
DATA.mkdir(parents=True, exist_ok=True)
(DATA / 'uploads').mkdir(exist_ok=True)
store = Store(DATA / 'quiz.sqlite3')
rooms = store.all_rooms()
lock = asyncio.Lock()
sockets = defaultdict(dict)
attempts = defaultdict(deque)
reaction_times = {}
ROUND_INTRO_SECONDS = 3
REACTIONS = {'good': '👍', 'surprise': '😲', 'joy': '😄', 'heart': '❤️', 'sad': '😢', 'angry': '😠'}
BGM_ROOT = ROOT / 'static' / 'bgm'
BUILTIN_TRACKS = json.loads((BGM_ROOT / 'tracks.json').read_text(encoding='utf-8'))
DEFAULT = dict(mode='median', presenter_mode='rotation', presenter_answers=True,
               rounds=0, rounds_per_player=2, time_limit=0, correct_score=100,
               min_penalty=-50, max_penalty=-50, allow_repeat=False, debug_mode=False,
               auto_reveal=False, auto_reveal_delay=5)
seed_library(store)


def fail(message, status=400):
    raise HTTPException(status, message)


def get_room(code):
    if code not in rooms:
        fail('ルームが見つかりません。', 404)
    return rooms[code]


def auth(room, token, host=False):
    pid = store.identify(token or '', room['code'])
    if not pid or pid not in room['players']:
        fail('参加し直してください。', 401)
    if room['players'][pid].get('kicked', False):
        fail(dict(code='PLAYER_KICKED', message='主催者によってルームから退出しました。'), 403)
    if host and pid != room['host_id']:
        fail('主催者のみ操作できます。', 403)
    return pid


def log(room, pid, action, detail):
    room['administrative_action_log'].append(dict(at=time.time(), actor=pid, action=action, detail=detail,
                                                round_id=room['round']['id'] if room['round'] else None))


def expire(room):
    rd = room.get('round')
    if room['state'] == 'ANSWERING' and rd and not rd['timer_paused'] and rd['timer_deadline'] is not None:
        if time.time() >= rd['timer_deadline']:
            room['state'] = 'CLOSED_PENDING_REVEAL'
            rd['allowed_late_player_ids'] = []
            return True
    return False


def reveal_round(room):
    rd = room['round']
    apply_grade(room)
    room['state'] = 'RESULT'
    rd['allowed_late_player_ids'], rd['correction_allowed_ids'] = [], []
    rd['auto_reveal_deadline'] = None
    rd['finished_at'] = time.time()
    phase_music(room, 'result')


def update_auto_reveal(room):
    rd = room.get('round')
    if not rd:
        return False
    ready = (room['state'] == 'CLOSED_PENDING_REVEAL'
             and (rd.get('settings') or {}).get('auto_reveal', False)
             and not rd.get('auto_reveal_held', False)
             and bool(rd['eligible_ids'])
             and all(pid in rd['answers'] for pid in rd['eligible_ids'])
             and not rd['correction_allowed_ids'])
    if not ready:
        rd['auto_reveal_deadline'] = None
        return False
    if rd.get('auto_reveal_deadline') is None:
        rd['auto_reveal_deadline'] = time.time() + rd['settings'].get('auto_reveal_delay', 5)
    if time.time() >= rd['auto_reveal_deadline']:
        log(room, None, 'AUTO_REVEAL', dict(delay=rd['settings'].get('auto_reveal_delay', 5)))
        reveal_round(room)
        return True
    return False


def advance(room):
    event = 'TIME_UP' if expire(room) else None
    previous = (room.get('round') or {}).get('auto_reveal_deadline')
    if update_auto_reveal(room):
        return 'ROUND_REVEALED'
    if (room.get('round') or {}).get('auto_reveal_deadline') != previous:
        event = 'AUTO_REVEAL_SCHEDULED'
    return event


def can_present(room, pid):
    rd = room.get('round')
    return bool(rd and rd['presenter_id'] and
                (pid == rd['presenter_id'] or (pid == room['host_id'] and rd.get('host_proxy', False))))


def close_if_complete(room):
    rd = room['round']
    if rd['eligible_ids'] and all(p in rd['answers'] for p in rd['eligible_ids']) and not rd['correction_allowed_ids']:
        room['state'] = 'CLOSED_PENDING_REVEAL'
        rd['allowed_late_player_ids'] = []
        return True
    return False


def view(room, pid):
    result = copy.deepcopy(room)
    result['server_time'] = time.time()
    result['me'] = pid
    result['is_host'] = pid == room['host_id']
    result['tracks'] = BUILTIN_TRACKS + room.get('tracks', [])
    result['players'] = [dict(p, connected=not p.get('kicked', False) and bool(sockets[room['code']].get(p['id'])))
                         for p in room['players'].values()]
    rd = result['round']
    if rd and (room['state'] != 'QUESTION_SETUP' or not can_present(room, pid)):
        rd.pop('preset_choices', None)
    if rd and room['state'] not in ('RESULT', 'FINISHED'):
        rd['submitted_ids'] = list(rd['answers'])
        rd['own_answer'] = rd['answers'].get(pid)
        rd['answers'] = {}
        rd['result'] = None
    elif rd:
        rd['submitted_ids'] = list(rd['answers'])
        rd['own_answer'] = rd['answers'].get(pid)
    return result


async def broadcast(room, event):
    room['event_id'] += 1
    room['last_event'] = event
    store.save(room)
    for pid, connections in list(sockets[room['code']].items()):
        for ws in list(connections):
            try:
                if room['players'][pid].get('kicked', False):
                    await asyncio.wait_for(ws.send_json(dict(type='kicked', message='主催者によってルームから退出しました。')), timeout=2)
                    await asyncio.wait_for(ws.close(code=1008), timeout=2)
                    connections.discard(ws)
                    continue
                await asyncio.wait_for(ws.send_json(view(room, pid)), timeout=2)
            except Exception:
                connections.discard(ws)


async def ticker():
    while True:
        await asyncio.sleep(.2)
        async with lock:
            for room in list(rooms.values()):
                event = advance(room)
                if event:
                    await broadcast(room, event)


@asynccontextmanager
async def lifespan(app):
    for room in rooms.values():
        room['settings'] = dict(DEFAULT, **room['settings'])
        rd = room.get('round')
        if rd:
            if rd.get('settings'):
                rd['settings'] = dict(DEFAULT, **rd['settings'])
            rd.setdefault('auto_reveal_deadline', None)
            rd.setdefault('auto_reveal_held', False)
            rd.setdefault('host_proxy', False)
            rd.setdefault('intro_until', None)
            rd.setdefault('intro_duration', 0)
        if room['state'] == 'QUESTION_SETUP' and 'preset_choices' not in room['round']:
            refresh_choices(room)
        store.save(room)
    task = asyncio.create_task(ticker())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title='SENSE — オンライン数値感覚クイズ', lifespan=lifespan)


@app.get('/api/health')
def health():
    return {'service': 'SENSE', 'version': '1.1.0', 'sharing_supported': True, 'installation_id': os.getenv('QUIZ_INSTALLATION_ID', '')}


@app.get('/api/rooms/{code}/invite')
def invite(code: str, request: Request):
    auth(get_room(code), request.headers.get('authorization', '').removeprefix('Bearer '))
    base = str(request.base_url).rstrip('/')
    public = False
    try:
        shared = json.loads((RUNTIME / 'tunnel.json').read_text(encoding='utf-8-sig'))
        candidate = shared.get('url', '')
        if isinstance(candidate, str) and re.fullmatch(r'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com', candidate):
            base, public = candidate, True
    except (OSError, ValueError, TypeError, AttributeError):
        pass
    return {'url': f'{base}/?room={code}', 'public': public}


def nickname(value):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 20:
        fail('ニックネームは1〜20文字で入力してください。')
    return value.strip()


def integer(value, lo, hi, title):
    if isinstance(value, bool) or not isinstance(value, int) or not lo <= value <= hi:
        fail(f'{title}は{lo}〜{hi}の整数で指定してください。')
    return value


def settings_update(old, data):
    settings = dict(old)
    for key, value in data.items():
        if key in ('mode', 'presenter_mode'):
            options = ('median', 'mean') if key == 'mode' else ('rotation', 'host', 'manual')
            if value not in options:
                fail('設定値が不正です。')
        elif key in ('presenter_answers', 'allow_repeat', 'debug_mode', 'auto_reveal'):
            if not isinstance(value, bool):
                fail('設定値が不正です。')
        elif key in ('rounds', 'rounds_per_player', 'time_limit'):
            integer(value, 0, 86400, key)
        elif key == 'auto_reveal_delay':
            integer(value, 0, 3600, '自動公開までの秒数')
        elif key in ('correct_score', 'min_penalty', 'max_penalty'):
            integer(value, -100000, 100000, key)
        else:
            fail('不明な設定項目です。')
        settings[key] = value
    return settings


def question(data):
    text = data.get('text', '').strip() if isinstance(data.get('text'), str) else ''
    if not 1 <= len(text) <= 500:
        fail('問題文は1〜500文字で入力してください。')
    q = dict(id=str(data.get('id') or secrets.token_hex(8)), text=text,
             category=str(data.get('category', 'その他'))[:40], unit=str(data.get('unit', ''))[:20],
             allow_decimal=data.get('allow_decimal') is True, source_type=data.get('source_type', 'custom'),
             min_value=None, max_value=None)
    for key in ('min_value', 'max_value'):
        if data.get(key) not in (None, ''):
            try:
                q[key] = number(data[key], {'allow_decimal': True})
            except ValueError as e:
                fail(str(e))
    if q['min_value'] is not None and q['max_value'] is not None:
        from decimal import Decimal
        if Decimal(q['min_value']) > Decimal(q['max_value']):
            fail('下限は上限以下にしてください。')
    return q


@app.post('/api/rooms')
async def create(request: Request):
    data = await request.json()
    name = nickname(data.get('nickname'))
    async with lock:
        code = str(secrets.randbelow(900000) + 100000)
        while code in rooms:
            code = str(secrets.randbelow(900000) + 100000)
        pid, token = secrets.token_hex(8), secrets.token_urlsafe(32)
        room = dict(code=code, host_id=pid, state='LOBBY', settings=dict(DEFAULT), round=None,
                    players={pid: dict(id=pid, nickname=name, total_score=0, active=True)}, history=[],
                    round_number=0, event_id=0, last_event='ROOM_CREATED', score_revision=0,
                    music=dict(source='none', id='', name='BGMを選択してください', playback_state='stopped',
                               started_at=None, position=0, loop=True, phase_tracks={}),
                    administrative_action_log=[], created_at=time.time())
        rooms[code] = room
        store.save(room, (token, pid))
        return dict(code=code, token=token, player_id=pid)


@app.post('/api/rooms/{code}/join')
async def join(code: str, request: Request):
    key = request.client.host if request.client else 'unknown'
    queue = attempts[key]
    now = time.time()
    while queue and queue[0] < now - 60:
        queue.popleft()
    if len(queue) >= 30:
        fail('参加の試行回数が多すぎます。1分後にお試しください。', 429)
    queue.append(now)
    data = await request.json()
    async with lock:
        room = get_room(code)
        if room['state'] != 'LOBBY':
            fail('新規参加はロビーで受け付けています。')
        name = nickname(data.get('nickname'))
        if len([p for p in room['players'].values() if not p.get('kicked', False)]) >= 10:
            fail('このルームは満員です。')
        if any(p['nickname'].casefold() == name.casefold() for p in room['players'].values() if not p.get('kicked', False)):
            fail('この名前は使用されています。')
        pid, token = secrets.token_hex(8), secrets.token_urlsafe(32)
        room['players'][pid] = dict(id=pid, nickname=name, total_score=0, active=True)
        store.save(room, (token, pid))
        await broadcast(room, 'PLAYER_JOINED')
        return dict(code=code, token=token, player_id=pid)


@app.get('/api/rooms/{code}/state')
async def state(code: str, request: Request):
    async with lock:
        room = get_room(code)
        pid = auth(room, request.headers.get('authorization', '').removeprefix('Bearer '))
        event = advance(room)
        if event:
            await broadcast(room, event)
        return view(room, pid)


@app.get('/api/rooms/{code}/scores')
async def scores(code: str, request: Request):
    room = get_room(code)
    auth(room, request.headers.get('authorization', '').removeprefix('Bearer '))
    return sorted(room['players'].values(), key=lambda p: -p['total_score'])


@app.get('/api/questions')
async def presets():
    return store.questions()


def initial_presenter(room):
    mode = room['settings']['presenter_mode']
    if mode == 'manual':
        return None
    if mode == 'host':
        return room['host_id']
    active = [p['id'] for p in room['players'].values() if p['active']]
    return active[(room['round_number'] - 1) % len(active)]


def prepare(room):
    active = [p['id'] for p in room['players'].values() if p['active']]
    minimum = 1 if room['settings'].get('debug_mode', False) else 3
    if len(active) < minimum:
        fail(f'有効な参加者が{minimum}人以上必要です。')
    room['round_number'] += 1
    presenter = initial_presenter(room)
    room['state'] = 'QUESTION_SETUP'
    room['round'] = dict(id=secrets.token_hex(8), number=room['round_number'], presenter_id=presenter,
                         question=None, settings=None, eligible_ids=[], answers={}, result=None,
                         timer_deadline=None, timer_paused=False, timer_remaining_on_pause=None,
                         timer_total=0, allowed_late_player_ids=[], correction_allowed_ids=[], started_at=None,
                         auto_reveal_deadline=None, auto_reveal_held=False, host_proxy=False,
                         intro_until=None, intro_duration=0)
    announce_presenter(room)
    refresh_choices(room)


def announce_presenter(room):
    rd = room['round']
    rd['intro_duration'] = ROUND_INTRO_SECONDS if rd['presenter_id'] else 0
    rd['intro_until'] = time.time() + rd['intro_duration'] if rd['intro_duration'] else None


def require_intro_finished(rd):
    if rd.get('intro_until') is not None and time.time() < rd['intro_until']:
        fail('ターンと出題者を案内しています。まもなく問題選択に進みます。', 409)


def refresh_choices(room):
    rd = room['round']
    used = [] if room['settings']['allow_repeat'] else [h['question']['id'] for h in room['history']]
    rd['preset_choices'] = draw_choices(store.questions(), used, rd.get('preset_choices', []))
    rd['choices_revision'] = rd.get('choices_revision', 0) + 1


def phase_music(room, phase):
    track = room['music'].get('phase_tracks', {}).get(phase)
    if track:
        room['music'].update(track, playback_state='playing', started_at=time.time(), position=0)


def apply_grade(room):
    rd = room['round']
    old = (rd['result'] or {}).get('deltas', {})
    result = score(rd['answers'], rd['settings'])
    for pid, player in room['players'].items():
        player['total_score'] += result['deltas'].get(pid, 0) - old.get(pid, 0)
    rd['result'] = result
    room['score_revision'] += 1
    rd['score_revision'] = room['score_revision']
    for i, previous in enumerate(room['history']):
        if previous['id'] == rd['id']:
            room['history'][i] = copy.deepcopy(rd)


def parse_youtube(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'):
        fail('YouTubeのHTTPS URLを指定してください。')
    query = parse_qs(parsed.query)
    playlist = query.get('list', [''])[0]
    video = parsed.path.strip('/') if parsed.hostname == 'youtu.be' else query.get('v', [''])[0]
    if parsed.path.startswith(('/shorts/', '/embed/')):
        video = parsed.path.split('/')[2]
    if playlist and re.fullmatch(r'[A-Za-z0-9_-]{10,100}', playlist):
        return 'youtube_playlist', playlist
    if re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
        return 'youtube', video
    fail('動画またはプレイリストのURLを確認してください。')


@app.patch('/api/rooms/{code}/settings')
async def settings(code: str, request: Request):
    data = await request.json()
    async with lock:
        room = get_room(code)
        auth(room, request.headers.get('authorization', '').removeprefix('Bearer '), True)
        if room['state'] not in ('LOBBY', 'QUESTION_SETUP'):
            fail('問題公開後は設定を変更できません。')
        previous_mode = room['settings']['presenter_mode']
        previous_repeat = room['settings']['allow_repeat']
        room['settings'] = settings_update(room['settings'], data)
        if room['state'] == 'QUESTION_SETUP' and previous_mode != room['settings']['presenter_mode']:
            previous_presenter = room['round']['presenter_id']
            room['round']['presenter_id'] = initial_presenter(room)
            room['round']['host_proxy'] = False
            if previous_presenter != room['round']['presenter_id']:
                announce_presenter(room)
        if room['state'] == 'QUESTION_SETUP' and previous_repeat != room['settings']['allow_repeat']:
            refresh_choices(room)
        await broadcast(room, 'SETTINGS_UPDATED')
        return {'ok': True}


@app.post('/api/rooms/{code}/music/upload')
async def upload(code: str, request: Request):
    room = get_room(code)
    pid = auth(room, request.headers.get('authorization', '').removeprefix('Bearer '), True)
    ext = request.headers.get('x-file-extension', '').lower()
    if ext not in ('mp3', 'wav', 'ogg'):
        fail('MP3・WAV・OGGを選択してください。')
    filename = secrets.token_hex(16) + '.' + ext
    path, size = DATA / 'uploads' / filename, 0
    try:
        with path.open('wb') as out:
            async for chunk in request.stream():
                size += len(chunk)
                if size > 30 * 1024 * 1024:
                    fail('音源の上限は30MBです。', 413)
                out.write(chunk)
        with path.open('rb') as audio_file:
            header = audio_file.read(12)
        valid = (ext == 'wav' and header[:4] == b'RIFF' and header[8:12] == b'WAVE') or (ext == 'ogg' and header[:4] == b'OggS') or (ext == 'mp3' and (header[:3] == b'ID3' or (len(header) >= 2 and header[0] == 255 and header[1] & 224 == 224)))
        if not valid:
            fail('音声ファイルの形式を確認してください。')
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    async with lock:
        room.setdefault('tracks', []).append(dict(source='local', id=filename, name=unquote(request.headers.get('x-file-name', '音源'))[:100]))
        log(room, pid, 'MUSIC_UPLOAD', {'id': filename})
        await broadcast(room, 'MUSIC_UPDATED')
    return {'id': filename}


@app.get('/api/rooms/{code}/music/files/{filename}')
async def music_file(code: str, filename: str, token: str = ''):
    room = get_room(code)
    auth(room, token)
    builtin = any(t['id'] == filename for t in BUILTIN_TRACKS)
    if not builtin and not any(t['id'] == filename for t in room.get('tracks', [])):
        fail('音源がありません。', 404)
    path = BGM_ROOT / filename if builtin else DATA / 'uploads' / filename
    return FileResponse(path)


@app.post('/api/rooms/{code}/reactions')
async def reaction(code: str, request: Request):
    data = await request.json()
    if not isinstance(data, dict) or not isinstance(data.get('kind'), str) or data['kind'] not in REACTIONS:
        fail('リアクションを選んでください。')
    async with lock:
        room = get_room(code)
        pid = auth(room, request.headers.get('authorization', '').removeprefix('Bearer '))
        now = time.monotonic()
        key = (code, pid)
        if key in reaction_times and now - reaction_times[key] < 1:
            fail('リアクションは1秒ほど間を空けて送ってください。', 429)
        reaction_times[key] = now
        message = dict(type='reaction', code=code, id=secrets.token_hex(8), player_id=pid,
                       nickname=room['players'][pid]['nickname'], kind=data['kind'], emoji=REACTIONS[data['kind']])
        for target, connections in list(sockets[code].items()):
            if room['players'][target].get('kicked', False):
                continue
            for ws in list(connections):
                try:
                    await asyncio.wait_for(ws.send_json(message), timeout=2)
                except Exception:
                    connections.discard(ws)
        return message


@app.post('/api/rooms/{code}/{action:path}')
async def action(code: str, action: str, request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    if not isinstance(data, dict):
        fail('JSONオブジェクトを指定してください。')
    async with lock:
        original = get_room(code)
        pid = auth(original, request.headers.get('authorization', '').removeprefix('Bearer '), action not in ('answers', 'questions', 'questions/redraw'))
        timed_event = advance(original)
        if timed_event:
            await broadcast(original, timed_event)
        room = copy.deepcopy(original)
        rd, status = room['round'], room['state']
        event = action.upper().replace('/', '_')
        if action == 'start':
            if status not in ('LOBBY', 'FINISHED'):
                fail('ロビーから開始してください。')
            room['history'], room['round_number'] = [], 0
            for p in room['players'].values():
                p['total_score'] = 0
            prepare(room)
            room['round_limit'] = room['settings']['rounds'] or len([p for p in room['players'].values() if p['active']]) * room['settings']['rounds_per_player']
            event = 'GAME_STARTED'
        elif action == 'presenter':
            if status != 'QUESTION_SETUP' or room['settings']['presenter_mode'] != 'manual':
                fail('自由に指名する設定で、問題公開前に出題者を選んでください。')
            if data.get('round_id') != rd['id']:
                fail('ラウンドが切り替わりました。画面を更新してください。', 409)
            target = data.get('player_id')
            if not isinstance(target, str) or target not in room['players'] or not room['players'][target]['active']:
                fail('参加中のプレイヤーから出題者を選んでください。')
            log(room, pid, 'PRESENTER_SELECTED', dict(before=rd['presenter_id'], after=target))
            previous_presenter = rd['presenter_id']
            rd['presenter_id'], event = target, 'PRESENTER_SELECTED'
            rd['host_proxy'] = False
            if previous_presenter != target:
                announce_presenter(room)
        elif action == 'questions/proxy':
            if status != 'QUESTION_SETUP' or not rd['presenter_id'] or rd['presenter_id'] == room['host_id']:
                fail('他の参加者の問題準備中に代理出題へ切り替えられます。')
            if data.get('round_id') != rd['id']:
                fail('ラウンドが切り替わりました。画面を更新してください。', 409)
            if not isinstance(data.get('enabled'), bool):
                fail('代理出題の設定値が不正です。')
            rd['host_proxy'] = data['enabled']
            event = 'PRESENTER_PROXY_UPDATED'
        elif action == 'questions/redraw':
            if not can_present(room, pid):
                fail('出題者または主催者のみ引き直せます。', 403)
            if status != 'QUESTION_SETUP':
                fail('問題準備中に引き直してください。')
            if data.get('round_id') != rd['id']:
                fail('ラウンドが切り替わりました。画面を更新してください。', 409)
            require_intro_finished(rd)
            refresh_choices(room)
            event = 'QUESTION_CHOICES_UPDATED'
        elif action == 'questions':
            if pid == room['host_id'] and status == 'QUESTION_SETUP' and not rd['presenter_id']:
                fail('主催者が今回の出題者を選んでから問題を公開してください。')
            if not can_present(room, pid):
                fail('出題者または主催者のみ公開できます。', 403)
            if status != 'QUESTION_SETUP':
                fail('問題準備中に公開してください。')
            if not rd['presenter_id'] or not room['players'][rd['presenter_id']]['active']:
                fail('主催者が今回の出題者を選んでから問題を公開してください。')
            require_intro_finished(rd)
            q = question(data)
            if '{name}' in q['text']:
                fail('個人の問題は、対象の名前を入れてから公開してください。')
            if not room['settings']['allow_repeat'] and q['id'] in [h['question']['id'] for h in room['history']]:
                fail('この問題は使用済みです。')
            rd['question'], rd['settings'] = q, dict(room['settings'])
            rd.pop('preset_choices', None)
            rd['eligible_ids'] = [p['id'] for p in room['players'].values() if p['active'] and (room['settings']['presenter_answers'] or p['id'] != rd['presenter_id'])]
            minimum = 1 if rd['settings'].get('debug_mode', False) else 3
            if len(rd['eligible_ids']) < minimum:
                fail(f'回答者が{minimum}人以上必要です。出題者の回答参加を有効にしてください。')
            rd['started_at'] = time.time()
            seconds = rd['settings']['time_limit']
            rd['timer_total'] = seconds
            rd['timer_deadline'] = time.time() + seconds if seconds else None
            room['state'], event = 'ANSWERING', 'QUESTION_PUBLISHED'
            phase_music(room, 'answering')
        elif action == 'answers':
            if not rd or data.get('round_id') != rd['id']:
                fail('ラウンドが切り替わりました。画面を更新してください。', 409)
            if pid not in rd['eligible_ids']:
                fail('このラウンドの回答対象ではありません。', 403)
            if status != 'ANSWERING' and not (status == 'CLOSED_PENDING_REVEAL' and pid in rd['allowed_late_player_ids']):
                fail('回答受付は終了しています。', 409)
            if pid in rd['answers'] and pid not in rd['correction_allowed_ids']:
                fail('回答は確定済みです。', 409)
            try:
                rd['answers'][pid] = number(data.get('value'), rd['question'])
            except ValueError as e:
                fail(str(e))
            for key in ('allowed_late_player_ids', 'correction_allowed_ids'):
                if pid in rd[key]:
                    rd[key].remove(pid)
            event = 'ANSWER_SUBMITTED'
            if close_if_complete(room):
                event = 'ANSWERS_CLOSED'
        elif action == 'close':
            if status != 'ANSWERING':
                fail('回答受付中に操作してください。')
            room['state'] = 'CLOSED_PENDING_REVEAL'
            rd['allowed_late_player_ids'] = []
            event = 'ANSWERS_CLOSED'
        elif action.startswith('timer/'):
            if status not in ('ANSWERING', 'CLOSED_PENDING_REVEAL'):
                fail('結果公開後はタイマーを変更できません。')
            operation = action.split('/')[1]
            if operation == 'extend':
                seconds = integer(data.get('seconds'), 1, 86400, '追加秒数')
                if status != 'ANSWERING':
                    fail('締切後は「全体の受付を再開」を使ってください。')
                if rd['timer_paused']:
                    rd['timer_remaining_on_pause'] += seconds
                elif rd['timer_deadline'] is not None:
                    rd['timer_deadline'] += seconds
                else:
                    rd['timer_deadline'] = time.time() + seconds
                rd['timer_total'] += seconds
            elif operation == 'pause':
                if status != 'ANSWERING' or rd['timer_paused'] or rd['timer_deadline'] is None:
                    fail('一時停止できるタイマーがありません。')
                rd['timer_remaining_on_pause'] = max(0, rd['timer_deadline'] - time.time())
                rd['timer_paused'], rd['timer_deadline'] = True, None
            elif operation == 'resume':
                if status != 'ANSWERING' or not rd['timer_paused']:
                    fail('タイマーは停止していません。')
                rd['timer_deadline'] = time.time() + rd['timer_remaining_on_pause']
                rd['timer_paused'], rd['timer_remaining_on_pause'] = False, None
            else:
                fail('操作がありません。', 404)
        elif action == 'answers/allow':
            if status != 'CLOSED_PENDING_REVEAL':
                fail('締切後・結果公開前に許可できます。')
            target = data.get('player_id')
            if target not in rd['eligible_ids'] or target in rd['answers']:
                fail('未回答のプレイヤーを指定してください。')
            if target not in rd['allowed_late_player_ids']:
                rd['allowed_late_player_ids'].append(target)
            event = 'ANSWER_REOPENED'
        elif action == 'answers/reopen':
            if status != 'CLOSED_PENDING_REVEAL':
                fail('結果公開前の締切済みラウンドのみ再開できます。')
            seconds = integer(data.get('seconds', 30), 0, 86400, '追加時間')
            rd.update(timer_deadline=time.time() + seconds if seconds else None, timer_total=seconds,
                      timer_paused=False, timer_remaining_on_pause=None, allowed_late_player_ids=[])
            room['state'], event = 'ANSWERING', 'ANSWER_REOPENED'
        elif action == 'answers/edit-allow':
            if status not in ('ANSWERING', 'CLOSED_PENDING_REVEAL'):
                fail('結果公開前のみ回答訂正を許可できます。')
            target = data.get('player_id')
            if target not in rd['answers']:
                fail('回答済みの人を選択してください。')
            if target not in rd['correction_allowed_ids']:
                rd['correction_allowed_ids'].append(target)
            if status == 'CLOSED_PENDING_REVEAL' and target not in rd['allowed_late_player_ids']:
                rd['allowed_late_player_ids'].append(target)
            event = 'ANSWER_REOPENED'
        elif action == 'reveal':
            if status != 'CLOSED_PENDING_REVEAL':
                fail('回答を締め切ってから結果を公開してください。')
            reveal_round(room)
            event = 'ROUND_REVEALED'
        elif action == 'reveal/hold':
            if status not in ('ANSWERING', 'CLOSED_PENDING_REVEAL') or not rd['settings'].get('auto_reveal', False):
                fail('自動公開が有効な進行中のラウンドで操作してください。')
            if data.get('round_id') != rd['id']:
                fail('ラウンドが切り替わりました。画面を更新してください。', 409)
            rd['auto_reveal_held'] = True
            event = 'AUTO_REVEAL_HELD'
        elif action == 'answers/correction':
            if status not in ('RESULT', 'FINISHED'):
                fail('採点訂正は結果公開後に行ってください。')
            reason = str(data.get('reason', '')).strip()
            if not 1 <= len(reason) <= 300:
                fail('訂正理由を1〜300文字で入力してください。')
            target = data.get('player_id')
            if target not in rd['eligible_ids']:
                fail('対象の回答者が見つかりません。')
            before = rd['answers'].get(target)
            try:
                after = number(data.get('value'), rd['question'])
            except ValueError as e:
                fail(str(e))
            rd['answers'][target] = after
            log(room, pid, 'SCORE_CORRECTION', dict(player_id=target, before=before, after=after, reason=reason))
            apply_grade(room)
            event = 'SCORE_CORRECTED'
        elif action == 'regrade':
            if status not in ('RESULT', 'FINISHED'):
                fail('結果公開後に再採点してください。')
            apply_grade(room)
            event = 'SCORE_CORRECTED'
        elif action == 'next':
            if status != 'RESULT':
                fail('結果公開後に次へ進めます。')
            room['history'].append(copy.deepcopy(rd))
            if room['round_limit'] and room['round_number'] >= room['round_limit']:
                room['state'], event = 'FINISHED', 'GAME_FINISHED'
                phase_music(room, 'finished')
            else:
                prepare(room)
                event = 'NEXT_ROUND'
        elif action == 'cancel':
            if status not in ('ANSWERING', 'CLOSED_PENDING_REVEAL'):
                fail('進行中のラウンドのみ中止できます。')
            rd['result'] = dict(cancelled=True, target=None, winners=[], deltas={}, reasons={})
            room['state'], event = 'RESULT', 'ROUND_CANCELLED'
        elif action == 'finish':
            if status not in ('RESULT', 'QUESTION_SETUP'):
                fail('進行中のラウンドを公開または中止してから終了してください。')
            room['state'], event = 'FINISHED', 'GAME_FINISHED'
            phase_music(room, 'finished')
        elif action == 'players/active':
            if status not in ('LOBBY', 'RESULT', 'QUESTION_SETUP'):
                fail('ラウンドの間に参加状態を変更できます。')
            target = data.get('player_id')
            if not isinstance(target, str) or target not in room['players'] or target == room['host_id'] or room['players'][target].get('kicked', False):
                fail('対象のプレイヤーが見つかりません。')
            room['players'][target]['active'] = data.get('active') is True
            if status == 'QUESTION_SETUP' and room['settings']['presenter_mode'] == 'manual' and rd['presenter_id'] == target and not room['players'][target]['active']:
                rd['presenter_id'] = None
                rd['host_proxy'] = False
                announce_presenter(room)
        elif action == 'players/kick':
            target = data.get('player_id')
            if not isinstance(target, str) or target not in room['players'] or target == room['host_id'] or room['players'][target].get('kicked', False):
                fail('退出させる参加者を選んでください。主催者自身はキックできません。')
            room['players'][target].update(active=False, kicked=True)
            if status == 'QUESTION_SETUP' and rd['presenter_id'] == target:
                rd['presenter_id'] = None if room['settings']['presenter_mode'] == 'manual' else room['host_id']
                rd['host_proxy'] = False
                announce_presenter(room)
                refresh_choices(room)
            if status in ('ANSWERING', 'CLOSED_PENDING_REVEAL'):
                rd['answers'].pop(target, None)
                for key in ('eligible_ids', 'allowed_late_player_ids', 'correction_allowed_ids'):
                    if target in rd[key]:
                        rd[key].remove(target)
                rd['auto_reveal_deadline'] = None
                close_if_complete(room)
            event = 'PLAYER_KICKED'
        elif action == 'presets/save':
            store.put_question(question(data))
        elif action == 'presets/delete':
            store.delete_question(str(data.get('id')))
        elif action == 'presets/import':
            items = data.get('questions')
            if not isinstance(items, list) or not 1 <= len(items) <= 400:
                fail('1〜400問の配列を指定してください。')
            questions = [question(item) for item in items]
            for item in questions:
                store.put_question(item)
        elif action == 'music/select':
            source = data.get('source')
            if source == 'local':
                track = next((t for t in BUILTIN_TRACKS + room.get('tracks', []) if t['id'] == data.get('id')), None)
                if not track:
                    fail('音源を登録してください。')
            elif source == 'youtube':
                source, ident = parse_youtube(str(data.get('url', '')))
                track = dict(source=source, id=ident, name='YouTube · ' + ident)
            elif source == 'none':
                track = dict(source='none', id='', name='BGMなし')
            else:
                fail('音源を選択してください。')
            phase = data.get('phase')
            if phase:
                if phase not in ('answering', 'result', 'finished'):
                    fail('BGMの切替場面が不正です。')
                room['music']['phase_tracks'][phase] = track
            else:
                room['music'].update(track, playback_state='stopped', position=0, started_at=None)
            event = 'MUSIC_UPDATED'
        elif action == 'music/control':
            control = data.get('control')
            music = room['music']
            if control == 'loop':
                music['loop'] = data.get('loop') is True
            elif control in ('play', 'pause', 'stop'):
                if music['playback_state'] == 'playing' and music['started_at'] is not None:
                    music['position'] += time.time() - music['started_at']
                music['playback_state'] = {'play': 'playing', 'pause': 'paused', 'stop': 'stopped'}[control]
                music['started_at'] = time.time() if control == 'play' else None
                if control == 'stop':
                    music['position'] = 0
            else:
                fail('再生操作が不正です。')
            event = 'MUSIC_UPDATED'
        else:
            fail('操作が見つかりません。', 404)
        if action != 'answers':
            log(room, pid, action, {k: v for k, v in data.items() if k not in ('questions',)})
        if update_auto_reveal(room):
            event = 'ROUND_REVEALED'
        store.save(room)
        rooms[code] = room
        await broadcast(room, event)
        return {'ok': True, 'event_id': room['event_id']}


@app.websocket('/ws/rooms/{code}')
async def websocket(ws: WebSocket, code: str):
    room = rooms.get(code)
    origin = ws.headers.get('origin')
    if origin and urlparse(origin).netloc != ws.headers.get('host'):
        await ws.close(code=1008)
        return
    await ws.accept()
    try:
        hello = await asyncio.wait_for(ws.receive_json(), 10)
        pid = auth(room, hello.get('token', '')) if room else None
        if not pid:
            await ws.close(code=1008)
            return
    except (HTTPException, asyncio.TimeoutError, WebSocketDisconnect):
        await ws.close(code=1008)
        return
    async with lock:
        room = get_room(code)
        connections = sockets[code].setdefault(pid, set())
        connections.add(ws)
        await broadcast(room, advance(room) or 'PLAYER_STATUS')
    try:
        while True:
            message = await ws.receive_json()
            if message.get('type') == 'ping':
                await ws.send_json(dict(type='pong', client_time=message.get('client_time'), server_time=time.time()))
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        async with lock:
            sockets[code].get(pid, set()).discard(ws)
            await broadcast(get_room(code), 'PLAYER_STATUS')


app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')


@app.get('/')
async def index():
    return FileResponse(ROOT / 'static' / 'index.html', headers={'Cache-Control': 'no-store'})
