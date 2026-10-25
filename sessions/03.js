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
    svg.innerHTML=''; const W=380, rh=28;
    svg.setAttribute('viewBox',`0 0 420 ${rows.length*rh+10}`);
    rows.forEach((w,r)=>{
      const y=6+r*rh;
      if(w<0){el('text',{x:210,y:y+16,'font-size':12,fill:'var(--muted)','text-anchor':'middle'},svg,`… ${total-4}개 생략 …`);return;}
      const f=(w===total-1)?lastFill:1;
      el('text',{x:4,y:y+15,'font-size':11,fill:'var(--muted)'},svg,`${w+1}차`);
      el('rect',{x:44,y:y+2,width:W-44,height:rh-10,rx:3,fill:'var(--idle)'},svg);
      el('rect',{x:44,y:y+2,width:(W-44)*f,height:rh-10,rx:3,fill:'var(--accent)'},svg);
      el('text',{x:418,y:y+15,'font-size':10,fill:'var(--muted)','text-anchor':'end'},svg,`${Math.round(f*100)}%`);
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
    const scattered=mode()==='흩어진 주소', stride=scattered?32:1, cells=32*stride, cw=scattered?3:18, x0=10;
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

/* 구조도 (도입, 1.3, 3.3, 3.9, 4.3, 5.3, 5.4) */
const R=(p,x,y,w,h,a={})=>el('rect',Object.assign({x,y,width:w,height:h,rx:a.rx??4},a),p);
const T=(p,x,y,s,a={})=>el('text',Object.assign({x,y,'font-size':a.fs??11,fill:'var(--ink)'},a),p,s);
const L=(p,x1,y1,x2,y2,a={})=>el('line',Object.assign({x1,y1,x2,y2,stroke:'var(--muted)','stroke-width':1},a),p);
const mid={'text-anchor':'middle'};
const zoom={stroke:'var(--accent)','stroke-dasharray':'3 3','stroke-opacity':.7};
// 화살표: 처음 부를 때 svg 안에 marker를 만든다
function A(s,x1,y1,x2,y2){
  if(!s.querySelector('#ah-'+s.id)){const m=el('marker',{id:'ah-'+s.id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},el('defs',{},s));el('path',{d:'M0,0L10,5L0,10z',fill:'var(--muted)'},m);}
  L(s,x1,y1,x2,y2,{'marker-end':`url(#ah-${s.id})`});
}
const on=(hit,c='var(--accent)')=>({fill:hit?c:'none','fill-opacity':hit?.2:1,stroke:hit?c:'var(--line)','stroke-width':hit?2:1});

/* 도입: 커널 → 그리드 → 블록 → warp → 스레드 */
(function(){
  const s=document.getElementById('hierSvg'); if(!s) return;
  const P=(x,w,title,foot,sub)=>{R(s,x,26,w,140,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,x+w/2,18,title,{...mid,fill:'var(--muted)'});T(s,x+w/2,186,foot,{...mid,'font-weight':700,fs:12});if(sub)T(s,x+w/2,202,sub,{...mid,fill:'var(--muted)',fs:10});};
  P(8,96,'커널 실행 1번','그리드 1개','scale<<<3907, 256>>>');
  R(s,20,62,72,64,{rx:6,fill:'var(--accent)','fill-opacity':.15,stroke:'var(--accent)','stroke-width':2});
  T(s,56,84,'scale',{...mid,'font-weight':700});T(s,56,102,'숫자마다',{...mid,fs:10,fill:'var(--muted)'});T(s,56,116,'2 곱하기',{...mid,fs:10,fill:'var(--muted)'});
  P(124,150,'그리드','블록 3,907개','그림은 일부만');
  for(let i=0;i<60;i++){const c=i%10,r=Math.floor(i/10),hit=c===9&&r===1;R(s,131+c*14,40+r*19,12,15,{rx:2,...on(hit),fill:hit?'var(--accent)':'var(--accent)','fill-opacity':hit?1:.25,stroke:'none'});}
  P(294,140,'블록 하나','warp 8개','스레드 256개');
  for(let r=0;r<8;r++){const hit=r===2;T(s,302,44+r*15,`w${r}`,{fs:8,fill:'var(--muted)'});R(s,320,35+r*15,104,11,{rx:2,fill:hit?'var(--tensor)':'var(--accent)','fill-opacity':hit?1:.25});}
  P(454,110,'warp 하나','스레드 32개','하드웨어가 묶음');
  for(let i=0;i<32;i++){const c=i%8,r=Math.floor(i/8),hit=i===6;R(s,463+c*12,58+r*16,10,12,{rx:2,fill:hit?'var(--accent)':'var(--tensor)','fill-opacity':hit?1:.55});}
  P(584,50,'스레드','숫자 1개');
  R(s,594,72,30,30,{rx:4,fill:'var(--accent)'});T(s,609,126,'× 2',{...mid,'font-weight':700});
  L(s,104,62,124,26,zoom);L(s,104,126,124,166,zoom);
  L(s,269,59,294,26,zoom);L(s,269,74,294,166,zoom);
  L(s,424,65,454,26,zoom);L(s,424,76,454,166,zoom);
  L(s,545,58,584,26,zoom);L(s,545,70,584,166,zoom);
  s.setAttribute('viewBox','0 0 640 210');
})();

/* 1.3 실행 경로 */
(function(){
  const s=document.getElementById('pathSvg'); if(!s) return;
  R(s,8,66,88,64,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,52,94,'CPU',{...mid,'font-weight':700,fs:12});T(s,52,112,'실행 지시',{...mid,fs:10,fill:'var(--muted)'});
  A(s,98,98,124,98);
  R(s,126,54,150,88,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,201,46,'스트림 (대기열)',{...mid,fill:'var(--muted)'});
  ['scale','다음 지시','다음 지시'].forEach((k,i)=>{const hit=i===0;R(s,134+i*46,76,42,44,{rx:4,fill:hit?'var(--accent)':'var(--idle)','fill-opacity':hit?.9:1});T(s,155+i*46,102,k,{...mid,fs:9,fill:hit?'var(--surface)':'var(--muted)'});});
  T(s,201,134,'먼저 넣은 지시부터',{...mid,fs:9,fill:'var(--muted)'});
  A(s,278,98,304,98);
  R(s,306,66,112,64,{rx:8,fill:'var(--idle)',stroke:'var(--line)'});T(s,362,92,'GigaThread',{...mid,'font-weight':700});T(s,362,108,'Engine',{...mid,'font-weight':700});T(s,362,123,'블록을 나눠 줌',{...mid,fs:9,fill:'var(--muted)'});
  R(s,444,14,188,172,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,538,32,'SM 132개',{...mid,'font-weight':700});
  for(let i=0;i<12;i++){const c=i%4,r=Math.floor(i/3)%4,x=456+(i%4)*44,y=44+Math.floor(i/4)*44;
    if(i===11){T(s,x+18,y+24,'…',{...mid,fill:'var(--muted)',fs:14});continue;}
    R(s,x,y,38,36,{rx:4,fill:'var(--surface)',stroke:'var(--line)'});T(s,x+19,y+13,'SM',{...mid,fs:8,fill:'var(--muted)'});
    for(let b=0;b<2;b++)R(s,x+6+b*14,y+18,11,11,{rx:2,fill:'var(--accent)'});}
  [62,106,150].forEach(y=>A(s,418,98,454,y));
  T(s,538,180,'칸 하나 = 블록 하나',{...mid,fs:9,fill:'var(--muted)'});
  s.setAttribute('viewBox','0 0 640 196');
})();

/* 3.3 SM에 올라간 블록 하나 */
(function(){
  const s=document.getElementById('blockSvg'); if(!s) return;
  R(s,8,8,624,228,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});T(s,20,27,'SM 하나',{'font-weight':700,fs:12});
  R(s,20,36,600,146,{rx:8,fill:'var(--surface)',stroke:'var(--accent)','stroke-width':1.5});
  T(s,32,54,'블록 하나 · 스레드 256개 = warp 8개',{'font-weight':700});
  for(let r=0;r<8;r++){T(s,32,72+r*14,`warp ${r}`,{fs:9,fill:'var(--muted)'});
    for(let c=0;c<32;c++)R(s,100+c*16,63+r*14,13,10,{rx:2,fill:'var(--accent)','fill-opacity':.8});}
  T(s,612,54,'칸 하나 = 스레드 하나 · 자기 레지스터',{'text-anchor':'end',fs:9,fill:'var(--muted)'});
  [140,320,500].forEach(x=>{L(s,x,184,x,196,{stroke:'var(--mem)','stroke-width':2});});
  R(s,20,198,600,28,{rx:4,fill:'var(--mem)'});T(s,320,216,'Shared Memory · 블록의 스레드 256개가 함께 씀 (기본 48KB, 최대 227KB)',{...mid,fill:'var(--surface)'});
  s.setAttribute('viewBox','0 0 640 244');
})();

/* 3.9 협력 범위 */
(function(){
  const s=document.getElementById('scopeSvg'); if(!s) return;
  R(s,8,8,624,224,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});
  T(s,20,27,'그리드 전체',{'font-weight':700,fs:12});T(s,104,27,'· 공유: VRAM · 커널을 나눠야 함 · 가장 느림',{fill:'var(--muted)'});
  R(s,20,38,424,184,{rx:8,fill:'var(--surface)',stroke:'var(--line)','stroke-dasharray':'4 3'});
  T(s,32,56,'Cluster (블록 최대 8개)',{'font-weight':700});T(s,32,71,'공유: Distributed Shared Memory · 중간',{fs:10,fill:'var(--muted)'});
  [[32,1],[238,.5]].forEach(([x,o])=>{
    R(s,x,80,196,132,{rx:6,fill:'var(--mem)','fill-opacity':.12*o+.04,stroke:'var(--mem)','stroke-opacity':o});
    T(s,x+10,98,'블록',{'font-weight':700,'fill-opacity':o});T(s,x+40,98,'· 공유: Shared Memory · 빠름',{fs:9,fill:'var(--muted)','fill-opacity':o});
    for(let w=0;w<3;w++){const hit=w===0&&o===1;
      R(s,x+10,108+w*32,176,24,{rx:4,fill:hit?'var(--accent)':'var(--accent)','fill-opacity':hit?1:.2*o});
      if(hit){T(s,x+18,124,'warp · shuffle',{fill:'var(--surface)','font-weight':700,fs:10});T(s,x+178,124,'가장 빠름',{'text-anchor':'end',fill:'var(--surface)',fs:10});}
      else T(s,x+18,124+w*32,'warp',{fs:10,fill:'var(--muted)','fill-opacity':o});}
  });
  R(s,456,38,164,86,{rx:8,fill:'none',stroke:'var(--line)','stroke-dasharray':'4 3'});T(s,538,78,'다른 Cluster',{...mid,fill:'var(--muted)'});T(s,538,94,'직접 못 주고받음',{...mid,fs:9,fill:'var(--muted)'});
  R(s,456,136,164,86,{rx:8,fill:'none',stroke:'var(--line)','stroke-dasharray':'4 3'});T(s,538,184,'…',{...mid,fill:'var(--muted)',fs:16});
  s.setAttribute('viewBox','0 0 640 240');
})();

/* 4.3 1차원 그리드 */
(function(){
  const s=document.getElementById('g1Svg'); if(!s) return;
  const B=[[10,'블록 0','숫자 0~255',16],[135,'블록 1','숫자 256~511',16],[260,'블록 2','숫자 512~767',16],[480,'블록 3,906 (마지막)','숫자 999,936~999,999',4]];
  B.forEach(([x,top,bot,used])=>{T(s,x,30,top,{'font-weight':700,fs:10});
    for(let c=0;c<16;c++)R(s,x+c*7.2,38,6,36,{rx:1.5,fill:c<used?'var(--accent)':'var(--idle)'});
    T(s,x,92,bot,{fs:10,fill:'var(--muted)'});});
  T(s,425,60,'…',{...mid,fill:'var(--muted)',fs:18});T(s,425,92,'블록 3,903개 더',{...mid,fs:9,fill:'var(--muted)'});
  T(s,480,108,'남는 스레드 192개는 쉼',{fs:10,fill:'var(--muted)'});
  T(s,10,120,'세로 막대 하나 = 스레드 16개 (숫자 16개)',{fs:9,fill:'var(--muted)'});
  s.setAttribute('viewBox','0 0 640 128');
})();

/* 4.3 2차원 그리드 */
(function(){
  const s=document.getElementById('g2Svg'); if(!s) return;
  const W=360,H=W*1080/1920,cw=W/120,ch=H/68,x0=10,y0=16,bc=30,br=20;
  R(s,x0,y0,W,H,{rx:0,fill:'var(--accent)','fill-opacity':.12,stroke:'var(--line)'});
  for(let c=1;c<120;c++)L(s,x0+c*cw,y0,x0+c*cw,y0+H,{stroke:'var(--accent)','stroke-opacity':c%10?.12:.35,'stroke-width':.5});
  for(let r=1;r<68;r++)L(s,x0,y0+r*ch,x0+W,y0+r*ch,{stroke:'var(--accent)','stroke-opacity':r%10?.12:.35,'stroke-width':.5});
  const bx=x0+bc*cw,by=y0+br*ch;R(s,bx,by,cw,ch,{rx:0,fill:'var(--accent)'});
  T(s,x0+W/2,y0+H+18,'가로 블록 120개',{...mid,fs:10,fill:'var(--muted)'});
  T(s,x0+W+8,y0+H/2,'세로 68개',{fs:10,fill:'var(--muted)'});
  const px=440,py=16,cs=11.5;
  for(let i=0;i<256;i++){const c=i%16,r=Math.floor(i/16),hit=c===5&&r===3;R(s,px+c*cs,py+r*cs,cs-1.5,cs-1.5,{rx:1,fill:'var(--accent)','fill-opacity':hit?1:.3});}
  L(s,bx+cw,by,px,py,zoom);L(s,bx+cw,by+ch,px,py+16*cs-1.5,zoom);
  T(s,px+92,py+16*cs+16,'블록 하나 · 16 × 16 = 스레드 256개',{...mid,'font-weight':700,fs:10});
  T(s,px+92,py+16*cs+32,'칸 하나 = 스레드 하나 = 픽셀 하나',{...mid,fs:9,fill:'var(--muted)'});
  s.setAttribute('viewBox','0 0 640 250');
})();

/* 5.3 블록을 warp로 나누기 */
(function(){
  const s=document.getElementById('warpSvg'); if(!s) return;
  [[0,'lane 0'],[6,'6'],[31,'31']].forEach(([c,k])=>T(s,176+c*14,16,k,{...mid,fs:9,fill:'var(--muted)'}));
  for(let r=0;r<8;r++){const y=24+r*26;
    T(s,10,y+13,`warp ${r}`,{'font-weight':700,fs:11});T(s,62,y+13,`스레드 ${r*32}~${r*32+31}`,{fs:9,fill:'var(--muted)'});
    for(let c=0;c<32;c++){const hit=r===2&&c===6;R(s,170+c*14,y,12,18,{rx:2,fill:hit?'var(--tensor)':'var(--accent)','fill-opacity':hit?1:.7});}}
  T(s,170,242,'70번 스레드: 70 ÷ 32 = 몫 2, 나머지 6  →  warp 2의 lane 6',{fs:11,'font-weight':700});
  s.setAttribute('viewBox','0 0 640 250');
})();

/* 5.4 분기 */
(function(){
  const s=document.getElementById('divSvg'); if(!s) return;
  const panel=(x,title,rows,foot)=>{
    R(s,x,8,306,150,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,x+12,28,title,{'font-weight':700});
    rows.forEach(([lab,f],i)=>{const y=44+i*40;T(s,x+12,y+17,lab,{fs:10,fill:'var(--muted)'});
      for(let c=0;c<32;c++)R(s,x+52+c*7.6,y,6.4,26,{rx:1.5,fill:f(c)});});
    T(s,x+12,150,foot,{fs:10,'font-weight':700});
  };
  const A_='var(--accent)',B_='var(--tensor)',I_='var(--idle)';
  panel(8,'나쁜 예 · warp 하나 안에서 짝수와 홀수가 갈림',[['1차례',c=>c%2?I_:A_],['2차례',c=>c%2?B_:I_]],'2차례가 걸리고, 매번 lane 절반이 쉼');
  panel(326,'좋은 예 · warp 단위로 갈림',[['warp 0',()=>A_],['warp 1',()=>B_]],'warp마다 한 길만 실행, 쉬는 lane 없음');
  s.setAttribute('viewBox','0 0 640 166');
})();

/* 5.4 shuffle 합계 */
(function(){
  const s=document.getElementById('shufSvg'); if(!s) return;
  const x=c=>58+c*18, labs=['처음 값 32개','16칸 받기','8칸 받기','4칸 받기','2칸 받기','1칸 받기'];
  for(let r=0;r<6;r++){const y=14+r*36,n=32>>r;
    T(s,4,y+11,labs[r],{fs:9,fill:'var(--muted)'});
    if(r){const off=n;for(let j=0;j<n;j++){L(s,x(j+off)+7,y-22,x(j)+7,y,{stroke:'var(--accent)','stroke-opacity':.45});L(s,x(j)+7,y-22,x(j)+7,y,{stroke:'var(--accent)','stroke-opacity':.45});}}
    for(let c=0;c<32;c++)R(s,x(c),y,14,14,{rx:2,fill:c<n?'var(--accent)':'var(--idle)','fill-opacity':c<n?(r===5?1:.75):1});}
  T(s,x(0)+22,14+5*36+11,'합계 (lane 0)',{fs:10,'font-weight':700});
  s.setAttribute('viewBox','0 0 640 214');
})();
