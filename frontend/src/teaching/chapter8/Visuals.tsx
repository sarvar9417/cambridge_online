import { useState } from "react";
import { queries, type Table } from "./model";
export function DataTable({
  headers,
  rows,
  caption,
}: {
  headers: Table["headers"];
  rows: Table["rows"];
  caption: string;
}) {
  return (
    <div
      className="c8-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td key={j}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function KeyExplorer() {
  const [selected, setSelected] = useState("7A");
  return (
    <section className="c8-explorer">
      <header>
        <span className="c8-kicker">FOLLOW THE FOREIGN KEY</span>
        <h3>Which class does this student belong to?</h3>
      </header>
      <label>
        Student.ClassID{" "}
        <select
          aria-label="Try a ClassID"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option>7A</option>
          <option>7B</option>
          <option>9Z</option>
        </select>
      </label>
      <div className="c8-key-pair">
        <article>
          <span className="c8-badge">FK</span>
          <h4>Student</h4>
          <p>
            StudentID <b>S1276</b>
          </p>
          <p>
            FirstName <b>Noor</b>
          </p>
          <p className="c8-highlight">
            ClassID <b>{selected}</b>
          </p>
        </article>
        <article>
          <span className="c8-badge c8-badge--pk">PK</span>
          <h4>Class</h4>
          {[
            ["7A", "Room 12"],
            ["7B", "Room 14"],
          ].map(([id, room]) => (
            <p className={selected === id ? "c8-highlight" : ""} key={id}>
              <b>{id}</b>
              <span>{room}</span>
            </p>
          ))}
        </article>
      </div>
      <p
        className={selected === "9Z" ? "c8-feedback is-wrong" : "c8-feedback"}
        role="status"
      >
        {selected === "9Z"
          ? "No matching parent key. The DBMS rejects this non-null foreign-key value."
          : `Match found: ${selected}. Several Student rows may reference this same Class row.`}
      </p>
    </section>
  );
}
export function TableExplorer() {
  const [lens, setLens] = useState("row");
  return (
    <section className={`c8-explorer c8-table-lens c8-lens-${lens}`}>
      <span className="c8-kicker">ONE TABLE · THREE WAYS TO READ IT</span>
      <div
        className="c8-segments"
        role="group"
        aria-label="Highlight table meaning"
      >
        {["row", "column", "value"].map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={lens === x}
            onClick={() => setLens(x)}
          >
            {x === "row"
              ? "Record / tuple"
              : x === "column"
                ? "Field / attribute"
                : "A value"}
          </button>
        ))}
      </div>
      <DataTable
        caption="Student"
        headers={["StudentID", "FirstName", "ClassID"]}
        rows={[
          ["S1276", "Noor", "7A"],
          ["S1277", "Ahmad", "7B"],
          ["S1299", "Tahir", "7A"],
        ]}
      />
      <p role="status">
        {lens === "row"
          ? "The highlighted row is one complete tuple: one student instance."
          : lens === "column"
            ? "The highlighted column stores the FirstName attribute for every student."
            : "Noor is one value of FirstName, not the name of an attribute."}
      </p>
    </section>
  );
}
export function ERDiagram() {
  return (
    <figure className="c8-er">
      <svg
        viewBox="0 0 720 410"
        role="img"
        aria-labelledby="c8-er-title c8-er-desc"
      >
        <title id="c8-er-title">Normalised school entity relationships</title>
        <desc id="c8-er-desc">
          Teacher to Class and Subject, Class to Student, Student to
          StudentSubject, and Subject to StudentSubject are one-to-many
          relationships. Each child has one mandatory parent; parents may have
          zero or many children.
        </desc>
        <defs>
          <marker
            id="c8-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        <g className="c8-er-lines" fill="none" strokeWidth="2">
          <path d="M 300 75 H 220 V 150" />
          <path d="M 420 75 H 540 V 270" />
          <path d="M 170 210 V 290" />
          <path d="M 260 320 H 330" />
          <path d="M 500 320 H 470" />
        </g>
        <g className="c8-er-labels">
          <text x="243" y="65">
            1
          </text>
          <text x="230" y="137">
            0..many
          </text>
          <text x="465" y="65">
            1
          </text>
          <text x="550" y="254">
            0..many
          </text>
          <text x="179" y="232">
            1
          </text>
          <text x="179" y="275">
            0..many
          </text>
          <text x="270" y="309">
            1
          </text>
          <text x="290" y="344">
            0..many
          </text>
          <text x="481" y="309">
            1
          </text>
          <text x="445" y="370">
            0..many
          </text>
        </g>
        {[
          { x: 280, y: 25, w: 160, name: "TEACHER", key: "PK LicenceNumber" },
          {
            x: 100,
            y: 150,
            w: 170,
            name: "CLASS",
            key: "PK ClassID · FK teacher",
          },
          {
            x: 80,
            y: 290,
            w: 180,
            name: "STUDENT",
            key: "PK StudentID · FK class",
          },
          { x: 330, y: 290, w: 140, name: "STUDENTSUBJECT", key: "PK/FK pair" },
          {
            x: 500,
            y: 270,
            w: 180,
            name: "SUBJECT",
            key: "PK SubjectName · FK teacher",
          },
        ].map((n) => (
          <g key={n.name}>
            <rect x={n.x} y={n.y} width={n.w} height="65" rx="12" />
            <text
              className="c8-er-name"
              x={n.x + n.w / 2}
              y={n.y + 25}
              textAnchor="middle"
            >
              {n.name}
            </text>
            <text
              className="c8-er-key"
              x={n.x + n.w / 2}
              y={n.y + 46}
              textAnchor="middle"
            >
              {n.key}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Parent → child: one-to-many. Here each child has one parent; a parent
        may initially have no children. PK = primary key · FK = foreign key.
      </figcaption>
    </figure>
  );
}
export function NormalisationExplorer() {
  const [step, setStep] = useState(0);
  const states = [
    {
      title: "UNF · repeating groups",
      headers: ["StudentID", "SubjectName", "SubjectTeacher"],
      rows: [["S1276", "Maths, History", "Mr Yee, Miss Wu"]],
      reason: "Several subject/teacher pairs are stored in one student record.",
    },
    {
      title: "1NF · one choice per row",
      headers: [
        "StudentID (PK part)",
        "SubjectName (PK part)",
        "SubjectTeacher",
      ],
      rows: [
        ["S1276", "Maths", "Mr Yee"],
        ["S1276", "History", "Miss Wu"],
        ["S1277", "Maths", "Mr Yee"],
      ],
      reason:
        "The repeating group is removed. SubjectTeacher still depends on SubjectName alone.",
    },
    {
      title: "2NF · remove a partial dependency",
      headers: ["SubjectName (PK)", "SubjectTeacher"],
      rows: [
        ["Maths", "Mr Yee"],
        ["History", "Miss Wu"],
      ],
      reason:
        "Keep (StudentID, SubjectName) in StudentSubject. Put the teacher fact in Subject; it does not depend on StudentID.",
    },
    {
      title: "3NF · separate class and teacher facts",
      headers: ["Relation", "Primary key", "Foreign key(s)"],
      rows: [
        ["Student", "StudentID", "ClassID"],
        ["Class", "ClassID", "LicenceNumber"],
        ["Teacher", "LicenceNumber", "—"],
        ["Subject", "SubjectName", "LicenceNumber"],
        ["StudentSubject", "StudentID + SubjectName", "StudentID; SubjectName"],
      ],
      reason:
        "ClassID determines class details; LicenceNumber determines teacher details. Store each fact with its determinant.",
    },
  ];
  const current = states[step];
  return (
    <section className="c8-explorer">
      <span className="c8-kicker">WATCH THE DESIGN CHANGE</span>
      <div className="c8-segments" role="group" aria-label="Normal form">
        {["UNF", "1NF", "2NF", "3NF"].map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={step === i}
            onClick={() => setStep(i)}
          >
            {name}
          </button>
        ))}
      </div>
      <DataTable
        caption={current.title}
        headers={current.headers}
        rows={current.rows}
      />
      <p role="status">{current.reason}</p>
    </section>
  );
}
export function QueryExplorer() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const q = queries[index];
  return (
    <section className="c8-explorer">
      <span className="c8-kicker">PREDICT → REVEAL → EXPLAIN</span>
      <h3>SQL result walkthrough</h3>
      <p>
        These verified examples use a small fixture: three students, two
        subjects and four enrolments. This is a result walkthrough, not a live
        SQL editor.
      </p>
      <label>
        Choose a question
        <select
          aria-label="Choose a SQL example"
          value={index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            setShow(false);
          }}
        >
          {queries.map((q, i) => (
            <option key={q.title} value={i}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <pre>
        <code>
          {q.sql.replace(/ (FROM|WHERE|INNER JOIN|GROUP BY|ORDER BY)/g, "\n$1")}
        </code>
      </pre>
      <button
        type="button"
        className="c8-button"
        onClick={() => setShow(!show)}
        aria-expanded={show}
      >
        {show ? "Hide result" : "Reveal expected result"}
      </button>
      {show ? (
        <div>
          <DataTable
            caption="Expected result"
            headers={q.headers}
            rows={q.rows}
          />
          <p>{q.why}</p>
        </div>
      ) : (
        <p>Before revealing: how many rows and columns do you expect?</p>
      )}
    </section>
  );
}
function ERProgressive() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="c8-explorer">
      <span className="c8-kicker">START WITH ONE RELATIONSHIP</span>
      <h3>One class can have many students</h3>
      <div className="c8-concept-cards">
        <article>
          <span>CLASS</span>
          <strong>7A</strong>
          <p>ClassID identifies the class.</p>
        </article>
        <article>
          <span>STUDENTS IN 7A</span>
          <strong>Noor · Tahir</strong>
          <p>Each student has ClassID = 7A.</p>
        </article>
      </div>
      <p>
        Class (one) → Student (many). Every Student row points to its Class.
      </p>
      <button
        type="button"
        className="c8-button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {expanded
          ? "Hide five-table E-R diagram"
          : "Explore the full five-table E-R diagram"}
      </button>
      {expanded ? <ERDiagram /> : null}
    </section>
  );
}
function FirstTableExplorer() {
  const [step, setStep] = useState(0);
  const definitions = [
    {
      name: "1 · Class table",
      code: "CREATE TABLE Class (\\n  ClassID VARCHAR(4) NOT NULL PRIMARY KEY,\\n  Location VARCHAR(60)\\n);",
      why: "The parent Class table defines the allowed class IDs, such as 7A and 7B.",
    },
    {
      name: "2 · Student table",
      code: "CREATE TABLE Student (\\n  StudentID VARCHAR(5) NOT NULL PRIMARY KEY,\\n  FirstName VARCHAR(40),\\n  ClassID VARCHAR(4),\\n  FOREIGN KEY (ClassID) REFERENCES Class(ClassID)\\n);",
      why: "Student.ClassID now refers to Class.ClassID. Students in 7A can share the same foreign-key value.",
    },
  ];
  const selected = definitions[step];
  return (
    <section className="c8-explorer">
      <span className="c8-kicker">BUILD TWO TABLES · ONE AT A TIME</span>
      <h3>{selected.name}</h3>
      <div
        className="c8-segments"
        role="group"
        aria-label="Choose table to build"
      >
        {definitions.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={step === index}
            onClick={() => setStep(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <pre>
        <code>{selected.code.replaceAll("\\n", "\n")}</code>
      </pre>
      <p role="status">{selected.why}</p>
      <p>
        In the SQLite practice database, foreign-key enforcement is enabled
        before testing the relationship.
      </p>
    </section>
  );
}
function FirstSelectExplorer() {
  const [classId, setClassId] = useState("7A");
  const [revealed, setRevealed] = useState(false);
  const students = [
    ["S1276", "Noor", "Baig", "7A"],
    ["S1277", "Ahmad", "Sayed", "7B"],
    ["S1299", "Tahir", "Hassan", "7A"],
  ];
  const rows = students
    .filter((student) => student[3] === classId)
    .sort((a, b) => a[2].localeCompare(b[2]))
    .map((student) => [student[1], student[2]]);
  return (
    <section className="c8-explorer">
      <span className="c8-kicker">PREDICT THE RESULT BEFORE REVEALING</span>
      <h3>Who belongs to this class?</h3>
      <DataTable
        caption="Our three students"
        headers={["StudentID", "FirstName", "SecondName", "ClassID"]}
        rows={students}
      />
      <label>
        Choose the WHERE condition
        <select
          aria-label="Filter by class"
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setRevealed(false);
          }}
        >
          <option value="7A">Class 7A</option>
          <option value="7B">Class 7B</option>
        </select>
      </label>
      <pre>
        <code>{`SELECT FirstName, SecondName
FROM Student
WHERE ClassID = '${classId}'
ORDER BY SecondName ASC;`}</code>
      </pre>
      <button
        className="c8-button"
        type="button"
        aria-expanded={revealed}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed ? "Hide result" : "Reveal expected rows"}
      </button>
      {revealed ? (
        <>
          <DataTable
            caption={`Students in ${classId}`}
            headers={["FirstName", "SecondName"]}
            rows={rows}
          />
          <p role="status">
            WHERE keeps only {classId} rows; ORDER BY sorts their surnames.
          </p>
        </>
      ) : (
        <p>Predict which students remain after WHERE and in what order.</p>
      )}
    </section>
  );
}
export function Visual({ name }: { name: string }) {
  if (name === "relationship")
    return (
      <figure className="c8-simple-relation">
        <svg
          viewBox="0 0 620 180"
          role="img"
          aria-labelledby="c8-simple-er-title"
          style={{ width: "100%", height: "auto" }}
        >
          <title id="c8-simple-er-title">
            One class has many students. Each student belongs to one class.
          </title>
          <rect
            x="10"
            y="40"
            width="180"
            height="90"
            rx="14"
            fill="#edf5e9"
            stroke="#22684f"
          />
          <rect
            x="430"
            y="40"
            width="180"
            height="90"
            rx="14"
            fill="#edf5e9"
            stroke="#22684f"
          />
          <g
            fill="#173c2d"
            fontFamily="inherit"
            textAnchor="middle"
            fontSize="22"
            fontWeight="600"
          >
            <text x="100" y="92">
              Class
            </text>
            <text x="520" y="92">
              Student
            </text>
            <text x="215" y="68">
              1
            </text>
            <text x="395" y="68">
              many
            </text>
          </g>
          <path
            d="M190 85 H430 M205 72 V98 M410 85 L430 70 M410 85 L430 100"
            fill="none"
            stroke="#22684f"
            strokeWidth="2.5"
          />
          <text
            x="310"
            y="155"
            fill="#52635e"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="17"
          >
            One Class → many Students
          </text>
        </svg>
        <figcaption>
          The marker beside Student counts the students for one Class.
        </figcaption>
      </figure>
    );
  if (name === "keys") return <KeyExplorer />;
  if (name === "table") return <TableExplorer />;
  if (name === "er") return <ERProgressive />;
  if (name === "schema") return <ERDiagram />;
  if (name === "create-table") return <FirstTableExplorer />;
  if (name === "sql-where") return <FirstSelectExplorer />;
  if (name === "normalise") return <NormalisationExplorer />;
  if (name === "queries") return <QueryExplorer />;
  const cards: Record<string, { label: string; text: string }[]> = {
    files: [
      { label: "ATTENDANCE FILE", text: "Noor · ClassID 7A" },
      { label: "EXAM FILE", text: "Noor · ClassID 7B" },
    ],
    shared: [
      { label: "ATTENDANCE", text: "Reads Noor’s class" },
      { label: "ONE STUDENT DATABASE", text: "ClassID changes in one place" },
      { label: "EXAMS", text: "Reads the same current class" },
    ],
    dictionary: [
      { label: "STUDENT DATA", text: "Noor belongs to 7A" },
      { label: "DATA DICTIONARY", text: "StudentID is the primary key" },
      {
        label: "DBMS SOFTWARE",
        text: "Checks permissions and manages changes",
      },
    ],
    processor: [
      { label: "DEVELOPER INTERFACE", text: "SQL question: show Class 7A" },
      { label: "QUERY PROCESSOR", text: "Prepares and executes the request" },
      { label: "RESULT", text: "Noor and Tahir" },
    ],
    types: [
      { label: "DDL · STRUCTURE", text: "CREATE TABLE Student" },
      { label: "DML · RECORDS", text: "INSERT INTO Student" },
    ],
    recap: [
      { label: "DESIGN", text: "Entities → keys → normalisation" },
      { label: "MANAGE", text: "DBMS → integrity → security" },
      { label: "USE", text: "DDL → queries → updates" },
    ],
  };
  return (
    <div className="c8-concept-cards">
      {(cards[name] ?? cards.recap).map((c) => (
        <article key={c.label}>
          <span>{c.label}</span>
          <strong>{c.text}</strong>
        </article>
      ))}
    </div>
  );
}
