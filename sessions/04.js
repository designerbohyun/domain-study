// 4회차 그림: 형식별 저장해 보기, FP8 배율 계산기, INT8 이상값 눈금
const ns='http://www.w3.org/2000/svg';
function el(tag,attrs,parent,text){const n=document.createElementNS(ns,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(text!=null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
// 버튼 묶음: label 뒤에 값 버튼들, 누르면 on 표시 후 콜백. def는 처음 고른 값의 순서
function seg(id,label,vals,fmt,cb,def=0){
  const box=document.getElementById(id); let cur=def;
  box.innerHTML=`<span class="note" style="margin:0 6px 0 0;align-self:center">${label}</span>`+vals.map((v,i)=>`<button class="btn" data-i="${i}" type="button">${fmt(v)}</button>`).join('');
  const mark=()=>box.querySelectorAll('.btn').forEach((b,i)=>b.classList.toggle('on',i===cur));
  box.onclick=e=>{const b=e.target.closest('[data-i]');if(b){cur=+b.dataset.i;mark();cb();}};
  mark(); return ()=>vals[cur];
}
const pct=v=>(v*100).toFixed(v<0.01?3:1)+'%';

// 지수 e비트, 가수 m비트 실수로 반올림 (가장 가까운 값, 동점은 짝수 쪽). 넘치면 ±Infinity
function rnd(v){const f=Math.floor(v),d=v-f;return d>0.5||(d===0.5&&f%2)?f+1:f;}
function toFloat(x,e,m,max){
  if(x===0)return 0;
  const emin=2-2**(e-1), ax=Math.abs(x);
  const ex=Math.max(Math.floor(Math.log2(ax)),emin), step=2**(ex-m);
  const r=rnd(ax/step)*step;
  return Math.sign(x)*(r>max?Infinity:r);
}
// 반올림된 값 r을 부호·지수·가수 비트 문자열로
function bits(r,e,m){
  const s=r<0||Object.is(r,-0)?'1':'0', ar=Math.abs(r), bias=2**(e-1)-1, emin=1-bias;
  if(ar===0)return [s,'0'.repeat(e),'0'.repeat(m)];
  if(!isFinite(ar))return [s,'1'.repeat(e),(e===4?'1':'0').repeat(m)];
  let ex=Math.floor(Math.log2(ar)), E, M;
  if(ex<emin){E=0;M=Math.round(ar/2**(emin-m));}
  else{E=ex+bias;M=Math.round((ar/2**ex-1)*2**m);if(M===2**m){M=0;E++;}}
  return [s,E.toString(2).padStart(e,'0'),M.toString(2).padStart(m,'0')];
}

/* 맨 위: 숫자 하나를 형식별로 저장해 보기 */
(function(){
  const svg=document.getElementById('fSvg');
  const F=[
    {n:'FP32',e:8,m:23,q:x=>Math.fround(x)},
    {n:'BF16',e:8,m:7,max:3.3895e38},
    {n:'FP16',e:5,m:10,max:65504},
    {n:'FP8 E4M3',e:4,m:3,max:448},
    {n:'FP8 E5M2',e:5,m:2,max:57344},
  ];
  const num=seg('f-num','숫자',[0.1,1.001,3.14159,300,70000,0.00001],v=>v.toLocaleString('en-US',{maximumSignificantDigits:6}),run,1);
  function run(){
    const x=num(); svg.innerHTML='';
    const W=11, x0=86;
    F.forEach((f,i)=>{
      const y=20+i*46, r=f.q?f.q(x):toFloat(x,f.e,f.m,f.max);
      let b;
      if(f.q){const u=new Uint32Array(new Float32Array([x]).buffer)[0].toString(2).padStart(32,'0');b=[u[0],u.slice(1,9),u.slice(9)];}
      else b=bits(r,f.e,f.m);
      el('text',{x:0,y:y+15,'font-size':12,'font-weight':700,fill:'var(--ink)'},svg,f.n);
      let k=0;
      [['var(--off)',b[0]],['var(--accent)',b[1]],['var(--tensor)',b[2]]].forEach(([c,str])=>{
        for(const ch of str){el('rect',{x:x0+k*W,y,width:W-2,height:20,rx:2,fill:c,opacity:ch==='1'?1:.22},svg);k++;}
      });
      let txt, col='var(--ink)';
      if(!isFinite(r)){txt=f.e===4?'넘침 (448까지만 담음)':'넘침, 무한대가 됨';col='var(--off)';}
      else if(r===0){txt='0으로 사라짐';col='var(--off)';}
      else{const err=Math.abs(r-x)/Math.abs(x);txt=`${r.toPrecision(7).replace(/\.?0+$/,'').replace(/\.?0+e/,'e')}  (차이 ${err===0?'0':pct(err)})`;}
      el('text',{x:x0+32*W+8,y:y+15,'font-size':12,fill:col},svg,txt);
    });
  }
  run();
})();

/* 4.4 FP8 배율 계산기 */
(function(){
  const svg=document.getElementById('sSvg'), panel=document.getElementById('sPanel');
  const base=[0.12,-0.35,0.8,-0.05,0.02,0.6,-0.9,0.27,-0.15,0.004,0.45,-0.7,0.09,-0.003,0.33,-0.52];
  const OUT=5;
  const out=seg('s-out','큰 값',[null,50,5000],v=>v===null?'없음':v.toLocaleString('ko-KR'),run,2);
  const mode=seg('s-mode','배율 단위',['tensor','block'],v=>v==='tensor'?'텐서 하나에 1개':'8개 묶음마다 1개',run);
  const e4=v=>toFloat(v,4,3,448);
  function run(){
    const o=out(), xs=base.slice(); if(o!==null)xs[OUT]=o;
    const groups=mode()==='tensor'?[[0,16]]:[[0,8],[8,16]];
    const q=new Array(16), scales=[];
    for(const [a,b] of groups){
      const amax=Math.max(...xs.slice(a,b).map(Math.abs)), s=amax/448; scales.push(s);
      for(let i=a;i<b;i++)q[i]=e4(xs[i]/s)*s;
    }
    let errSum=0, zeros=0, cnt=0;
    xs.forEach((x,i)=>{if(o!==null&&i===OUT)return;cnt++;errSum+=Math.abs(q[i]-x)/Math.abs(x);if(q[i]===0)zeros++;});
    svg.innerHTML='';
    const H=80, mid=110, bw=420/16, sc=H/0.9;
    el('line',{x1:0,x2:420,y1:mid,y2:mid,stroke:'var(--line)'},svg);
    if(groups.length>1)el('line',{x1:210,x2:210,y1:10,y2:210,stroke:'var(--muted)','stroke-dasharray':'3 3'},svg);
    xs.forEach((x,i)=>{
      const cx=i*bw+bw/2, big=o!==null&&i===OUT;
      const h=big?H+15:x*sc;
      el('rect',{x:cx-bw*0.32,y:h>0?mid-h:mid,width:bw*0.64,height:Math.abs(h),rx:2,fill:big?'var(--tensor)':'var(--idle)'},svg);
      if(big){el('text',{x:cx,y:mid-H-20,'font-size':10,fill:'var(--muted)','text-anchor':'middle'},svg,x.toLocaleString('ko-KR'));return;}
      const zero=q[i]===0;
      el('circle',{cx,cy:mid-q[i]*sc,r:4,fill:zero?'var(--off)':'var(--accent)'},svg);
    });
    const sTxt=scales.map(s=>s.toPrecision(3)).join(', ');
    panel.innerHTML=`<div class="k">결과 (큰 값 제외)</div><h4>평균 오차 ${pct(errSum/cnt)}</h4><p>0으로 뭉개진 값: ${zeros}개</p><p style="margin:0">배율: ${sTxt}</p>`;
  }
  run();
})();

/* 5.7 INT8 이상값과 눈금 */
(function(){
  const svg=document.getElementById('qSvg'), panel=document.getElementById('qPanel');
  let seed=7; const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const xs=Array.from({length:200},()=>(rand()+rand()+rand())/1.5-1); // 0 근처에 몰린 -1~1 값
  const out=seg('q-out','큰 값',[null,10,100],v=>v===null?'없음':String(v),run,2);
  function run(){
    const o=out(), amax=Math.max(...xs.map(Math.abs),o||0), s=amax/127;
    const used=new Set(xs.map(x=>Math.round(x/s))), oq=o?Math.round(o/s):null;
    svg.innerHTML='';
    const w=400/256;
    for(let q=-128;q<=127;q++){
      const c=q===oq?'var(--tensor)':used.has(q)?'var(--accent)':'var(--idle)';
      el('rect',{x:10+(q+128)*w,y:40,width:Math.max(w-0.4,0.8),height:50,fill:c},svg);
    }
    [[-128,'-128'],[0,'0'],[127,'127']].forEach(([q,t])=>el('text',{x:10+(q+128)*w+w/2,y:108,'font-size':11,fill:'var(--muted)','text-anchor':'middle'},svg,t));
    el('text',{x:10,y:28,'font-size':11,fill:'var(--muted)'},svg,'INT8 눈금 256칸');
    panel.innerHTML=`<div class="k">결과</div><h4>보통 값이 쓰는 칸: ${used.size}칸</h4><p>256칸 중 ${pct(used.size/256)}</p><p style="margin:0">배율: ${s.toPrecision(3)}</p>`;
  }
  run();
})();
