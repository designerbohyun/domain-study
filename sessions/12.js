// 12회차 그림: 포트 수 k로 2단 Leaf-Spine 규모 계산기
(function(){
  const ns='http://www.w3.org/2000/svg';
  const el=(tag,a,p,t)=>{const n=document.createElementNS(ns,tag);for(const k in a)n.setAttribute(k,a[k]);if(t!=null)n.textContent=t;p.appendChild(n);return n;};
  const K=[32,64,128,144]; let i=1;
  const seg=document.getElementById('k-seg'), svg=document.getElementById('kSvg'), panel=document.getElementById('kPanel');
  const f=n=>n.toLocaleString('ko-KR');
  seg.innerHTML='<span class="note" style="margin:0 6px 0 0;align-self:center">스위치 포트 수 k</span>'+K.map((v,j)=>`<button class="btn" data-i="${j}" type="button">${v}포트</button>`).join('');
  seg.onclick=e=>{const b=e.target.closest('[data-i]');if(b){i=+b.dataset.i;run();}};
  function row(n,y,h,fill){
    const gap=n>64?1:2, w=(600-gap*(n-1))/n, xs=[];
    for(let j=0;j<n;j++){const x=20+j*(w+gap);xs.push(x+w/2);el('rect',{x,y,width:w,height:h,rx:Math.min(2,w/3),fill},svg);}
    return xs;
  }
  function run(){
    seg.querySelectorAll('.btn').forEach((b,j)=>b.classList.toggle('on',j===i));
    const k=K[i], spines=k/2, leaves=k, ends=k*k/2;
    svg.innerHTML='';
    el('text',{x:20,y:14,'font-size':11,fill:'var(--muted)'},svg,`Spine ${spines}대`);
    el('text',{x:20,y:162,'font-size':11,fill:'var(--muted)'},svg,`Leaf ${leaves}대 (각각 서버 방향 ${k/2}포트)`);
    const sx=row(spines,22,22,'var(--tensor)');
    const lx=row(leaves,124,22,'var(--accent)');
    for(const x of sx) el('line',{x1:lx[0],y1:124,x2:x,y2:44,stroke:'var(--mem)','stroke-width':1},svg);
    panel.innerHTML=`<div class="k">결과</div><h4>2단 최대 ${f(ends)}개</h4><p>${k} × ${k} ÷ 2 = ${f(ends)}<br>Leaf ${leaves}대 × 서버 방향 ${k/2}포트</p><p style="margin:0">3단이면 ${k}³ ÷ 4 = <b>${f(k**3/4)}</b>개</p>`;
  }
  run();
})();
