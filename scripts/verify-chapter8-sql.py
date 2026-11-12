"""Execute the displayed Chapter 8 examples against an isolated in-memory database."""
import json
import sqlite3
from pathlib import Path

course=json.loads((Path(__file__).resolve().parents[1]/'frontend/src/teaching/chapter8/course.json').read_text())
def database():
    db=sqlite3.connect(':memory:')
    db.executescript(course['sqlSetup'])
    return db
for query in course['queries']:
    db=database()
    cursor=db.execute(query['sql'])
    assert [x[0] for x in cursor.description]==query['headers'],query['title']
    assert [list(row) for row in cursor.fetchall()]==query['rows'],query['title']
    db.close()
# Test the exact displayed CREATE statements, not only a mirrored fixture.
db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys = ON')
for block in course['lessons'][10]['blocks']:
    if block['kind']=='code' and block['title']!='Structure changes': db.executescript(block['text'])
assert {x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}=={'Teacher','Class','Student','Subject','StudentSubject'}
db.close()
# All displayed SELECTs must execute against the fixture.
for lesson in course['lessons']:
    for block in lesson['blocks']:
        if block['kind']=='code' and block.get('text','').lstrip().startswith('SELECT'):
            db=database();db.execute(block['text']).fetchall();db.close()
# Exact displayed maintenance sequence: insert, targeted update, targeted delete.
db=database()
blocks=course['lessons'][12]['blocks']
db.executescript(next(b['text'] for b in blocks if b['title']=='Insert a new student'))
assert db.execute("SELECT ClassID FROM Student WHERE StudentID='S1301'").fetchone()==('7A',)
maintenance=next(b['text'] for b in blocks if b['title']=='Update or delete only the intended row').split(';')
db.execute(maintenance[0]);assert db.execute("SELECT ClassID FROM Student WHERE StudentID='S1301'").fetchone()==('7B',)
db.execute(maintenance[1]);assert db.execute('SELECT COUNT(*) FROM Student').fetchone()==(3,)
# Integrity and compound uniqueness must be genuine constraints.
for sql in ["INSERT INTO Student VALUES ('S9999','A','B','2010-01-01','9Z')", "INSERT INTO StudentSubject VALUES ('S1276','Maths',50)","DELETE FROM Class WHERE ClassID='7A'"]:
    try: db.execute(sql)
    except sqlite3.IntegrityError: pass
    else: raise AssertionError('Expected integrity failure: '+sql)
# NULL and empty-input edge cases used in the explanation.
assert db.execute("SELECT COUNT(*),COUNT(ExamMark),SUM(ExamMark),AVG(ExamMark) FROM StudentSubject WHERE SubjectName='Maths'").fetchone()==(3,2,150,75.0)
assert db.execute('SELECT COUNT(ExamMark),SUM(ExamMark),AVG(ExamMark) FROM StudentSubject WHERE 0').fetchone()==(0,None,None)
# DELETE retains a table definition on a non-referenced isolated copy.
db.execute('CREATE TABLE Scratch (ID INTEGER)');db.execute('INSERT INTO Scratch VALUES (1)');db.execute('DELETE FROM Scratch')
assert db.execute('SELECT COUNT(*) FROM Scratch').fetchone()==(0,)
print('PASS: four result tables, displayed DDL/SELECT/DML, composite keys, foreign keys, NULL aggregates and DELETE semantics.')
