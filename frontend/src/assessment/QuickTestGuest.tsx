import { useEffect, useRef, useState, type FormEvent } from 'react';
import './quick-test.css';

type Guest={playerId:string;token:string;code:string;name:string};
type Question={id:string;number:number;prompt:string;options:string[];marks:number;choiceIndex:number|null};
type Snapshot={title:string;name:string;deadlineAt:string;serverNow:string;submittedAt:string|null;
  score:number|null;maxScore:number|null;questions:Question[]};
type Lobby={code:string;title:string;durationMinutes:number;questionCount:number};
const base=import.meta.env.DEV?'/api/v1':(import.meta.env.VITE_API_URL??'/api/v1');
const key=(pin:string)=>'campath:assessment-code:'+pin;
const read=(pin:string):Guest|null=>{
  try{const v=JSON.parse(localStorage.getItem(key(pin))??'null') as Guest|null;
    return v?.code===pin&&/^[0-9a-f-]{36}$/i.test(v.playerId)&&/^[0-9a-f]{64}$/i.test(v.token)?v:null;
  }catch{return null;}
};
async function request<T>(path:string,token?:string,body?:unknown):Promise<T>{
  const r=await fetch(base+'/assessment-code-guest'+path,{
    method:body===undefined?'GET':'POST',
    cache:'no-store',credentials:'omit',
    headers:{...(token?{Authorization:'Test '+token}:{}),
      ...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  const payload=await r.json().catch(()=>null) as {data:T;error?:{message:string;code:string}}|null;
  if(!r.ok){
    const error=payload?.error?.code;
    const friendly:Record<string,string>={
      test_name_taken:'Bu ism bilan o‘quvchi allaqachon kirgan. Boshqa ism kiriting yoki avvalgi qurilmadan davom eting.',
      test_code_not_found:'Kod topilmadi yoki test yopilgan. O‘qituvchidan kodni tekshiring.',
      test_time_expired:'Vaqt tugadi yoki o‘qituvchi testni yakunladi.',
      test_player_forbidden:'Sessiya topilmadi. O‘qituvchidan yangi kod so‘rang.'
    };
    throw Error((error&&friendly[error])||payload?.error?.message||'Ulanishda xatolik. Qayta urinib ko‘ring.');
  }
  return payload!.data;
}
export function QuickTestGuest({pin}:{pin:string}){
  const [typedPin,setTypedPin]=useState(pin);
  const code=/^\d{6}$/.test(pin)?pin:'';
  const [lobby,setLobby]=useState<Lobby|null>(null);
  const [name,setName]=useState('');
  const [guest,setGuest]=useState<Guest|null>(()=>read(code));
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [index,setIndex]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [now,setNow]=useState(Date.now());
  const [offset,setOffset]=useState(0);
  const timerSubmit=useRef(false);
  useEffect(()=>{setGuest(read(code));setSnapshot(null);setIndex(0);timerSubmit.current=false;},[code]);
  useEffect(()=>{
    if(!code||guest)return;
    let mounted=true;
    void request<Lobby>('/lobby/'+code).then(s=>{if(mounted){setLobby(s);setError('');}})
      .catch(e=>{if(mounted){setLobby(null);setError(e instanceof Error?e.message:'Kod topilmadi.');}});
    return()=>{mounted=false;};
  },[code,guest]);
  useEffect(()=>{
    if(!guest)return;
    let active=true;
    const refresh=async()=>{
      try{
        const s=await request<Snapshot>('/players/'+guest.playerId,guest.token);
        if(active){setSnapshot(s);setOffset(Date.parse(s.serverNow)-Date.now());setError('');}
      }catch(e){if(active)setError(e instanceof Error?e.message:'Natija yuklanmadi.');}
    };
    void refresh();
    const t=window.setInterval(()=>{void refresh();},5000);
    return()=>{active=false;window.clearInterval(t);};
  },[guest]);
  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t);},[]);
const activeQuestionId=snapshot?.questions[index]?.id??null;
  useEffect(()=>{
    if(!guest||!snapshot||snapshot.submittedAt||!activeQuestionId)return;
    const path='/players/'+guest.playerId+'/focus';
    const send=(questionId:string|null)=>{
      void request(path,guest.token,{questionId}).catch(()=>{
        // Timing telemetry is auxiliary. Never interrupt a test or overwrite a saved answer.
      });
    };
    const onVisibility=()=>{
      send(document.visibilityState==='visible'?activeQuestionId:null);
    };
    onVisibility();
    const interval=window.setInterval(()=>{
      if(document.visibilityState==='visible')send(activeQuestionId);
    },5000);
    const onPageHide=()=>{
      const url=base+'/assessment-code-guest'+path;
      void fetch(url,{
        method:'POST',cache:'no-store',credentials:'omit',keepalive:true,
        headers:{Authorization:'Test '+guest.token,'Content-Type':'application/json'},
        body:JSON.stringify({questionId:null}),
      }).catch(()=>{});
    };
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',onPageHide);
    return()=>{
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',onPageHide);
    };
  },[guest?.playerId,guest?.token,activeQuestionId,snapshot?.submittedAt]);
  const remaining=snapshot?Math.max(0,Math.ceil((Date.parse(snapshot.deadlineAt)-now-offset)/1000)):0;
  const submit=async()=>{
    if(!guest||busy||snapshot?.submittedAt)return;
    setBusy(true);setError('');
    try{const s=await request<Snapshot>('/players/'+guest.playerId+'/submit',guest.token,{});
      setSnapshot(s);
    }catch(e){setError(e instanceof Error?e.message:'Topshirib bo‘lmadi.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{
    if(snapshot&&!snapshot.submittedAt&&remaining===0&&!timerSubmit.current&&!busy){
      timerSubmit.current=true;void submit();
    }
  },[remaining,snapshot?.submittedAt,busy]);
  const join=async(e:FormEvent)=>{
    e.preventDefault();if(!code||busy)return;
    setBusy(true);setError('');
    try{
      const g=await request<Guest>('/join',undefined,{code,name:name.trim()});
      localStorage.setItem(key(code),JSON.stringify(g));
      setGuest(g);
    }catch(e){setError(e instanceof Error?e.message:'Testga kirib bo‘lmadi.');}
    finally{setBusy(false);}
  };
  const answer=async(choiceIndex:number)=>{
    if(!guest||!snapshot||snapshot.submittedAt||busy||remaining<=0)return;
    const question=snapshot.questions[index];if(!question)return;
    setBusy(true);setError('');
    try{
      await request('/players/'+guest.playerId+'/answers/'+question.id,guest.token,{choiceIndex});
      setSnapshot(prev=>prev?{...prev,questions:prev.questions.map(q=>q.id===question.id?{...q,choiceIndex}:q)}:null);
    }catch(e){setError(e instanceof Error?e.message:'Javob saqlanmadi.');}
    finally{setBusy(false);}
  };
  const go=()=>{
    if(/^\d{6}$/.test(typedPin))window.location.hash='/test/'+typedPin;
    else setError('6 xonali kodni kiriting.');
  };
  const q=snapshot?.questions[index];
  const count=snapshot?.questions.filter(q=>q.choiceIndex!==null).length??0;
  return <main className="qt-guest">
    <header><a href="#/test" className="qt-brand">Cambridge · Online Test</a><span>📝 KOD BILAN TEST</span></header>
    <section className="qt-guest-card">
      {!code&&<form onSubmit={e=>{e.preventDefault();go();}}>
        <span className="qt-eyebrow">1-QADAM</span><h1>Test kodini kiriting</h1>
        <p>O‘qituvchingiz bergan 6 xonali kodni yozing.</p>
        <input autoFocus aria-label="Test kodi" inputMode="numeric" pattern="[0-9]{6}"
          maxLength={6} placeholder="123456" value={typedPin}
          onChange={e=>setTypedPin(e.target.value.replace(/\D/g,'').slice(0,6))}/>
        <button className="qt-primary" type="submit">Davom etish →</button></form>}
      {code&&!guest&&<form onSubmit={e=>{void join(e);}}>
        <span className="qt-eyebrow">2-QADAM · KOD {code}</span>
        <h1>{lobby?.title??'Testga kirish'}</h1>
        {lobby&&<p>{lobby.questionCount} ta savol · {lobby.durationMinutes} daqiqa</p>}
        <label>Ism va familiyangiz<input required autoFocus minLength={2} maxLength={48}
          value={name} placeholder="Masalan: Ali Valiyev" onChange={e=>setName(e.target.value)}/></label>
        <button type="submit" className="qt-primary" disabled={!lobby||busy||name.trim().length<2}>
          {busy?'Kirilmoqda…':'Testni boshlash →'}</button>
        <a className="qt-link" href="#/test">Boshqa kod</a></form>}
      {guest&&!snapshot&&<div className="qt-wait"><h2>Test ochilmoqda…</h2>
        <p>Ism: {guest.name}</p></div>}
      {snapshot&&<div className="qt-work">
        <div className="qt-between"><span>{snapshot.name}</span>
          <span className={remaining<60&&!snapshot.submittedAt?'qt-time low':'qt-time'}>
            {snapshot.submittedAt?'✓ Topshirildi':`⏱ ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}
          </span></div>
        <h1>{snapshot.title}</h1>
        {!snapshot.submittedAt&&q&&<div>
          <div className="qt-progress">{index+1} / {snapshot.questions.length} savol · {count} ta javob saqlandi
            <div><span style={{width:(count/snapshot.questions.length*100)+'%'}}/></div></div>
          <h2>{q.number}. {q.prompt}</h2>
          <div className="qt-options">{q.options.map((option,i)=><button key={i} type="button"
            className={q.choiceIndex===i?'is-selected':''} disabled={busy||remaining===0}
            onClick={()=>{void answer(i);}}>
            <b>{'ABCD'[i]}</b><span>{option}</span>{q.choiceIndex===i&&<strong>✓</strong>}</button>)}</div>
          <div className="qt-nav">
            <button className="qt-muted-btn" type="button" disabled={busy||index===0}
              onClick={()=>setIndex(i=>i-1)}>← Oldingi</button>
            {index+1<snapshot.questions.length?
              <button className="qt-primary" type="button" disabled={busy}
                onClick={()=>setIndex(i=>i+1)}>Keyingi →</button>:
              <button className="qt-primary" type="button" disabled={busy}
                onClick={()=>{if(window.confirm('Testni topshirasizmi? Qayta ishlash mumkin emas.'))void submit();}}>
                Testni topshirish ✓</button>}
          </div>
        </div>}
        {snapshot.submittedAt&&<div className="qt-complete">
          <div className="qt-finish-mark">✓</div><h2>Test yakunlandi!</h2>
          <p>{snapshot.name}, javoblaringiz saqlandi.</p>
          <strong>{snapshot.score} / {snapshot.maxScore}</strong>
          <p>Natijangiz o‘qituvchingiz ekranida ham ko‘rinadi.</p>
        </div>}
      </div>}
      {error&&<p role="alert" className="qt-error">{error}</p>}
    </section>
    <p className="qt-guest-footer">Har bir o‘quvchi bir marta kiradi. Javoblar serverda saqlanadi. Savol oynada ochiq turgan vaqt ham o‘qituvchining hisobotiga yoziladi.</p>
  </main>;
}

