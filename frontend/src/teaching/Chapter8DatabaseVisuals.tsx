import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter8-database-visuals.css';

export const CHAPTER_8_DATABASE_VISUAL_IDS = [
  'h8-811-file-structure',
  'h8-811-limitations',
  'h8-812-database-approach',
  'h8-813-entity-attribute-tuple',
  'h8-813-keys',
  'h8-813-relationships',
  'h8-814-er-cardinality',
  'h8-815-normalisation-rules',
  'h8-815-1nf',
  'h8-815-2nf',
  'h8-815-3nf',
  'h8-815-final-design',
  'h8-821-dbms-limitations',
  'h8-821-dictionary-security',
  'h8-822-query-processor',
  'h8-831-ddl-dml',
  'h8-832-ddl',
  'h8-833-query-dml',
  'h8-833-maintenance-dml',
] as const;

export function hasChapter8DatabaseVisual(beat:LessonPresentationBeat){
  return CHAPTER_8_DATABASE_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function FileStructure({reveal}:{reveal:number}){
  return <div className="h8db h8db-files" aria-label="File based payroll and sales application structures">
    <section className={state(reveal,1)}><b>PAYROLL PROGRAM</b><span>record description</span><span>validation rules</span><span>processing code</span></section>
    <div className={`h8db-record ${state(reveal,2)}`}><b>PAYROLL FILE</b><span>FirstName</span><span>SecondName</span><span>Address</span><span>PhoneNumber</span><span>StaffNumber</span></div>
    <section className={state(reveal,1)}><b>SALES PROGRAM</b><span>record description</span><span>validation rules</span><span>processing code</span></section>
    <div className={`h8db-record ${state(reveal,2)}`}><b>SALES FILE</b><span>Name</span><span>StaffNumber</span><span>TargetSales</span><span>ActualSales</span></div>
    <footer className={state(reveal,3)}>Each application depends on its own exact record structure.</footer>
  </div>;
}

function Limitations({reveal}:{reveal:number}){
  return <div className="h8db h8db-limitations" aria-label="Three limitations of a file based approach">
    <div className={`h8db-centre ${state(reveal,1)}`}><b>SEPARATE FILES</b><span>same organisation data</span></div>
    <section className={state(reveal,2)}><b>REDUNDANCY</b><span>same data stored more than once</span></section>
    <section className={state(reveal,2)}><b>INCONSISTENCY</b><span>one copy changes while another does not</span></section>
    <section className={state(reveal,3)}><b>DEPENDENCY</b><span>queries depend on file structure and application</span></section>
  </div>;
}

function DatabaseApproach({reveal}:{reveal:number}){
  return <div className="h8db h8db-central" aria-label="Relational database shared by payroll and sales applications">
    <section className={state(reveal,1)}><b>PAYROLL APPLICATION</b></section>
    <i>↘</i>
    <div className={`h8db-database ${state(reveal,2)}`}><b>RELATIONAL DATABASE</b><span>table design</span><span>validation rules</span><span>users + access rights</span><span>shared data</span></div>
    <i>↗</i>
    <section className={state(reveal,1)}><b>SALES APPLICATION</b></section>
    <footer className={state(reveal,3)}>Store common data once → consistent updates → application-independent access.</footer>
  </div>;
}

function Keys({reveal}:{reveal:number}){
  return <div className="h8db h8db-keys" aria-label="Candidate primary secondary and foreign key roles">
    <section className={state(reveal,1)}><b>CANDIDATE KEY</b><span>smallest unique attribute set</span></section>
    <i>→</i>
    <section className={`h8db-key-primary ${state(reveal,2)}`}><b>PRIMARY KEY</b><span>chosen unique identifier</span></section>
    <section className={state(reveal,2)}><b>SECONDARY KEY</b><span>candidate key not selected as primary</span></section>
    <i>↓</i>
    <section className={`h8db-key-foreign ${state(reveal,3)}`}><b>FOREIGN KEY</b><span>refers to another table's primary key</span></section>
  </div>;
}

function Relationships({reveal}:{reveal:number}){
  return <div className="h8db h8db-relation" aria-label="Student to Class many to one relationship with referential integrity">
    <section className={state(reveal,1)}><b>STUDENT</b><code>StudentID  PK</code><code>FirstName</code><code>SecondName</code><code>ClassID  FK</code></section>
    <div className={`h8db-relation-line ${state(reveal,2)}`}><b>MANY</b><span>ClassID</span><i>→</i><b>ONE</b></div>
    <section className={state(reveal,1)}><b>CLASS</b><code>ClassID  PK</code><code>TeacherName</code><code>Location</code></section>
    <footer className={state(reveal,3)}>REFERENTIAL INTEGRITY: every Student.ClassID must match an existing Class.ClassID.</footer>
  </div>;
}

function ErCardinality({reveal}:{reveal:number}){
  return <div className="h8db h8db-er" aria-label="Entity relationship diagram and cardinality examples">
    <section className={state(reveal,1)}><b>STUDENT</b><span>StudentID</span><span>FirstName</span><span>SecondName</span><span>DateOfBirth</span><span>ClassID</span></section>
    <div className={`h8db-er-link ${state(reveal,2)}`}><b>MANY</b><i>── relationship ──</i><b>ONE</b><small>one class has many students</small></div>
    <section className={state(reveal,1)}><b>CLASS</b><span>ClassID</span><span>TeacherName</span><span>Location</span></section>
    <aside className={state(reveal,3)}><b>CARDINALITY</b><span>1:1</span><span>1:m</span><span>m:1</span><span>m:m</span><span>optional / mandatory</span></aside>
  </div>;
}

function Normalisation({reveal}:{reveal:number}){
  return <div className="h8db h8db-normal" aria-label="Normalisation progression from unnormalised data to third normal form">
    <section className={state(reveal,1)}><b>UN-NORMALISED</b><span>repeating subject groups</span></section><i>→</i>
    <section className={state(reveal,1)}><b>1NF</b><span>remove repeating groups</span></section><i>→</i>
    <section className={state(reveal,2)}><b>2NF</b><span>remove partial dependencies</span></section><i>→</i>
    <section className={state(reveal,3)}><b>3NF</b><span>remove non-key dependencies</span></section>
    <footer className={state(reveal,3)}>Attributes depend on the key, the whole key and nothing but the key.</footer>
  </div>;
}

function FinalDesign({reveal}:{reveal:number}){
  const tables=[
    ['STUDENT','StudentID PK','ClassID FK'],
    ['CLASS','ClassID PK','LicenceNumber FK'],
    ['TEACHER','LicenceNumber PK'],
    ['STUDENTSUBJECT','StudentID PK/FK','SubjectName PK/FK'],
    ['SUBJECT','SubjectName PK','LicenceNumber FK'],
  ] as const;
  return <div className="h8db h8db-schema" aria-label="Fully normalised school database relation set">
    <div className="h8db-schema-grid">{tables.map(([name,...keys],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={name}><b>{name}</b>{keys.map(key=><code key={key}>{key}</code>)}</section>)}</div>
    <footer className={state(reveal,3)}>Five linked tables preserve student, class, teacher, subject and enrolment facts without repeating full details.</footer>
  </div>;
}

function DictionarySecurity({reveal}:{reveal:number}){
  return <div className="h8db h8db-dbms" aria-label="DBMS data dictionary logical schema and security controls">
    <div className={`h8db-dbms-core ${state(reveal,1)}`}><b>DBMS</b><span>definition · creation · manipulation</span></div>
    <section className={state(reveal,2)}><b>DATA DICTIONARY</b><span>tables + attributes</span><span>relationships + indexes</span><span>validation + storage metadata</span></section>
    <section className={state(reveal,2)}><b>LOGICAL SCHEMA</b><span>database model independent of the chosen DBMS</span></section>
    <section className={state(reveal,3)}><b>SECURITY</b><span>usernames/passwords</span><span>access rights + views</span><span>backups + encryption</span><span>audit trail</span></section>
  </div>;
}

function QueryProcessor({reveal}:{reveal:number}){
  return <div className="h8db h8db-query" aria-label="DBMS developer interface and query processor components">
    <section className={state(reveal,1)}><b>DEVELOPER INTERFACE</b><code>SQL statement</code></section><i>→</i>
    <div className={`h8db-query-core ${state(reveal,2)}`}><b>QUERY PROCESSOR</b><span>route statement by purpose</span></div>
    <div className="h8db-query-branches">
      <section className={state(reveal,3)}><b>DDL INTERPRETER</b><span>record definitions in data dictionary</span></section>
      <section className={state(reveal,3)}><b>DML COMPILER</b><span>compile + optimise lower-level work</span></section>
      <section className={state(reveal,3)}><b>QUERY EVALUATION ENGINE</b><span>execute resulting instructions</span></section>
    </div>
  </div>;
}

function DdlDml({reveal}:{reveal:number}){
  return <div className="h8db h8db-ddldml" aria-label="DDL and DML comparison">
    <section className={state(reveal,1)}><b>DDL</b><strong>STRUCTURE</strong><span>create database/table</span><span>alter schema</span><span>define keys</span></section>
    <div className={`h8db-sql-core ${state(reveal,2)}`}><b>SQL</b><span>standard relational query language</span></div>
    <section className={state(reveal,1)}><b>DML</b><strong>DATA</strong><span>retrieve rows</span><span>insert / update / delete</span><span>aggregate results</span></section>
  </div>;
}

function Ddl({reveal}:{reveal:number}){
  const commands=['CREATE DATABASE','CREATE TABLE','ALTER TABLE','PRIMARY KEY','FOREIGN KEY … REFERENCES …'];
  const types=['CHARACTER','VARCHAR(n)','BOOLEAN','INTEGER','REAL','DATE','TIME'];
  return <div className="h8db h8db-ddl" aria-label="SQL data definition language commands and data types">
    <section className={state(reveal,1)}><b>DDL COMMANDS</b>{commands.map(command=><code key={command}>{command}</code>)}</section>
    <i>→</i>
    <section className={state(reveal,2)}><b>TABLE DEFINITION</b><span>attributes</span><span>data types</span><span>primary + foreign keys</span></section>
    <aside className={state(reveal,3)}><b>DATA TYPES</b>{types.map(type=><span key={type}>{type}</span>)}</aside>
  </div>;
}

function QueryDml({reveal}:{reveal:number}){
  return <div className="h8db h8db-dml" aria-label="SQL DML query pipeline">
    <div className={`h8db-select ${state(reveal,1)}`}><b>SELECT … FROM</b><span>choose columns + source table(s)</span></div>
    <div className="h8db-dml-flow">
      <span className={state(reveal,2)}>WHERE</span><i>→</i><span className={state(reveal,2)}>INNER JOIN</span><i>→</i><span className={state(reveal,3)}>GROUP BY</span><i>→</i><span className={state(reveal,3)}>ORDER BY</span>
    </div>
    <footer className={state(reveal,3)}><b>AGGREGATES</b><span>SUM</span><span>COUNT</span><span>AVG</span></footer>
  </div>;
}

function Maintenance({reveal}:{reveal:number}){
  return <div className="h8db h8db-maintenance" aria-label="SQL row maintenance and aggregate operations">
    <section className={state(reveal,1)}><b>INSERT INTO</b><span>add row(s)</span></section>
    <section className={state(reveal,1)}><b>UPDATE</b><span>edit row(s)</span></section>
    <section className={`h8db-delete ${state(reveal,2)}`}><b>DELETE FROM</b><span>remove selected row(s)</span><small>condition matters</small></section>
    <section className={state(reveal,3)}><b>SUM · AVG · COUNT</b><span>summarise stored values</span></section>
    <footer className={state(reveal,3)}>Separate maintenance commands that change rows from aggregate queries that calculate results.</footer>
  </div>;
}


function EntityAttributeTuple({reveal}:{reveal:number}){
  return <div className="h8db h8db-relational-terms" aria-label="Entity attribute tuple and table relational model visual">
    <div className={'h8db-table-model '+state(reveal,1)}>
      <header><b>STUDENT TABLE</b></header>
      <div className="h8db-columns"><span>StudentID</span><span>FirstName</span><span>DateOfBirth</span></div>
      <div className="h8db-tuple"><span>1024</span><span>Amina</span><span>2009-03-14</span></div>
      <div className="h8db-tuple"><span>1025</span><span>Bek</span><span>2009-07-02</span></div>
    </div>
    <section className={state(reveal,2)}><b>ENTITY</b><span>person / place / event / object about which data is stored</span></section>
    <section className={state(reveal,2)}><b>ATTRIBUTE</b><span>one data item stored about the entity</span></section>
    <section className={state(reveal,3)}><b>TUPLE</b><span>one entity instance represented by a row</span></section>
    <section className={state(reveal,3)}><b>TABLE</b><span>rows of instances × columns of attributes</span></section>
  </div>;
}

function FirstNormalForm({reveal}:{reveal:number}){
  return <div className="h8db h8db-nf-step" aria-label="First normal form repeating group removal visual">
    <section className={'h8db-nf-before '+state(reveal,1)}><b>UN-NORMALISED STUDENT</b><span>StudentID</span><span>FirstName</span><span>SubjectName₁ / SubjectTeacher₁</span><span>SubjectName₂ / SubjectTeacher₂</span><strong>REPEATING GROUP</strong></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>STUDENT</b><span>StudentID · FirstName · DateOfBirth · …</span></section>
    <section className={state(reveal,3)}><b>STUDENTSUBJECT</b><span>StudentID · SubjectName · SubjectTeacher</span><small>PK = StudentID + SubjectName · StudentID is FK</small></section>
    <footer className={state(reveal,3)}>1NF removes repeating subject attributes into a separate linked table.</footer>
  </div>;
}

function SecondNormalForm({reveal}:{reveal:number}){
  return <div className="h8db h8db-nf-step" aria-label="Second normal form partial dependency removal visual">
    <section className={'h8db-nf-before '+state(reveal,1)}><b>STUDENTSUBJECT</b><span>PK: StudentID + SubjectName</span><span>SubjectTeacher</span><strong>PARTIAL DEPENDENCY · SubjectTeacher depends only on SubjectName</strong></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>STUDENTSUBJECT</b><span>StudentID · SubjectName</span></section>
    <section className={state(reveal,3)}><b>SUBJECT</b><span>SubjectName · SubjectTeacher</span><small>partial dependency removed</small></section>
    <footer className={state(reveal,3)}>2NF removes attributes that depend on only part of a composite primary key.</footer>
  </div>;
}

function ThirdNormalForm({reveal}:{reveal:number}){
  return <div className="h8db h8db-nf-step h8db-3nf" aria-label="Third normal form non key dependency removal visual">
    <section className={'h8db-nf-before '+state(reveal,1)}><b>STUDENT</b><span>StudentID</span><span>ClassID → Location / ClassTeacher</span><span>LicenceNumber → TeacherName / Address / DOB</span><strong>NON-KEY DEPENDENCIES</strong></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>CLASS</b><span>ClassID · Location · LicenceNumber</span></section>
    <section className={state(reveal,2)}><b>TEACHER</b><span>LicenceNumber · TeacherName · Address · DOB</span></section>
    <section className={state(reveal,3)}><b>STUDENT</b><span>StudentID · … · ClassID</span></section>
    <footer className={state(reveal,3)}>3NF removes dependencies between non-key attributes; LicenceNumber is preferred because teacher names may not be unique.</footer>
  </div>;
}

function DbmsLimitations({reveal}:{reveal:number}){
  return <div className="h8db h8db-dbms-limitations" aria-label="DBMS response to file based redundancy inconsistency and dependency">
    <section className={state(reveal,1)}><b>REDUNDANCY</b><span>duplicate full records</span><i>→</i><strong>store most data once + use controlled foreign-key links</strong></section>
    <section className={state(reveal,2)}><b>INCONSISTENCY</b><span>copies disagree after update</span><i>→</i><strong>shared stored item updated once for all applications</strong></section>
    <section className={state(reveal,3)}><b>DEPENDENCY</b><span>program tied to exact record layout</span><i>→</i><strong>DBMS manages structure; apps request only required fields/tables</strong></section>
  </div>;
}

export function Chapter8DatabaseVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h8-811-file-structure': return <FileStructure reveal={reveal}/>;
    case 'h8-811-limitations': return <Limitations reveal={reveal}/>;
    case 'h8-812-database-approach': return <DatabaseApproach reveal={reveal}/>;
    case 'h8-813-entity-attribute-tuple': return <EntityAttributeTuple reveal={reveal}/>;
    case 'h8-813-keys': return <Keys reveal={reveal}/>;
    case 'h8-813-relationships': return <Relationships reveal={reveal}/>;
    case 'h8-814-er-cardinality': return <ErCardinality reveal={reveal}/>;
    case 'h8-815-normalisation-rules': return <Normalisation reveal={reveal}/>;
    case 'h8-815-1nf': return <FirstNormalForm reveal={reveal}/>;
    case 'h8-815-2nf': return <SecondNormalForm reveal={reveal}/>;
    case 'h8-815-3nf': return <ThirdNormalForm reveal={reveal}/>;
    case 'h8-815-final-design': return <FinalDesign reveal={reveal}/>;
    case 'h8-821-dbms-limitations': return <DbmsLimitations reveal={reveal}/>;
    case 'h8-821-dictionary-security': return <DictionarySecurity reveal={reveal}/>;
    case 'h8-822-query-processor': return <QueryProcessor reveal={reveal}/>;
    case 'h8-831-ddl-dml': return <DdlDml reveal={reveal}/>;
    case 'h8-832-ddl': return <Ddl reveal={reveal}/>;
    case 'h8-833-query-dml': return <QueryDml reveal={reveal}/>;
    case 'h8-833-maintenance-dml': return <Maintenance reveal={reveal}/>;
    default: return null;
  }
}
