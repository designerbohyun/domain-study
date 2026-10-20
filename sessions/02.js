// 2회차 그림: SM 배치, 비트 막대, wave, 점유율 계산기
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
        const show=()=>{panel.innerHTML=`<div class="k">선택한 칸</div><h4>SM ${id+1}${isOff?' (꺼짐)':''}</h4><p>${isOff?'꺼진 SM입니다. 블록을 받지 않습니다.':'켜진 SM입니다. 블록을 받아 처리합니다.'}</p><p style="margin:0">GPC ${g+1}, TPC ${t+1}에 속합니다. GPC 하나에는 SM이 18개 있고, 칩 전체 144개 중 132개가 켜져 있습니다.</p>`;};
        r.addEventListener('click',show); r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
      }
    }
  }
  const y2=8+2*(gh+12);
  el('rect',{x:8,y:y2,width:4*gw+30,height:20,rx:4,fill:'var(--mem)'},svg);
  el('text',{x:8+(4*gw+30)/2,y:y2+14,'font-size':11,fill:'var(--surface)','text-anchor':'middle'},svg,'칩 전체 공용: L2 캐시 50MB · HBM 메모리 80GB');
  svg.setAttribute('viewBox',`0 0 ${4*gw+46} ${y2+28}`);
})();

/* 3.4 bit bars */
(function(){
  const F=[['FP64',64],['FP32',32],['FP16 / BF16',16],['FP8',8],['FP4',4]];
  document.getElementById('bitBars').innerHTML=F.map(([n,b])=>`<div class="bar"><span><b>${n}</b></span><div class="track"><div class="fill" style="width:${b/64*100}%;background:var(--accent)"></div></div><span class="v">${b}bit</span></div>`).join('');
})();

/* 4.8 wave */
(function(){
  const svg=document.getElementById('waveSvg'), m=132, cw=4.2, rh=26, lx=56;
  svg.setAttribute('viewBox',`0 0 ${lx+m*cw+10} ${2*rh+8}`);
  svg.style.minWidth='520px';
  [132,1].forEach((used,w)=>{
    el('text',{x:4,y:w*rh+17,'font-size':12,fill:'var(--muted)'},svg,`${w+1}차`);
    for(let s=0;s<m;s++) el('rect',{x:lx+s*cw,y:w*rh+5,width:cw-1,height:rh-10,rx:1,fill:s<used?'var(--accent)':'var(--idle)'},svg);
  });
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
    const lim=[['warp 수 (64개)',Math.floor(64/wpb)],['블록 수 (32개)',32],['레지스터',Math.floor(65536/(regs*bt))],['Shared Memory',smem?Math.floor(228/smem):Infinity]];
    const blocks=Math.min(...lim.map(x=>x[1])), warps=blocks*wpb, occ=Math.round(warps/64*100);
    const by=lim.filter(x=>x[1]===blocks).map(x=>x[0]).join(', ');
    svg.innerHTML='';
    for(let c=0;c<8;c++){
      el('text',{x:24+c*38+15,y:14,'font-size':10,fill:'var(--muted)','text-anchor':'middle'},svg,`블록${c+1}`);
      for(let w=0;w<8;w++) el('rect',{x:24+c*38,y:22+w*22,width:30,height:18,rx:3,fill:c<blocks?'var(--accent)':'var(--idle)'},svg);
    }
    panel.innerHTML=`<div class="k">결과</div><h4>점유율 ${occ}%</h4><p>블록 ${blocks}개 × warp 8개 = warp ${warps}개 (최대 64개)</p><p style="margin:0">막은 한도: <b>${by}</b></p>`;
  }
  run();
})();


/* 구조도 (1.3, 2.3, 3.3, 4.3) */
const R=(p,x,y,w,h,a={})=>el('rect',Object.assign({x,y,width:w,height:h,rx:a.rx??4},a),p);
const T=(p,x,y,s,a={})=>el('text',Object.assign({x,y,'font-size':a.fs??11,fill:'var(--ink)'},a),p,s);
const L=(p,x1,y1,x2,y2,a={})=>el('line',Object.assign({x1,y1,x2,y2,stroke:'var(--muted)','stroke-width':1},a),p);

/* 1.3 칩 → GPC → TPC → SM */
(function(){
  const s=document.getElementById('hierSvg'); if(!s) return;
  const P=(x,w,title,foot)=>{R(s,x,24,w,120,{rx:8,fill:'var(--sunk)',stroke:'var(--line)'});T(s,x+w/2,16,title,{'text-anchor':'middle',fill:'var(--muted)'});T(s,x+w/2,164,foot,{'text-anchor':'middle','font-weight':700,fs:12});};
  P(10,200,'GPU 칩 (H100)','GPC 8개');
  for(let i=0;i<8;i++){const x=22+(i%4)*46,y=36+Math.floor(i/4)*54,on=i===3;
    R(s,x,y,40,48,{fill:on?'var(--accent)':'none','fill-opacity':on?.18:1,stroke:on?'var(--accent)':'var(--line)','stroke-width':on?2:1});
    T(s,x+20,y+28,'GPC',{'text-anchor':'middle',fs:9,fill:'var(--muted)'});}
  P(240,170,'GPC 하나','TPC 9개');
  for(let i=0;i<9;i++){const x=252+(i%3)*52,y=34+Math.floor(i/3)*38,on=i===2;
    R(s,x,y,46,32,{fill:on?'var(--accent)':'none','fill-opacity':on?.18:1,stroke:on?'var(--accent)':'var(--line)','stroke-width':on?2:1});
    T(s,x+23,y+20,'TPC',{'text-anchor':'middle',fs:9,fill:'var(--muted)'});}
  P(440,110,'TPC 하나','SM 2개');
  [452,500].forEach(x=>{R(s,x,36,40,96,{fill:'var(--accent)'});T(s,x+20,88,'SM',{'text-anchor':'middle',fill:'var(--surface)','font-weight':700});});
  const z={stroke:'var(--accent)','stroke-dasharray':'3 3','stroke-opacity':.7};
  L(s,200,36,240,24,z);L(s,200,84,240,144,z);L(s,402,34,440,24,z);L(s,402,66,440,144,z);
  T(s,566,70,'설계상',{fill:'var(--muted)'});T(s,566,92,'SM 144개',{fs:14,'font-weight':700});T(s,566,112,'켜진 SM 132개',{fill:'var(--muted)'});
  s.setAttribute('viewBox','0 0 640 176');
})();

/* 1.3 SM 하나의 구성과 메모리 */
(function(){
  const s=document.getElementById('smSvg'); if(!s) return;
  R(s,8,8,624,250,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});
  T(s,20,28,'SM 하나 (H100)',{'font-weight':700,fs:12});
  for(let q=0;q<4;q++){const x=20+q*154;
    R(s,x,40,146,170,{rx:6,fill:'var(--surface)',stroke:'var(--line)'});
    T(s,x+10,56,`구역 ${q+1}`,{fill:'var(--muted)'});
    R(s,x+8,62,130,18,{rx:3,fill:'var(--idle)'});T(s,x+73,75,'Warp Scheduler',{'text-anchor':'middle',fs:10});
    for(let i=0;i<32;i++) R(s,x+10+(i%8)*16,88+Math.floor(i/8)*16,13,13,{rx:2,fill:'var(--accent)'});
    R(s,x+8,156,130,18,{rx:3,fill:'var(--tensor)'});T(s,x+73,169,'Tensor Core',{'text-anchor':'middle',fs:10,fill:'var(--surface)'});
    R(s,x+8,180,130,18,{rx:3,fill:'var(--mem)'});T(s,x+73,193,'레지스터 64KB',{'text-anchor':'middle',fs:10,fill:'var(--surface)'});}
  R(s,20,220,608,26,{rx:4,fill:'var(--mem)'});T(s,324,237,'Shared Memory 최대 228KB · 같은 블록의 스레드가 함께 씁니다',{'text-anchor':'middle',fill:'var(--surface)'});
  L(s,320,258,320,270);
  R(s,120,270,400,26,{rx:4,fill:'var(--mem)','fill-opacity':.6});T(s,320,287,'L2 캐시 50MB · 모든 SM이 함께 씁니다',{'text-anchor':'middle'});
  L(s,320,296,320,308);
  R(s,40,308,560,26,{rx:4,fill:'var(--mem)','fill-opacity':.3});T(s,320,325,'VRAM 80GB · 모델과 데이터가 있습니다',{'text-anchor':'middle'});
  s.setAttribute('viewBox','0 0 640 342');
})();

/* 2.3 구역 하나의 계산 유닛 */
(function(){
  const s=document.getElementById('quadSvg'); if(!s) return;
  R(s,8,8,430,232,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});
  T(s,20,28,'SM의 구역 하나 (H100)',{'font-weight':700,fs:12});
  R(s,20,38,406,20,{rx:3,fill:'var(--idle)'});T(s,223,52,'Warp Scheduler',{'text-anchor':'middle',fs:10});
  const row=(y,name,n,a)=>{T(s,20,y+11,name,{fs:11});for(let i=0;i<n;i++)R(s,138+(i%16)*18,y+Math.floor(i/16)*18,14,14,Object.assign({rx:2},a));};
  row(68,'FP32 · 32개',32,{fill:'var(--accent)'});T(s,20,97,'= CUDA Core',{fs:10,fill:'var(--muted)'});
  row(110,'INT32 · 16개',16,{fill:'var(--off)'});
  row(134,'FP64 · 16개',16,{fill:'var(--accent)','fill-opacity':.4});
  row(158,'SFU · 4개',4,{fill:'none',stroke:'var(--muted)'});
  T(s,20,193,'Tensor Core · 1개',{fs:11});R(s,138,182,140,16,{rx:3,fill:'var(--tensor)'});
  R(s,20,210,406,20,{rx:3,fill:'var(--mem)'});T(s,223,224,'레지스터 64KB',{'text-anchor':'middle',fs:10,fill:'var(--surface)'});
  R(s,454,8,178,232,{rx:10,fill:'none',stroke:'var(--line)'});
  T(s,468,32,'구역 4개 = SM 하나',{'font-weight':700,fs:12});
  [['FP32 (CUDA Core)','128개'],['INT32','64개'],['FP64','64개'],['SFU','16개'],['Tensor Core','4개'],['레지스터','256KB']].forEach(([k,v],i)=>{
    const y=60+i*28;T(s,468,y,k,{fill:'var(--muted)'});T(s,620,y,v,{'text-anchor':'end','font-weight':700});});
  s.setAttribute('viewBox','0 0 640 248');
})();

/* 3.3 CUDA Core와 Tensor Core의 명령 한 번 */
(function(){
  const s=document.getElementById('coreSvg'); if(!s) return;
  R(s,8,8,232,170,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});
  T(s,20,30,'CUDA Core · 명령 한 번',{'font-weight':700,fs:12});
  [['a',22],['b',70],['c',118]].forEach(([k,x])=>{R(s,x,72,26,26,{fill:'var(--surface)',stroke:'var(--line)'});T(s,x+13,90,k,{'text-anchor':'middle'});});
  [['×',59],['+',107],['=',155]].forEach(([k,x])=>T(s,x,90,k,{'text-anchor':'middle',fill:'var(--muted)',fs:13}));
  R(s,170,72,26,26,{fill:'var(--accent)'});
  T(s,124,138,'숫자 1개 · 곱셈 1번',{'text-anchor':'middle','font-weight':700});
  R(s,252,8,380,170,{rx:10,fill:'var(--sunk)',stroke:'var(--line)'});
  T(s,264,30,'Tensor Core · 명령 한 번',{'font-weight':700,fs:12});
  const G=(x,lab,a)=>{for(let i=0;i<16;i++)R(s,x+(i%4)*12,60+Math.floor(i/4)*12,10,10,Object.assign({rx:1.5},a));T(s,x+23,124,lab,{'text-anchor':'middle',fill:'var(--muted)',fs:10});};
  G(272,'A',{fill:'var(--tensor)','fill-opacity':.4});G(352,'B',{fill:'var(--tensor)','fill-opacity':.4});
  G(432,'C',{fill:'var(--idle)'});G(512,'결과',{fill:'var(--tensor)'});
  [['×',334],['+',414],['=',494]].forEach(([k,x])=>T(s,x,88,k,{'text-anchor':'middle',fill:'var(--muted)',fs:13}));
  T(s,442,152,'행렬 한 덩어리 · 곱셈 64번',{'text-anchor':'middle','font-weight':700});
  s.setAttribute('viewBox','0 0 640 186');
})();

/* 4.3 warp 자리 64개 */
(function(){
  const s=document.getElementById('slotSvg'); if(!s) return;
  for(let i=0;i<64;i++) R(s,12+(i%16)*26,12+Math.floor(i/16)*22,22,18,{rx:3,fill:i<32?'var(--accent)':'var(--idle)'});
  T(s,520,58,'50%',{'text-anchor':'middle',fs:34,'font-weight':700,fill:'var(--accent)'});
  T(s,520,82,'32 ÷ 64',{'text-anchor':'middle',fill:'var(--muted)',fs:13});
  s.setAttribute('viewBox','0 0 640 104');
})();

/* 4.3 네 가지 한도 */
(function(){
  const s=document.getElementById('limitSvg'); if(!s) return;
  const rows=[['warp 수','64 ÷ 블록당 8',8],['블록 수','최대 32',32],['레지스터','65,536 ÷ 블록당 16,384',4],['Shared Memory','228KB ÷ 블록당 32KB',7]];
  const min=Math.min(...rows.map(r=>r[2]));
  rows.forEach(([k,d,n],i)=>{const y=12+i*40,hit=n===min;
    T(s,12,y+11,k,{'font-weight':700});T(s,12,y+27,d,{fs:10,fill:'var(--muted)'});
    for(let b=0;b<n;b++) R(s,196+b*12,y+2,10,22,{rx:2,fill:hit?'var(--accent)':'var(--off)'});
    T(s,196+n*12+6,y+18,`${n}블록`+(hit?' · 가장 적음':''),{'font-weight':hit?700:400,fill:hit?'var(--accent)':'var(--ink)'});});
  L(s,12,174,628,174,{stroke:'var(--line)'});
  T(s,12,196,'올라가는 블록 4개 × 블록당 warp 8개 = warp 32개 · 점유율 50%',{'font-weight':700});
  s.setAttribute('viewBox','0 0 640 208');
})();
