export function Chapter14PracticeQ4({reveal}:{reveal:number}){
  if(reveal<3)return null;
  return <div className="h14v6-practice" style={{gridTemplateColumns:'1fr',marginTop:'.45rem'}}>
    <section className="is-visible">
      <strong>Q4</strong>
      <p>Circuit vs packet switching true/false · explain hop number and checksum · describe how headers and routing tables route packets efficiently.</p>
      <span>ATTEMPT → CHECK → IMPROVE</span>
    </section>
  </div>;
}
