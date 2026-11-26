(() => {
  "use strict";
  const prefix = "knou.cs.scores.v1.";
  const preference = prefix + "preference";
  const records = prefix + "attempt.";
  const subjects = {"computer-arch":"컴퓨터구조","simulation":"시뮬레이션","cloud-computing":"클라우드컴퓨팅","ai-literacy":"AI리터러시","intro-cs":"컴퓨터과학개론","compiler":"컴파일러구성","opensource-data":"오픈소스기반데이터분석"};
  const notice = "풀이 기록은 이 기기의 현재 브라우저에만 저장됩니다. 다른 기기나 브라우저에는 자동으로 옮겨지지 않으며, 이 사이트의 데이터를 삭제하면 기록도 지워집니다.";
  const get = id => document.getElementById(id);
  function node(tag, value) {
    const el = document.createElement(tag);
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function button(label, action) {
    const el = node("button",label);
    el.type = "button";
    el.onclick = action;
    return el;
  }
  function readRecords() {
    return Object.keys(localStorage).filter(k => k.startsWith(records)).map(k => JSON.parse(localStorage.getItem(k))).sort((a,b) => a.date - b.date);
  }
  let current;
  window.showScoreReceipt = function(result) {
    const box = get("score-receipt");
    if (!box || current) return;
    const [subject, file] = location.pathname.split("/").slice(-2);
    current = {...result, subject, exam: decodeURIComponent(file).replace(/\.html$/,""), date: Date.now()};
    const key = records + (globalThis.crypto?.randomUUID?.() || (Date.now()+"-"+Math.random()));
    const link = node("a","내 풀이 기록 보기 →");
    link.href = "../scores.html";
    function finish(message) {box.replaceChildren(node("p",message),link);}
    function save() {
      try {
        localStorage.setItem(key, JSON.stringify(current));
        finish("이번 풀이 결과를 저장했습니다.");
      } catch {finish("풀이 기록을 저장하지 못했습니다. 브라우저의 사이트 데이터 설정과 남은 공간을 확인해 주세요.");}
    }
    function choose(enabled) {
      try {localStorage.setItem(preference, enabled ? "on" : "off");}
      catch {finish("브라우저에서 저장 설정을 기록할 수 없습니다.");return;}
      if (enabled) save(); else finish("풀이 기록 저장이 꺼져 있습니다.");
    }
    try {
      const value = localStorage.getItem(preference);
      if (value === "on") save();
      else if (value === "off") finish("풀이 기록 저장이 꺼져 있습니다.");
      else box.replaceChildren(node("h3","이번부터 풀이 결과를 이 브라우저에 저장할까요?"),node("p",notice),button("이번부터 저장",()=>choose(true)),button("저장하지 않기",()=>choose(false)));
    } catch {finish("이 브라우저에서는 풀이 기록 저장을 사용할 수 없습니다.");}
  };
  if (!get("scores-page")) return;
  const subject = get("subject"), kind = get("kind"), pick = get("save");
  for (const [key,name] of Object.entries(subjects)) subject.add(new Option(name,key));
  const percent = r => Math.round(100*r.correct/r.total);
  const examName = r => r.exam === "mock" ? "모의시험" : r.exam + "년 기출";
  const avg = arr => Math.round(arr.reduce((n,r)=>n+percent(r),0)/arr.length);
  function trend(arr) {
    const latest = arr.at(-1);
    if (!latest) return "";
    if (latest.exam === "mock") {
      if (arr.length < 6) return "모의시험 6회부터 최근 3회와 직전 3회의 평균을 비교합니다.";
      const a=avg(arr.slice(-6,-3)), b=avg(arr.slice(-3));
      return "직전 3회 평균 "+a+"점 → 최근 3회 평균 "+b+"점 · "+change(b-a,"점");
    }
    if (arr.length < 2) return "같은 연도 기출을 다시 풀면 직전 기록과 비교할 수 있습니다.";
    return examName(latest)+" 직전 풀이 대비 "+change(latest.correct-arr.at(-2).correct,"문항");
  }
  function change(n,unit) {return n===0 ? "변화 없음" : Math.abs(n)+unit+(n>0?" 상승":" 하락");}
  function drawGraph(rows) {
    const svg=get("graph");svg.replaceChildren();
    const make=(tag,attrs)=>{const e=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;};
    for(const p of [0,50,100]){
      const y=110-p;make("line",{x1:40,y1:y,x2:590,y2:y,stroke:"#d0d9e2"});
      make("text",{x:4,y:y+4,"font-size":12}).textContent=p;
    }
    const pts=rows.map((r,i)=>[rows.length===1?315:40+i*550/(rows.length-1),110-percent(r)]);
    make("polyline",{points:pts.map(p=>p.join(",")).join(" "),fill:"none",stroke:"#126481","stroke-width":2});
    pts.forEach(([cx,cy],i)=>{const dot=make("circle",{cx,cy,r:3.5,fill:rows[i].exam==="mock"?"#146c80":"#78479c"});const title=document.createElementNS(svg.namespaceURI,"title");title.textContent=examName(rows[i])+" · "+percent(rows[i])+"점";dot.append(title);});
  }
  function refresh() {
    try {
      const all=readRecords();pick.checked=localStorage.getItem(preference)==="on";
      const data=all.filter(r=>r.subject===subject.value && (kind.value==="all" || (r.exam==="mock"?"mock":"past")===kind.value));
      get("delete").disabled=!all.length;
      const panel=get("results");panel.hidden=!data.length;
      get("empty").textContent=data.length?"":"선택한 과목과 시험 유형에 저장된 풀이 기록이 없습니다.";
      if(!data.length)return;
      const last=data.at(-1);
      get("summary").textContent=data.length+"회 응시 · 최근 "+percent(last)+"점 · 최고 "+Math.max(...data.map(percent))+"점";
      drawGraph(data);
      const trends=get("trends");trends.replaceChildren();
      for(const exam of new Set(data.map(r=>r.exam)))trends.append(node("p",trend(data.filter(r=>r.exam===exam))));
      const units=new Map();
      for(const r of data)for(const [name,u] of Object.entries(r.units)){
        const sum=units.get(name)||{ok:0,total:0};sum.ok+=u.ok;sum.total+=u.total;units.set(name,sum);
      }
      const tbody=get("units");tbody.replaceChildren();
      for(const [name,u] of units){let delta = "—";
        if(kind.value==="mock" && data.length>=6){
          const sums=data.slice(-6).map(r=>r.units[name]||{ok:0,total:0});
          const fraction=list=>[list.reduce((n,x)=>n+x.ok,0),list.reduce((n,x)=>n+x.total,0)];
          const a=fraction(sums.slice(0,3)), b=fraction(sums.slice(3));
          delta=a.join("/")+" → "+b.join("/");
        }
        const tr=node("tr");for(const v of [name,u.ok+" / "+u.total,Math.round(100*u.ok/u.total)+"%",delta])tr.append(node("td",v));tbody.append(tr);}
      const history=get("history");history.replaceChildren();
      for(const r of data.slice().reverse()){
        const d=node("details");d.append(node("summary",new Date(r.date).toLocaleString("ko-KR")+" · "+examName(r)+" · "+r.correct+"/"+r.total+" ("+percent(r)+"점)"),node("pre",r.report));history.append(d);
      }
    } catch {get("empty").textContent="저장된 기록을 읽을 수 없습니다. 브라우저의 사이트 데이터 설정을 확인해 주세요.";get("results").hidden=true;}
  }
  subject.onchange=kind.onchange=refresh;
  pick.onchange=()=>{try{localStorage.setItem(preference,pick.checked?"on":"off");get("message").textContent=pick.checked?"앞으로 제출하는 풀이 결과를 저장합니다.":"자동 저장을 껐습니다. 기존 기록은 유지됩니다.";}catch{pick.checked=!pick.checked;get("message").textContent="설정을 저장할 수 없습니다.";}};
  get("delete").onclick=()=>{if(!confirm("이 브라우저에 저장된 모든 과목의 풀이 기록을 삭제할까요? 되돌릴 수 없습니다."))return;try{for(const k of Object.keys(localStorage))if(k.startsWith(records))localStorage.removeItem(k);refresh();get("message").textContent="저장된 풀이 기록을 모두 삭제했습니다.";}catch{get("message").textContent="삭제를 완료하지 못했습니다.";}};
  window.addEventListener("storage",refresh);
  try {const last=readRecords().at(-1);if(last && subjects[last.subject])subject.value=last.subject;} catch {}
  get("notice").textContent=notice;refresh();
})();

