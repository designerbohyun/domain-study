// 2회차 그림: SM 배치, 비트 막대, wave, 지표 시나리오, 점유율 계산기
const ns='http://www.w3.org/2000/svg';
function el(tag,attrs,parent,text){const n=document.createElementNS(ns,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(text!=null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
/* 1.3 die */
(function(){
  const svg=document.getElementById('dieSvg'), panel=document.getElementById('diePanel');
  const off=new Set([3,22,41,57,70,88,95,107,118,126,133,140]);
  const gw=146,gh=118; let idx=0;
  for(let g=0;g<8;g++){
    const gx=8+(g%4)*(gw+10), gy=8+Math.floor(g/4)*(gh+12);
    const gr=el('g',{},svg);
    el('rect',{x:gx,y:gy,width:gw,height:gh,rx:6,fill:'var(--sunk)',stroke:'var(--line)'},gr);
    el('text',{x:gx+8,y:gy+15,'font-size':11,fill:'var(--muted)'},gr,`GPC ${g+1}`);
    for(let t=0;t<9;t++){
      const tx=gx+8+(t%3)*46, ty=gy+22+Math.floor(t/3)*31;
      el('rect',{x:tx-2,y:ty-2,width:42,height:27,rx:4,fill:'none',stroke:'var(--line)','stroke-dasharray':'2 2'},gr);
      for(let s=0;s<2;s++){
        const id=idx++, isOff=off.has(id);
        const r=el('rect',{x:tx+s*20,y:ty,width:18,height:23,rx:3,fill:isOff?'var(--off)':'var(--accent)',tabindex:0,role:'button','aria-label':`SM ${id+1}`,style:'cursor:pointer'},gr);
        const show=()=>{panel.innerHTML=`<div class="k">선택한 칸</div><h4>SM ${id+1}${isOff?' (꺼짐)':''}</h4><p>${isOff?'꺼진 팀입니다. 일감을 받지 않습니다.':'켜진 팀입니다. 일감(블록)을 받아 처리합니다.'}</p><p style="margin:0">GPC ${g+1} 본부, TPC ${t+1} 부서에 속합니다. GPC 하나에는 SM이 18개 있고, 칩 전체 144개 중 132개가 켜져 있습니다.</p>`;};
        r.addEventListener('click',show); r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
      }
    }
  }
  const y2=8+2*(gh+12);
  el('rect',{x:8,y:y2,width:4*gw+30,height:20,rx:4,fill:'var(--mem)'},svg);
  el('text',{x:8+(4*gw+30)/2,y:y2+14,'font-size':11,fill:'var(--surface)','text-anchor':'middle'},svg,'칩 전체 공용: L2 캐시 50MB · HBM 메모리 80GB');
  svg.setAttribute('viewBox',`0 0 ${4*gw+46} ${y2+28}`);
})();

/* 2.4 bit bars */
(function(){
  const F=[['FP64',64],['FP32',32],['FP16 / BF16',16],['FP8',8],['FP4',4]];
  document.getElementById('bitBars').innerHTML=F.map(([n,b])=>`<div class="bar"><span><b>${n}</b></span><div class="track"><div class="fill" style="width:${b/64*100}%;background:var(--accent)"></div></div><span class="v">${b}bit</span></div>`).join('');
})();

/* 1.10 wave */
(function(){
  const svg=document.getElementById('waveSvg'), m=132, cw=4.2, rh=26, lx=56;
  svg.setAttribute('viewBox',`0 0 ${lx+m*cw+10} ${2*rh+8}`);
  svg.style.minWidth='520px';
  [132,1].forEach((used,w)=>{
    el('text',{x:4,y:w*rh+17,'font-size':12,fill:'var(--muted)'},svg,`${w+1}차`);
    for(let s=0;s<m;s++) el('rect',{x:lx+s*cw,y:w*rh+5,width:cw-1,height:rh-10,rx:1,fill:s<used?'var(--accent)':'var(--idle)'},svg);
  });
})();

/* 1.10 metrics */
(function(){
  const SC=[
   {n:'작은 작업이 계속 실행',a:1,occ:0.5,util:100,ten:0,d:'작은 작업 하나가 쉬지 않고 돌고 있습니다. 항상 뭔가 돌고 있으니 GPU-Util은 100%입니다. 하지만 132개 SM 중 1개만 일하고, 나머지 지표는 1%도 안 됩니다.'},
   {n:'큰 행렬 곱셈 (학습)',a:132,occ:0.25,util:100,ten:72,d:'모든 SM이 일하고 Tensor Core도 바쁩니다. 팀 안은 25% 정도만 차 있지만 성능은 좋습니다. 점유율이 낮아도 빠른 사례입니다.'},
   {n:'단순 반복 계산',a:132,occ:0.85,util:100,ten:0,d:'모든 SM이 꽉 차 있지만 Tensor Core는 쓰지 않습니다. 이런 작업은 메모리 속도가 성능을 정합니다.'},
   {n:'요청 사이 공백이 많은 추론',a:96,occ:0.4,util:55,ten:20,d:'작업 사이사이에 대기 시간이 끼어 있어서 GPU-Util부터 낮습니다. 작업이 도는 동안에도 SM을 다 채우지 못합니다. 요청을 묶어서 처리하면 나아집니다.'}
  ];
  let cur=0; const seg=document.getElementById('m-scen'), svg=document.getElementById('mSvg'), bars=document.getElementById('m-bars'), desc=document.getElementById('m-desc');
  seg.innerHTML=SC.map((s,i)=>`<button class="btn" data-i="${i}" type="button">${s.n}</button>`).join('');
  seg.onclick=e=>{const b=e.target.closest('[data-i]');if(b){cur=+b.dataset.i;run();}};
  function run(){
    [...seg.children].forEach((b,i)=>b.classList.toggle('on',i===cur));
    const s=SC[cur]; svg.innerHTML='';
    for(let i=0;i<132;i++){const x=6+(i%12)*32, y=6+Math.floor(i/12)*16; const on=i<s.a;
      el('rect',{x,y,width:29,height:13,rx:2,fill:on?'var(--accent)':'var(--idle)',opacity:on?(0.35+0.65*s.occ):1},svg);}
    const smA=s.a/132*(s.util/100), smO=s.a/132*s.occ*(s.util/100);
    const M=[['GPU-Util',s.util,'var(--muted)'],['SM Active',smA*100,'var(--accent)'],['SM Occupancy',smO*100,'var(--accent)'],['Tensor Active',s.ten*(s.util/100),'var(--tensor)']];
    bars.innerHTML=M.map(([n,v,c])=>`<div class="bar"><span>${n}</span><div class="track"><div class="fill" style="width:${Math.max(1,v)}%;background:${c}"></div></div><span class="v">${v<1&&v>0?v.toFixed(1):Math.round(v)}%</span></div>`).join('');
    desc.textContent=s.d;
  }
  run();
})();

/* 4.4 occupancy calculator */
(function(){
  const R=[32,64,128,255], S=[0,48,100]; let r=0, sm=0;
  const segR=document.getElementById('o-reg'), segS=document.getElementById('o-smem'),
        svg=document.getElementById('oSvg'), panel=document.getElementById('oPanel');
  segR.innerHTML='<span class="note" style="margin:0 6px 0 0;align-self:center">스레드당 레지스터</span>'+R.map((v,i)=>`<button class="btn" data-i="${i}" type="button">${v}개</button>`).join('');
  segS.innerHTML='<span class="note" style="margin:0 6px 0 0;align-self:center">블록당 Shared Memory</span>'+S.map((v,i)=>`<button class="btn" data-i="${i}" type="button">${v}KB</button>`).join('');
  segR.onclick=e=>{const b=e.target.closest('[data-i]');if(b){r=+b.dataset.i;run();}};
  segS.onclick=e=>{const b=e.target.closest('[data-i]');if(b){sm=+b.dataset.i;run();}};
  function run(){
    segR.querySelectorAll('.btn').forEach((b,i)=>b.classList.toggle('on',i===r));
    segS.querySelectorAll('.btn').forEach((b,i)=>b.classList.toggle('on',i===sm));
    const regs=R[r], smem=S[sm], bt=256, wpb=8;
    const lim=[['자리 (조 64개)',Math.floor(64/wpb)],['과제 수 (블록 32개)',32],['메모지 (레지스터)',Math.floor(65536/(regs*bt))],['책상 (Shared Memory)',smem?Math.floor(228/smem):Infinity]];
    const blocks=Math.min(...lim.map(x=>x[1])), warps=blocks*wpb, occ=Math.round(warps/64*100);
    const by=lim.filter(x=>x[1]===blocks).map(x=>x[0]).join(', ');
    svg.innerHTML='';
    for(let c=0;c<8;c++){
      el('text',{x:24+c*38+15,y:14,'font-size':10,fill:'var(--muted)','text-anchor':'middle'},svg,`블록${c+1}`);
      for(let w=0;w<8;w++) el('rect',{x:24+c*38,y:22+w*22,width:30,height:18,rx:3,fill:c<blocks?'var(--accent)':'var(--idle)'},svg);
    }
    panel.innerHTML=`<div class="k">결과</div><h4>점유율 ${occ}%</h4><p>블록 ${blocks}개 × 조 8개 = 조 ${warps}개 (최대 64개)</p><p style="margin:0">막은 한도: <b>${by}</b></p>`;
  }
  run();
})();

