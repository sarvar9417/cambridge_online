import { ArrowsOut } from '@phosphor-icons/react/ArrowsOut';
import { FileArrowDown } from '@phosphor-icons/react/FileArrowDown';
import { X } from '@phosphor-icons/react/X';
import type { RealSlideDeck } from './real-slide-decks';
import './real-slide-deck.css';

type Props={
  deck:RealSlideDeck;
  onExit:()=>void;
  onFullscreen:()=>void;
};

export function RealSlideDeckPresentation({deck,onExit,onFullscreen}:Props){
  return <section className="real-deck" aria-label={deck.title}>
    <header className="real-deck-bar">
      <div><span>9618 · CHAPTER 3 · REAL PPTX</span><strong>{deck.title}</strong></div>
      <span>{deck.slides.length} slides</span>
      <a href={deck.pptxDriveUrl} target="_blank" rel="noreferrer" title="Open the editable PPTX in Google Drive"><FileArrowDown size={21}/><span>PPTX</span></a>
      <button type="button" onClick={onFullscreen}><ArrowsOut size={21}/><span>Full screen</span></button>
      <button type="button" onClick={onExit}><X size={22}/><span>Exit</span></button>
    </header>
    <main className="real-deck-stage">
      <div className="real-deck-embed">
        <iframe
          src={deck.embedUrl}
          title={`${deck.title} presentation`}
          allow="autoplay; fullscreen"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </main>
    <footer className="real-deck-nav"><p><strong>{deck.pptxFileName}</strong><span>Use the presentation controls inside the slide viewer. The PPTX stored in Drive is the source of truth.</span></p></footer>
  </section>;
}
