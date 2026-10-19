// 3회차 그림: 스레드 번호 계산기, wave 계산기, 메모리 병합 비교
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
const n0=v=>v.toLocaleString('ko-KR');

/* 2.4 스레드 번호 계산기 */
(function(){
  const svg=document.getElementById('iSvg'), panel=document.getElementById('iPanel');
  const dim=seg('i-dim','블록 크기',[128,256],n0,run,1);
  const blk=seg('i-blk','블록 번호',[0,1,2,3],String,run,2);
  const thr=seg('i-thr','블록 안 번호',[0,5,100,127],String,run,1);
  function run(){
    const d=dim(), b=blk(), t=thr(), i=b*d+t, W=400, bw=W/4;
    svg.innerHTML='';
    for(let k=0;k<4;k++){
      el('rect',{x:10+k*bw,y:40,width:bw-6,height:34,rx:4,fill:'var(--idle)'},svg);
      el('text',{x:10+k*bw+(bw-6)/2,y:30,'font-size':11,fill:'var(--muted)','text-anchor':'middle'},svg,`블록 ${k}`);
      el('text',{x:10+k*bw,y:92,'font-size':10,fill:'var(--muted)'},svg,n0(k*d));
    }
    const x=10+b*bw+(bw-6)*t/d;
    el('rect',{x:x-1.5,y:36,width:4,height:42,rx:1,fill:'var(--accent)'},svg);
    el('text',{x:Math.min(Math.max(x,24),W-10),y:110,'font-size':11,fill:'var(--accent)','text-anchor':'middle'},svg,`${n0(i)}번`);
    panel.innerHTML=`<div class="k">결과</div><h4>${n0(i)}번 원소</h4><p>${b} 곱하기 ${n0(d)} 더하기 ${t}</p><p style="margin:0">블록 하나가 원소 ${n0(d)}개를 맡습니다.</p>`;
  }
  run();
})();

/* 4.4 wave 계산기 */
(function(){
  const svg=document.getElementById('wSvg'), panel=document.getElementById('wPanel');
  const GPU=[{n:'H100 SXM',sm:132,thr:2048},{n:'RTX 4060',sm:24,thr:1536}];
  const gpu=seg('w-gpu','GPU',GPU,g=>`${g.n} (SM ${g.sm})`,run);
  const nn=seg('w-n','데이터 수',[1e5,1e6,1e7],v=>({1e5:'10만',1e6:'100만',1e7:'1,000만'})[v],run,1);
  const bs=seg('w-bs','블록 크기',[128,256,512],n0,run,1);
  function run(){
    const g=gpu(), n=nn(), b=bs();
    const blocks=Math.ceil(n/b), perSM=Math.min(32,Math.floor(g.thr/b)), once=g.sm*perSM;
    const waves=blocks/once, full=Math.floor(blocks/once), rest=blocks-full*once;
    const total=Math.ceil(waves), lastFill=rest?rest/once:1;
    // 그릴 wave 목록: 너무 많으면 앞 3개, 생략, 마지막
    const rows=total<=6?[...Array(total).keys()]:[0,1,2,-1,total-1];
    svg.innerHTML=''; const W=400, rh=28;
    svg.setAttribute('viewBox',`0 0 420 ${rows.length*rh+10}`);
    rows.forEach((w,r)=>{
      const y=6+r*rh;
      if(w<0){el('text',{x:210,y:y+16,'font-size':12,fill:'var(--muted)','text-anchor':'middle'},svg,`… ${total-4}개 생략 …`);return;}
      const f=(w===total-1)?lastFill:1;
      el('text',{x:4,y:y+15,'font-size':11,fill:'var(--muted)'},svg,`${w+1}차`);
      el('rect',{x:44,y:y+2,width:W-44,height:rh-10,rx:3,fill:'var(--idle)'},svg);
      el('rect',{x:44,y:y+2,width:(W-44)*f,height:rh-10,rx:3,fill:'var(--accent)'},svg);
      el('text',{x:W+14,y:y+15,'font-size':10,fill:'var(--muted)','text-anchor':'end'},svg,`${Math.round(f*100)}%`);
    });
    panel.innerHTML=`<div class="k">결과</div><h4>약 ${waves<10?waves.toFixed(1):Math.round(waves)} wave</h4>`+
      `<p>블록 ${n0(blocks)}개, 한 번에 ${n0(once)}개 (SM ${g.sm}개 곱하기 ${perSM}개)</p>`+
      `<p style="margin:0">마지막 wave는 약 ${Math.round(lastFill*100)}%만 찹니다.</p>`;
  }
  run();
})();

/* 5.4 메모리 병합 비교 */
(function(){
  const svg=document.getElementById('cSvg'), desc=document.getElementById('c-desc');
  const mode=seg('c-mode','읽는 주소',['이웃한 주소','흩어진 주소'],String,run);
  function run(){
    const scattered=mode()==='흩어진 주소', stride=scattered?32:1, cells=32*stride, cw=scattered?3:12, x0=10;
    const W=x0*2+cells*cw;
    svg.setAttribute('viewBox',`0 0 ${W} 120`); svg.style.minWidth=scattered?'640px':'';
    svg.innerHTML='';
    const used=new Set([...Array(32).keys()].map(t=>t*stride));
    const segs=new Set([...used].map(c=>Math.floor(c/8)));
    // 메모리 묶음(8칸)
    for(let s=0;s<cells/8;s++) el('rect',{x:x0+s*8*cw,y:70,width:8*cw-1,height:26,rx:2,fill:segs.has(s)?'var(--mem)':'var(--idle)'},svg);
    for(const c of used) el('rect',{x:x0+c*cw+0.5,y:74,width:Math.max(cw-1.5,1.5),height:18,fill:'var(--accent)'},svg);
    // 스레드 32개
    const tw=(W-2*x0)/32;
    for(let t=0;t<32;t++){
      const tx=x0+t*tw+tw/2, cx=x0+t*stride*cw+cw/2;
      el('rect',{x:x0+t*tw+1,y:8,width:tw-2,height:16,rx:2,fill:'var(--accent)'},svg);
      el('line',{x1:tx,y1:24,x2:cx,y2:72,stroke:'var(--muted)','stroke-width':0.6,opacity:0.6},svg);
    }
    el('text',{x:x0,y:112,'font-size':11,fill:'var(--muted)'},svg,`읽어 오는 32바이트 묶음: ${segs.size}개`);
    desc.textContent=scattered
      ?'스레드 32개가 서로 멀리 떨어진 주소를 읽습니다. 묶음 32개를 따로 읽어야 해서, 실제로 쓰는 데이터는 읽어 온 양의 8분의 1뿐입니다.'
      :'스레드 32개가 이웃한 주소를 읽습니다. 128바이트가 32바이트 묶음 4개에 딱 들어가서, 네 번만 읽으면 됩니다.';
  }
  run();
})();
