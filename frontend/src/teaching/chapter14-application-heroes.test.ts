import { describe, expect, it } from 'vitest';
import registry from './Chapter14PresentationHeroRegistry.tsx?raw';
import application from './Chapter14ApplicationHeroes.tsx?raw';

describe('Chapter 14 application-layer projector heroes',()=>{
  it('routes the application protocol map through the source-complete hero',()=>{
    expect(registry).toContain("'h14p-141-protocol-map':Chapter14ApplicationProtocolHero");
    for(const marker of ['4 · APPLICATION LAYER','HODDER p.330 · TABLE 14.1','HTTP','SMTP','POP3/4','IMAP','DNS','FTP','RIP','SNMP','task → correct protocol'])expect(application).toContain(marker);
  });

  it('teaches the application purpose before revealing the protocol map',()=>{
    expect(application).toContain('if(reveal===0)');
    expect(application).toContain('Which service does the application need?');
    expect(application).toContain('understand the layer first; then reveal the protocols');
  });

  it('keeps the FTP session and all source-listed FTP features visible',()=>{
    expect(registry).toContain("'h14p-141-ftp-detail':Chapter14FtpHero");
    for(const marker of ['CLIENT ⇄ FTP SERVER','ftp host_name','user ID + password','UPLOAD / DOWNLOAD','ANONYMOUS FTP','331 Anonymous access allowed','delete','close','rename','cd','lcd','FTP SERVER','Use that wording in an exam answer'])expect(application).toContain(marker);
  });

  it('makes synchronisation the decisive POP3/4 versus IMAP contrast',()=>{
    expect(registry).toContain("'h14p-141-pop-imap':Chapter14PopImapHero");
    for(const marker of ['POP3/4','DOWNLOAD → DELETE SERVER COPY','NOT KEPT IN SYNCHRONISATION','IMAP','COPY ⇄ SYNCHRONISE','SERVER + CLIENT STAY SYNCHRONISED','original remains on the server','Both are pull protocols'])expect(application).toContain(marker);
  });
});
