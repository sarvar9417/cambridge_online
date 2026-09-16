import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter17-security-visuals.css';

export const CHAPTER_17_SECURITY_VISUAL_IDS = [
  'h17-1711-security-concerns',
  'h17-1711-plaintext-ciphertext',
  'h17-1712-symmetric-example',
  'h17-1712-key-distribution',
  'h17-1713-asymmetric',
  'h17-172-quantum-principles',
  'h17-172-qkd-stages',
  'h17-1731-ssl',
  'h17-1732-tls',
  'h17-173-handshake-pki',
  'h17-1741-signature-digest',
  'h17-1742-certificate',
  'h17-1742-self-signed',
] as const;

export function hasChapter17SecurityVisual(beat:LessonPresentationBeat){
  return CHAPTER_17_SECURITY_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function Concerns({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-grid" aria-label="Four security concerns">
    {[
      ['CONFIDENTIALITY','only intended recipient can read'],
      ['AUTHENTICITY','evidence of sender identity'],
      ['INTEGRITY','detect unauthorised change'],
      ['NON-REPUDIATION','participants cannot credibly deny involvement'],
    ].map(([a,b],i)=><section key={a} className={state(reveal,i<2?1:i===2?2:3)}><b>{a}</b><span>{b}</span></section>)}
  </div>;
}

function PlainCipher({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-flow" aria-label="Plaintext encryption ciphertext decryption flow">
    <section className={state(reveal,1)}><b>PLAINTEXT</b></section><i>→</i>
    <section className={state(reveal,1)}><b>ENCRYPT + KEY</b><span>block or stream cipher</span></section><i>→</i>
    <section className={state(reveal,2)}><b>CIPHERTEXT</b><span>safe to intercept but unreadable without key</span></section><i>→</i>
    <section className={state(reveal,3)}><b>DECRYPT + KEY</b></section><i>→</i>
    <section className={state(reveal,3)}><b>PLAINTEXT</b></section>
    <footer className={state(reveal,3)}>BLOCK CHAINING mixes each plaintext block with previous ciphertext before encryption.</footer>
  </div>;
}

function Symmetric({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-symmetric" aria-label="Symmetric encryption using one shared secret key">
    <div className={`h17sec-user ${state(reveal,1)}`}><b>SENDER</b></div>
    <section className={state(reveal,2)}><b>SHARED SECRET KEY</b><span>same key encrypts and decrypts</span><small>large key space improves resistance to brute force</small></section>
    <div className={`h17sec-user ${state(reveal,1)}`}><b>RECIPIENT</b></div>
    <footer className={state(reveal,3)}>Main difficulty: KEY-DISTRIBUTION PROBLEM — how do both sides obtain the same secret securely?</footer>
  </div>;
}

function KeyDistribution({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-keydist" aria-label="Shared key distribution demonstration">
    <section className={state(reveal,1)}><b>ALICE SECRET X</b><span>calculate public result</span></section>
    <section className={state(reveal,1)}><b>BOB SECRET Y</b><span>calculate public result</span></section>
    <div className={`h17sec-exchange ${state(reveal,2)}`}><b>EXCHANGE CALCULATED VALUES</b><span>secrets themselves are not transmitted</span></div>
    <footer className={state(reveal,3)}>Each side combines the received value with its own secret → both derive the SAME SHARED KEY.</footer>
  </div>;
}

function Asymmetric({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-asym" aria-label="Asymmetric public private key encryption">
    <section className={state(reveal,1)}><b>PUBLIC KEY</b><span>share openly</span><small>sender encrypts for recipient</small></section>
    <div className={`h17sec-lock ${state(reveal,2)}`}>🔒<span>CIPHERTEXT</span></div>
    <section className={state(reveal,3)}><b>PRIVATE KEY</b><span>kept secret</span><small>matching recipient key decrypts</small></section>
    <footer className={state(reveal,3)}>A key pair solves distribution differently from symmetric cryptography, but authenticity/integrity need additional mechanisms.</footer>
  </div>;
}

function Quantum({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-quantum" aria-label="Quantum key distribution using photons and qubits">
    <section className={state(reveal,1)}><b>PHOTON</b><span>polarisation carries key information</span></section><i>→</i>
    <section className={state(reveal,2)}><b>QUBIT</b><span>quantum state representation</span></section><i>→</i>
    <section className={state(reveal,3)}><b>BB84 / QKD</b><span>compare bases to retain compatible measurements</span></section>
  </div>;
}

function QkdStages({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-qkd" aria-label="Quantum key distribution stages">
    <section className={state(reveal,1)}><b>1. PREPARE</b><span>random photon polarisations</span></section>
    <section className={state(reveal,1)}><b>2. TRANSMIT</b><span>fibre-optic link</span></section>
    <section className={state(reveal,2)}><b>3. MEASURE</b><span>recipient chooses random basis</span></section>
    <section className={state(reveal,2)}><b>4. COMPARE BASES</b><span>announce choices, not secret bits</span></section>
    <section className={state(reveal,3)}><b>5. SYNCHRONISE</b><span>keep compatible positions</span></section>
    <footer className={state(reveal,3)}>Result: shared key material; source notes specialist hardware, range and fibre-polarisation limitations.</footer>
  </div>;
}

function Ssl({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-flow" aria-label="SSL secure session setup">
    <section className={state(reveal,1)}><b>TCP CONNECTION</b></section><i>→</i>
    <section className={state(reveal,2)}><b>SSL HANDSHAKE</b><span>authenticate server + agree algorithms</span></section><i>→</i>
    <section className={state(reveal,3)}><b>ENCRYPTED SESSION</b><span>confidentiality + integrity checks</span></section>
    <footer className={state(reveal,3)}>HTTPS uses a server digital certificate as part of trust establishment.</footer>
  </div>;
}

function Tls({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-tls" aria-label="TLS record and handshake protocol layers">
    <section className={state(reveal,1)}><b>HANDSHAKE PROTOCOL</b><span>authentication · cryptographic negotiation · session setup</span></section>
    <section className={state(reveal,2)}><b>RECORD PROTOCOL</b><span>carries application data, protected after setup</span></section>
    <footer className={state(reveal,3)}>TLS modernises SSL and can use SESSION CACHING to resume earlier secure sessions efficiently.</footer>
  </div>;
}

function HandshakePki({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-handshake" aria-label="TLS certificate validation and PKI trust chain">
    <section className={state(reveal,1)}><b>BROWSER</b><span>requests HTTPS</span></section><i>→</i>
    <section className={state(reveal,1)}><b>SERVER CERTIFICATE</b><span>contains server public key</span></section><i>→</i>
    <section className={state(reveal,2)}><b>CA / PKI CHECKS</b><span>signature · validity dates · domain name</span></section><i>→</i>
    <section className={state(reveal,3)}><b>SESSION KEY</b><span>temporary symmetric key for traffic</span></section>
  </div>;
}

function Signature({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-signature" aria-label="Digital signature hashing digest verification">
    <section className={state(reveal,1)}><b>PLAINTEXT</b><span>hash</span></section><i>→</i>
    <section className={state(reveal,1)}><b>DIGEST</b><span>fixed-size hash result</span></section><i>→</i>
    <section className={state(reveal,2)}><b>SIGN WITH PRIVATE KEY</b><span>DIGITAL SIGNATURE</span></section>
    <div className={`h17sec-verify ${state(reveal,3)}`}><b>VERIFY</b><span>sender public key recovers signed digest</span><span>recipient hashes received plaintext</span><span>matching digests support authenticity + integrity</span></div>
  </div>;
}

function Certificate({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-cert" aria-label="Digital certificate fields and certificate authority signature">
    <div className={`h17sec-cert-card ${state(reveal,1)}`}><b>DIGITAL CERTIFICATE</b><span>subject / domain</span><span>issuer</span><span>validity</span><span>public key</span><span>serial number</span><span>signature algorithm</span></div>
    <i>← signed by →</i>
    <section className={state(reveal,2)}><b>CERTIFICATE AUTHORITY</b><span>validates identity</span><span>hashes certificate data</span><span>signs using CA private key</span></section>
    <footer className={state(reveal,3)}>Certificate binds an identity to a public key and lets clients verify the binding through a trusted CA.</footer>
  </div>;
}

function SelfSigned({reveal}:{reveal:number}){
  return <div className="h17sec h17sec-self" aria-label="CA signed versus self signed certificate trust">
    <section className={state(reveal,1)}><b>CA-SIGNED</b><span>trust chain leads to recognised authority</span><small>browser can validate issuer signature</small></section>
    <section className={state(reveal,2)}><b>SELF-SIGNED</b><span>same entity signs its own certificate</span><small>identity is not independently validated by a trusted CA</small></section>
    <footer className={state(reveal,3)}>Encryption can still occur with a self-signed certificate, but trust/authentication assurance is different.</footer>
  </div>;
}

export function Chapter17SecurityVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h17-1711-security-concerns': return <Concerns reveal={reveal}/>;
    case 'h17-1711-plaintext-ciphertext': return <PlainCipher reveal={reveal}/>;
    case 'h17-1712-symmetric-example': return <Symmetric reveal={reveal}/>;
    case 'h17-1712-key-distribution': return <KeyDistribution reveal={reveal}/>;
    case 'h17-1713-asymmetric': return <Asymmetric reveal={reveal}/>;
    case 'h17-172-quantum-principles': return <Quantum reveal={reveal}/>;
    case 'h17-172-qkd-stages': return <QkdStages reveal={reveal}/>;
    case 'h17-1731-ssl': return <Ssl reveal={reveal}/>;
    case 'h17-1732-tls': return <Tls reveal={reveal}/>;
    case 'h17-173-handshake-pki': return <HandshakePki reveal={reveal}/>;
    case 'h17-1741-signature-digest': return <Signature reveal={reveal}/>;
    case 'h17-1742-certificate': return <Certificate reveal={reveal}/>;
    case 'h17-1742-self-signed': return <SelfSigned reveal={reveal}/>;
    default: return null;
  }
}
