"""Execute Chapter 8's displayed SQL examples against isolated SQLite databases.

The teaching route shows Class and Student before the complete five-table
fixture. Alternative CREATE statements are tested independently, not executed
as one impossible cumulative script. MySQL-only CREATE DATABASE is labelled
as such in the lesson and is intentionally not run against SQLite.
"""
import json
import sqlite3
from pathlib import Path

course = json.loads((Path(__file__).resolve().parents[1] / "frontend/src/teaching/chapter8/course.json").read_text())
lesson11 = course["lessons"][10]
lesson13 = course["lessons"][12]

def database():
    db = sqlite3.connect(":memory:")
    db.executescript(course["sqlSetup"])
    return db

def find_block(lesson, title):
    return next(block["text"] for block in lesson["blocks"] + lesson["details"] if block["title"] == title)

# The existing interactive SQL examples must return their displayed tables.
for query in course["queries"]:
    db = database()
    cursor = db.execute(query["sql"])
    assert [c[0] for c in cursor.description] == query["headers"], query["title"]
    assert [list(row) for row in cursor.fetchall()] == query["rows"], query["title"]
    db.close()

# Beginner DDL: run Class first, then the referencing Student table.
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript(find_block(lesson11, "Step 1 — create the Class table"))
db.executescript(find_block(lesson11, "Step 2 — create Student and link it to Class"))
db.execute("INSERT INTO Class (ClassID, Location) VALUES ('7A', 'Room 3')")
db.execute("INSERT INTO Student (StudentID, FirstName, ClassID) VALUES ('S1276', 'Noor', '7A')")
try:
    db.execute("INSERT INTO Student (StudentID, FirstName, ClassID) VALUES ('S1277','Ahmad','9Z')")
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Introductory foreign-key relationship was not enforced")
db.close()

# Activity 8G is a NEW expanded Class schema, not a second Class definition.
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript(find_block(lesson11, "Step 3 — Hodder Activity 8G: add Teacher"))
assert {row[0] for row in db.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
)} == {"Teacher", "Class"}
db.execute("INSERT INTO Teacher VALUES (37952, 'Mr Khan')")
db.execute("INSERT INTO Class VALUES ('7A', 'Room 3', 37952)")
db.close()

# The linear walkthrough isolates the three SQL building blocks.
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for block in lesson11["blocks"]:
    if block["kind"] == "code": db.executescript(block["text"])
db.execute("INSERT INTO LessonClass VALUES ('7A')")
db.execute("INSERT INTO LessonMember VALUES ('S1276','7A')")
db.execute("INSERT INTO LessonChoice VALUES ('S1276','Maths')")
db.execute("INSERT INTO LessonChoice VALUES ('S1276','History')")
for sql in ["INSERT INTO LessonMember VALUES ('S1277','9Z')", "INSERT INTO LessonChoice VALUES ('S1276','Maths')", "INSERT INTO LessonStudent VALUES (NULL,'Noor')"]:
    try: db.execute(sql)
    except sqlite3.IntegrityError: pass
    else: raise AssertionError("Introductory constraint was not enforced: " + sql)
db.close()

# Run the complete five-table DDL shown in further study, not just the fixture.
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for title in ["First create the referenced Teacher table", "Then create Class and Student", "Create the subject-choice relationship"]:
    db.executescript(find_block(lesson11, title))
assert {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")} == {"Teacher","Class","Student","Subject","StudentSubject"}
db.close()

# The extra first-SQL example defines a separate small Student table.
db = sqlite3.connect(":memory:")
for block in course["lessons"][9]["details"]:
    if block["kind"] == "code" and block["text"].lstrip().startswith(("CREATE TABLE", "INSERT INTO")):
        db.executescript(block["text"])
assert db.execute("SELECT COUNT(*) FROM Student").fetchone() == (1,)
db.close()

# The fixture holds the final complete 3NF model and its realistic rows.
db = database()
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
assert tables == {"Teacher", "Class", "Student", "Subject", "StudentSubject"}
db.close()

# Every displayed standalone SELECT in the refreshed lessons must execute.
for lesson in course["lessons"]:
    for block in lesson["blocks"] + lesson["details"]:
        if block["kind"] == "code" and block.get("text", "").lstrip().startswith("SELECT"):
            db = database()
            db.execute(block["text"]).fetchall()
            db.close()

# Displayed INSERT and targeted UPDATE/DELETE must leave only original rows.
db = database()
db.executescript(find_block(lesson13, "INSERT INTO — add a new student row"))
assert db.execute("SELECT ClassID FROM Student WHERE StudentID='S1301'").fetchone() == ("7A",)
maintenance = find_block(lesson13, "UPDATE and DELETE FROM — change only the right row").split(";")
db.execute(maintenance[0])
assert db.execute("SELECT ClassID FROM Student WHERE StudentID='S1301'").fetchone() == ("7B",)
db.execute(maintenance[1])
assert db.execute("SELECT COUNT(*) FROM Student").fetchone() == (3,)

# Referential integrity, uniqueness, and NULL behaviour are real constraints.
for sql in [
    "INSERT INTO Student VALUES ('S9999','A','B','2010-01-01','9Z')",
    "INSERT INTO StudentSubject VALUES ('S1276','Maths',50)",
    "DELETE FROM Class WHERE ClassID='7A'",
    "INSERT INTO StudentSubject VALUES (NULL,'Maths',50)",
    "INSERT INTO StudentSubject VALUES ('S1276',NULL,50)",
    "INSERT INTO Student VALUES (NULL,'A','B','2010-01-01','7A')",
]:
    try:
        db.execute(sql)
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("Expected integrity failure: " + sql)

assert db.execute(
    "SELECT COUNT(*),COUNT(ExamMark),SUM(ExamMark),AVG(ExamMark) "
    "FROM StudentSubject WHERE SubjectName='Maths'"
).fetchone() == (3, 2, 150, 75.0)
assert db.execute(
    "SELECT COUNT(ExamMark),SUM(ExamMark),AVG(ExamMark) FROM StudentSubject WHERE 0"
).fetchone() == (0, None, None)
db.execute("CREATE TABLE Scratch (ID INTEGER)")
db.execute("INSERT INTO Scratch VALUES (1)")
db.execute("DELETE FROM Scratch")
assert db.execute("SELECT COUNT(*) FROM Scratch").fetchone() == (0,)
print("PASS: displayed beginner DDL, 3NF fixture, SQL result tables, SELECT/JOIN/GROUP BY, maintenance, keys and NULL handling.")
