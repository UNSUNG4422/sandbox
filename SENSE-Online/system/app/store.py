"""Durable atomic room snapshots; no tokens or connection state in room payloads."""
import hashlib
import json
import sqlite3
from pathlib import Path


class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, document TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, code TEXT, player_id TEXT);
            CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY, document TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        ''')
        self.db.commit()

    def all_rooms(self):
        return {code: json.loads(doc) for code, doc in self.db.execute('SELECT code,document FROM rooms')}

    def save(self, room, session=None):
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO rooms VALUES (?,?)',
                            (room['code'], json.dumps(room, ensure_ascii=False)))
            if session:
                token, player_id = session
                self.db.execute('INSERT INTO sessions VALUES (?,?,?)',
                                (self.digest(token), room['code'], player_id))

    @staticmethod
    def digest(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def identify(self, token, code):
        row = self.db.execute('SELECT player_id FROM sessions WHERE token_hash=? AND code=?',
                              (self.digest(token), code)).fetchone()
        return row[0] if row else None

    def questions(self):
        return [json.loads(row[0]) for row in self.db.execute('SELECT document FROM questions ORDER BY rowid')]

    def seed_questions(self, questions, version, category_aliases):
        """Upgrade once, preserving edits and respecting later user deletions."""
        key = 'question-seed:' + version
        if self.db.execute('SELECT 1 FROM metadata WHERE key=?', (key,)).fetchone():
            return
        existing = {q['id']: q for q in self.questions()}
        with self.db:
            for q in questions:
                previous = existing.get(q['id'])
                if previous:
                    # Only translate the legacy category when the original text is intact.
                    if previous['text'] == q['text'] and previous['category'] in category_aliases:
                        updated = dict(previous, category=category_aliases[previous['category']])
                        self.db.execute('UPDATE questions SET document=? WHERE id=?',
                                        (json.dumps(updated, ensure_ascii=False), q['id']))
                    continue
                self.db.execute('INSERT INTO questions VALUES (?,?)',
                                (q['id'], json.dumps(q, ensure_ascii=False)))
            self.db.execute('INSERT INTO metadata VALUES (?,?)', (key, 'done'))

    def put_question(self, question):
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO questions VALUES (?,?)',
                            (question['id'], json.dumps(question, ensure_ascii=False)))

    def delete_question(self, qid):
        with self.db:
            self.db.execute('DELETE FROM questions WHERE id=?', (qid,))
