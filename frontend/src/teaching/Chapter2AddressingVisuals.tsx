import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter2-addressing-visuals.css';

export const CHAPTER_2_ADDRESSING_VISUAL_IDS = [
  'h2-223-subnetting',
  'h2-223-subnetting-source-detail',
  'h2-223-private-public',
] as const;

export function hasChapter2AddressingVisual(beat: LessonPresentationBeat) {
  return CHAPTER_2_ADDRESSING_VISUAL_IDS.includes(beat.slideId as never);
}

const departments = [
  ['Admin and finance', '192.200.20.0'],
  ['Humanities', '192.200.20.1'],
  ['Maths', '192.200.20.2'],
  ['Science', '192.200.20.3'],
  ['Arts', '192.200.20.4'],
  ['Engineering', '192.200.20.5'],
  ['Computing', '192.200.20.6'],
  ['Business', '192.200.20.7'],
] as const;

function UniversitySubnetVisual() {
  return <div className="h2addr-subnet" aria-label="Hodder Table 2.9 and Figure 2.24 university subnetting reconstruction">
    <header>
      <span>TABLE 2.9 + FIGURE 2.24</span>
      <strong>8 departments → 8 sub-nets</strong>
      <small>Each department keeps the same hostID range: 00001 to 11110.</small>
    </header>
    <div className="h2addr-network">
      <div className="h2addr-router"><small>INTERNET</small><b>ROUTER</b></div>
      {departments.map(([name, netID], index) => <section key={name} data-slot={index + 1}>
        <strong>{name}</strong>
        <code>{netID}</code>
        <small>hostID 00001 → 11110</small>
      </section>)}
    </div>
    <div className="h2addr-mask">
      <div><span>DEVICE IP</span><code>11000000.11001000.00010100.011 00011</code></div>
      <i>AND</i>
      <div><span>MASK</span><code>11111111.11111111.11111111.111 00000</code></div>
      <i>→</i>
      <div><span>NET ID</span><code>11000000.11001000.00010100.011 00000</code><small>192.200.20.03 · Science</small></div>
    </div>
  </div>;
}

function PrivatePublicVisual() {
  return <div className="h2addr-private-public" aria-label="Hodder Table 2.10 private and public IP address reconstruction">
    <section className="h2addr-private">
      <header><span>TABLE 2.10</span><strong>PRIVATE IP ADDRESSES</strong></header>
      <p>Reserved for internal use behind a router or other NAT device.</p>
      <div className="h2addr-ranges">
        <div><b>Class A</b><code>10.0.0.0 → 10.255.255.255</code><small>16 million possible addresses</small></div>
        <div><b>Class B</b><code>172.16.0.0 → 172.31.255.255</code><small>1 million possible addresses</small></div>
        <div><b>Class C</b><code>192.168.0.0 → 192.168.255.255</code><small>65 600 possible addresses</small></div>
      </div>
      <footer>Internal value only · does not consume public IP address space · cannot be reached directly by internet users.</footer>
    </section>
    <div className="h2addr-nat"><span>PRIVATE NETWORK</span><i>→</i><b>ROUTER / NAT</b><i>→</i><span>INTERNET</span></div>
    <section className="h2addr-public">
      <header><strong>PUBLIC IP ADDRESSES</strong></header>
      <p>Allocated by a user's ISP to identify the location of their device.</p>
      <div className="h2addr-public-uses">
        <span>DNS servers</span><span>network routers</span><span>directly-controlled computers</span>
      </div>
      <footer>Devices using public IP addresses are accessible from anybody using the internet.</footer>
    </section>
  </div>;
}

export function Chapter2AddressingVisual({ beat }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h2-223-subnetting':
    case 'h2-223-subnetting-source-detail':
      return <UniversitySubnetVisual />;
    case 'h2-223-private-public':
      return <PrivatePublicVisual />;
    default:
      return null;
  }
}
