import { describe, expect, it } from 'vitest';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import application from './Chapter14ApplicationHeroes.tsx?raw';

describe('Chapter 14 application-layer projector heroes',()=>{
  it('routes the application protocol map through the source-complete hero',()=>{
    expect(facade).toContain("from './Chapter14ApplicationHeroes'");
    expect(facade).toContain("if(beat.id==='h14p-141-protocol-map')return <Chapter14ApplicationProtocolHero reveal={reveal}/>;");
    for(const marker of ['4 · APPLICATION LAYER','HODDER p.330 · TABLE 14.1','HTTP','SMTP','POP3/4','IMAP','DNS','FTP','RIP','SNMP','task → correct protocol'])expect(application).toContain(marker);
  });

  it('keeps the FTP session and all source-listed FTP features visible',()=>{
    expect(facade).toContain("if(beat.id==='h14p-141-ftp-detail')return <Chapter14FtpHero reveal={reveal}/>;");
    for(const marker of ['CLIENT ⇄ FTP SERVER','ftp host_name','user ID + password','UPLOAD / DOWNLOAD','ANONYMOUS FTP','331 Anonymous access allowed','delete','close','rename','cd','lcd','FTP SERVER'])expect(application).toContain(marker);
  });

  it('makes synchronisation the decisive POP3/4 versus IMAP contrast',()=>{
    expect(facade).toContain("if(beat.id==='h14p-141-pop-imap')return <Chapter14PopImapHero reveal={reveal}/>;");
    for(const marker of ['POP3/4','DOWNLOAD → DELETE SERVER COPY','NOT KEPT IN SYNCHRONISATION','IMAP','COPY ⇄ SYNCHRONISE','SERVER + CLIENT STAY SYNCHRONISED','original remains on the server','Both are pull protocols'])expect(application).toContain(marker);
  });
});
