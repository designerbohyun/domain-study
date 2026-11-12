// 10회차 그림: GPU 4장 Ring으로 AllReduce · ReduceScatter · AllGather 따라가기
(function(){
  const ns='http://www.w3.org/2000/svg';
  const el=(tag,attrs,parent,text)=>{const n=document.createElementNS(ns,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(text!=null)n.textContent=text;parent.appendChild(n);return n;};
  const P=4, FULL=(1<<P)-1, CH='abcd';
  const OPS={
    ar:{name:'AllReduce',phases:['rs','rs','rs','ag','ag','ag']},
    rs:{name:'ReduceScatter',phases:['rs','rs','rs']},
    ag:{name:'AllGather',phases:['ag','ag','ag']}
  };
  const svg=document.getElementById('crSvg'), panel=document.getElementById('crPanel'),
        segOp=document.getElementById('cr-op'), segStep=document.getElementById('cr-step');
  let op='ar', step=0;

  // 각 칸 = 그 조각에 더해진 GPU 비트마스크. 0은 빈칸.
  function init(o){
    return [...Array(P)].map((_,g)=>[...Array(P)].map((_,c)=>o==='ag'?(c===g?FULL:0):1<<g));
  }
  // 단계 s(1부터)에서 GPU i는 다음 GPU로 조각 하나를 보낸다.
  function run(o,n){
    let st=init(o), got=[];
    const ph=OPS[o].phases;
    for(let k=0;k<n;k++){
      const rsSteps=ph.slice(0,k).filter(p=>p==='rs').length;
      const s=ph[k]==='rs'?k+1:k+1-rsSteps;
      const nx=st.map(r=>r.slice()); got=[];
      for(let i=0;i<P;i++){
        const j=(i+1)%P;
        if(ph[k]==='rs'){const c=((i-s)%P+P)%P; nx[j][c]|=st[i][c]; got.push([j,c]);}
        else{const c=((i-s+1)%P+P)%P; nx[j][c]=st[i][c]; got.push([j,c]);}
      }
      st=nx;
    }
    return {st,got};
  }
  function label(m,c){
    if(!m) return '';
    if(m===FULL) return op==='ag'?CH[c]:'Σ'+CH[c];
    return [...Array(P).keys()].filter(g=>m>>g&1).map(g=>CH[c]+g).join('+');
  }
  function draw(){
    const ph=OPS[op].phases, {st,got}=run(op,step);
    svg.innerHTML='';
    const lx=40,cw=68,ch=32,top=22;
    for(let c=0;c<P;c++) el('text',{x:lx+c*(cw+4)+cw/2,y:14,'font-size':11,fill:'var(--muted)','text-anchor':'middle'},svg,`조각 ${CH[c]}`);
    for(let g=0;g<P;g++){
      const y=top+g*(ch+8);
      el('text',{x:4,y:y+ch/2+4,'font-size':12,fill:'var(--muted)'},svg,`G${g}`);
      for(let c=0;c<P;c++){
        const m=st[g][c], x=lx+c*(cw+4), hit=got.some(([j,k])=>j===g&&k===c);
        const n=m?m.toString(2).split('1').length-1:0;
        const fill=!m?'none':m===FULL?'var(--accent)':n===1?'var(--idle)':'var(--mem)';
        el('rect',{x,y,width:cw,height:ch,rx:4,fill,stroke:hit?'var(--tensor)':'var(--line)','stroke-width':hit?3:1,'stroke-dasharray':m?'':'3 3'},svg);
        const t=label(m,c);
        el('text',{x:x+cw/2,y:y+ch/2+4,'font-size':t.length>8?9:11,'text-anchor':'middle',fill:(fill==='var(--accent)'||fill==='var(--mem)')?'var(--surface)':'var(--ink)'},svg,t);
      }
    }
    svg.setAttribute('viewBox',`0 0 ${lx+P*(cw+4)} ${top+P*(ch+8)}`);
    segStep.querySelectorAll('.btn').forEach(b=>{const a=b.dataset.a;b.disabled=(a!=='next'&&step===0)||(a==='next'&&step===ph.length);});
    const T=ph.length;
    let h, p;
    if(step===0){
      h='시작 상태';
      p=op==='ag'?'GPU마다 자기 조각 하나(N/4)만 가지고 있습니다. 빈칸은 아직 없는 조각입니다.':'GPU마다 전체 데이터 N을 4조각으로 나눠 가지고 있습니다. 같은 조각 이름끼리 원소별로 더해야 합니다.';
    }else{
      const isRs=ph[step-1]==='rs';
      h=`${step}단계 / ${T} · ${isRs?'ReduceScatter: 받은 조각에 더하기':'AllGather: 완성된 조각 복사하기'}`;
      p=`GPU마다 조각 하나를 오른쪽 이웃 GPU(G3은 G0)로 보냈습니다. 보라 테두리가 이번에 받은 칸입니다.`;
      if(step===T) p+= op==='ar'?' 이제 모든 GPU가 같은 전체 합을 갖습니다.':op==='rs'?' 이제 GPU마다 서로 다른 조각 하나의 전체 합(Σ)을 갖습니다.':' 이제 모든 GPU가 조각 4개를 모두 갖습니다.';
    }
    panel.innerHTML=`<div class="k">${OPS[op].name}</div><h4>${h}</h4><p>${p}</p><p style="margin:0">GPU당 보낸 양: <b>${step} × N/4</b>${step===T?` = ${op==='ar'?'2 × 3/4 × N':'3/4 × N'}`:''}</p>`;
  }
  segOp.innerHTML=Object.keys(OPS).map(k=>`<button class="chip" type="button" data-o="${k}">${OPS[k].name}</button>`).join('');
  segStep.innerHTML='<button class="btn" type="button" data-a="first">처음</button><button class="btn" type="button" data-a="prev">이전</button><button class="btn" type="button" data-a="next">다음 단계</button>';
  segOp.onclick=e=>{const b=e.target.closest('[data-o]');if(!b)return;op=b.dataset.o;step=0;segOp.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b));draw();};
  segStep.onclick=e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const T=OPS[op].phases.length;
    step=b.dataset.a==='first'?0:b.dataset.a==='prev'?Math.max(0,step-1):Math.min(T,step+1);draw();};
  segOp.querySelector('.chip').classList.add('on');
  draw();
})();
