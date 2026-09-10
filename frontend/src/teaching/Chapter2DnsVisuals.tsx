import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter2-dns-visuals.css';

export const CHAPTER_2_DNS_VISUAL_IDS = [
  'h2-225-dns',
  'h2-225-dns-source-detail',
] as const;

export function hasChapter2DnsVisual(beat: LessonPresentationBeat) {
  return CHAPTER_2_DNS_VISUAL_IDS.includes(beat.slideId as never);
}

const dnsSteps = [
  {
    number: 1,
    from: 'COMPUTER',
    to: 'DNS SERVER (1)',
    detail: 'Browser sends www.hoddereducation.co.uk and asks for the website IP address.',
  },
  {
    number: 2,
    from: 'DNS SERVER (1)',
    to: 'DNS SERVER (2)',
    detail: 'The first DNS server cannot find the host in its database or cache, so it asks a second DNS server.',
  },
  {
    number: 3,
    from: 'DNS SERVER (2)',
    to: 'DNS SERVER (1)',
    detail: 'The second server maps the host to 107.162.140.19; DNS server (1) stores the host/IP association in its cache or database.',
  },
  {
    number: 4,
    from: 'DNS SERVER (1)',
    to: 'COMPUTER',
    detail: '107.162.140.19 is returned to the user’s computer.',
  },
  {
    number: 5,
    from: 'COMPUTER',
    to: 'WEBSITE SERVER',
    detail: 'The computer connects to the website server; required pages are downloaded and the browser interprets the HTML for display.',
  },
] as const;

function DnsProcessVisual({ reveal }: { reveal: number }) {
  const visible = Math.max(1, Math.min(dnsSteps.length, reveal + 1));
  return <div className="h2dns" aria-label="Hodder Figure 2.25 DNS process reconstruction">
    <header className="h2dns-heading">
      <span>FIGURE 2.25 · DOMAIN NAME SERVICE</span>
      <strong>A host name is resolved before the website connection is made</strong>
      <code>www.hoddereducation.co.uk → 107.162.140.19</code>
    </header>

    <div className="h2dns-topology" aria-hidden="true">
      <div className="h2dns-node" data-node="computer"><small>USER</small><b>COMPUTER</b></div>
      <div className="h2dns-node" data-node="dns1"><small>LOOKUP + CACHE</small><b>DNS SERVER (1)</b></div>
      <div className="h2dns-node" data-node="dns2"><small>SECOND LOOKUP</small><b>DNS SERVER (2)</b></div>
      <div className="h2dns-node" data-node="website"><small>HTML PAGES</small><b>WEBSITE SERVER</b></div>
      <div className="h2dns-route">1 → 2 → 3 → 4 → 5</div>
    </div>

    <ol className="h2dns-steps">
      {dnsSteps.map((step, index) => <li key={step.number} className={index < visible ? 'is-visible' : ''}>
        <span className="h2dns-number">{step.number}</span>
        <div className="h2dns-hop"><b>{step.from}</b><i>→</i><b>{step.to}</b></div>
        <p>{step.detail}</p>
      </li>)}
    </ol>

    <footer className="h2dns-memory">
      <b>Source-critical detail</b>
      <span>Step 3 updates DNS server (1)’s cache/database; step 5 is the separate website-server connection and page download.</span>
    </footer>
  </div>;
}

export function Chapter2DnsVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  if (!hasChapter2DnsVisual(beat)) return null;
  return <DnsProcessVisual reveal={reveal} />;
}
