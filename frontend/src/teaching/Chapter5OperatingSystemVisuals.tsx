import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter5-operating-system-visuals.css';

export const CHAPTER_5_OPERATING_SYSTEM_VISUAL_IDS = [
  'h5-511-os-need',
  'h5-511-cli-gui',
  'h5-512-os-tasks',
  'h5-512-memory-management',
  'h5-512-memory-fence',
  'h5-512-security-management',
] as const;

export function hasChapter5OperatingSystemVisual(beat: LessonPresentationBeat) {
  return CHAPTER_5_OPERATING_SYSTEM_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.14,
  transform: reveal >= step ? 'translateY(0)' : 'translateY(14px)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function OsNeed({ reveal }: { reveal: number }) {
  return <div className="h5os h5os-timeline" aria-label="Hodder Figure 5.1 operating-system start-up history visual">
    <section style={revealStyle(reveal, 1)}><b>EARLY COMPUTERS</b><span>paper tape / punched cards</span><small>control software loaded at every start</small></section>
    <i>→</i>
    <section style={revealStyle(reveal, 2)}><b>ACORN BBC B</b><span>ROM + cassette tape</span><small>Figure 5.1</small></section>
    <i>→</i>
    <section style={revealStyle(reveal, 3)}><b>HDD + BIOS</b><span>OS on disk</span><small>motherboard start-up handled by BIOS</small></section>
    <i>→</i>
    <section style={revealStyle(reveal, 4)}><b>MODERN</b><span>BIOS in flash · configuration in CMOS</span><small>required OS part copied into RAM</small></section>
  </div>;
}

function CliGui({ reveal }: { reveal: number }) {
  return <div className="h5os h5os-interface" aria-label="Hodder Figure 5.2 CLI GUI WIMP and post-WIMP comparison">
    <section className="cli" style={revealStyle(reveal, 1)}><strong>CLI</strong><code>INSERT INTO tableB{`\n`}SELECT * FROM tableA</code><span>direct communication · exact commands</span></section>
    <div className="h5os-swap" style={revealStyle(reveal, 2)}>⇄</div>
    <section className="gui" style={revealStyle(reveal, 2)}><strong>GUI</strong><div className="h5os-icons"><b>▣</b><b>▤</b><b>⌁</b></div><span>pictures / symbols (icons)</span></section>
    <footer style={revealStyle(reveal, 3)}><b>WIMP</b><span>windows · icons · menu · pointing device</span><b>POST-WIMP</b><span>touch · pinch · rotate · tap</span></footer>
  </div>;
}

function OsTasks({ reveal }: { reveal: number }) {
  const tasks = ['memory management', 'file management', 'security management', 'hardware management', 'process management'];
  return <div className="h5os h5os-tasks" aria-label="Hodder Figure 5.3 operating system tasks reconstruction">
    <div className="h5os-core" style={revealStyle(reveal, 1)}>OPERATING<br/>SYSTEM</div>
    {tasks.map((task, index) => <section key={task} style={revealStyle(reveal, index < 2 ? 2 : index < 4 ? 3 : 4)}><span>{task}</span></section>)}
  </div>;
}

function MemoryManagement({ reveal }: { reveal: number }) {
  return <div className="h5os h5os-memory" aria-label="Hodder memory management organisation methods">
    <header style={revealStyle(reveal, 1)}><b>MEMORY MANAGEMENT</b><span>optimisation · organisation · protection</span></header>
    <div className="h5os-memory-grid">
      <section style={revealStyle(reveal, 2)}><b>SINGLE</b><div className="bar one">one application</div><small>contiguous</small></section>
      <section style={revealStyle(reveal, 2)}><b>PARTITIONED</b><div className="bar split"><i/><i/><i/></div><small>variable-size contiguous blocks</small></section>
      <section style={revealStyle(reveal, 3)}><b>PAGED</b><div className="bar equal"><i/><i/><i/><i/></div><small>fixed-size partitions</small></section>
      <section style={revealStyle(reveal, 4)}><b>SEGMENTED</b><div className="segments"><i/><i/><i/></div><small>logical, non-contiguous groups</small></section>
    </div>
  </div>;
}

function MemoryFence({ reveal }: { reveal: number }) {
  return <div className="h5os h5os-fence" aria-label="Hodder Figure 5.4 memory protection FENCE reconstruction">
    <div className="h5os-address" style={revealStyle(reveal, 1)}><span>0</span><span>A</span><b>A+1</b><span>B</span><b>B+1</b><span>C</span><b>C+1</b><span>Z</span></div>
    <div className="h5os-stack">
      <section style={revealStyle(reveal, 1)}>operating system</section>
      <em style={revealStyle(reveal, 2)}>FENCE · A+1</em>
      <section style={revealStyle(reveal, 2)}>application 1</section>
      <em style={revealStyle(reveal, 3)}>FENCE · B+1</em>
      <section style={revealStyle(reveal, 3)}>application 2</section>
      <em style={revealStyle(reveal, 4)}>FENCE · C+1</em>
      <section style={revealStyle(reveal, 4)}>application 3</section>
    </div>
    <aside style={revealStyle(reveal, 4)}>An application cannot access memory below its FENCE address.</aside>
  </div>;
}

function SecurityManagement({ reveal }: { reveal: number }) {
  const items = ['OS updates', 'current antivirus', 'firewall communication', 'user privileges + IDs/passwords', 'access rights', 'recovery + system restore', 'prevent illegal intrusion'];
  return <div className="h5os h5os-security" aria-label="Hodder security management and Extension Activity 5A visual">
    <header style={revealStyle(reveal, 1)}><b>SECURITY MANAGEMENT</b><span>integrity · confidentiality · availability</span></header>
    <div className="h5os-security-grid">{items.map((item, index) => <span key={item} style={revealStyle(reveal, index < 3 ? 2 : 3)}>{item}</span>)}</div>
    <aside style={revealStyle(reveal, 4)}><b>EXTENSION 5A</b><span>distinguish security · privacy · integrity and link methods to OS security management</span></aside>
  </div>;
}

export function Chapter5OperatingSystemVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h5-511-os-need': return <OsNeed reveal={reveal}/>;
    case 'h5-511-cli-gui': return <CliGui reveal={reveal}/>;
    case 'h5-512-os-tasks': return <OsTasks reveal={reveal}/>;
    case 'h5-512-memory-management': return <MemoryManagement reveal={reveal}/>;
    case 'h5-512-memory-fence': return <MemoryFence reveal={reveal}/>;
    case 'h5-512-security-management': return <SecurityManagement reveal={reveal}/>;
    default: return null;
  }
}
