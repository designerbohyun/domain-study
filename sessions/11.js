// 11회차 그림: 일반 TCP 통신과 RDMA 통신의 데이터 경로
(function(){
  const svg=document.getElementById('pathSvg'); if(!svg) return;
  const ns='http://www.w3.org/2000/svg';
  const el=(tag,a,text)=>{const n=document.createElementNS(ns,tag);for(const k in a)n.setAttribute(k,a[k]);if(text!=null)n.textContent=text;svg.appendChild(n);return n;};
  const C={m:'var(--mem)',k:'var(--tensor)',n:'var(--accent)',w:'var(--idle)'};
  // 줄마다 [이름, 종류]. 종류: m 메모리, k 커널(CPU), n NIC, w 네트워크
  const rows=[
    {t:'일반 TCP 통신',y:30,note:'CPU가 패킷 처리 · 복사 여러 번 · 지연 수십 μs',
     s:[['앱','m'],['커널 TCP/IP','k'],['NIC','n'],['네트워크','w'],['NIC','n'],['커널','k'],['앱','m']],copy:[0,5]},
    {t:'RDMA 통신',y:150,note:'커널 우회 · 복사 없음 · 상대 CPU 개입 없음 · 지연 수 μs 이하',
     s:[['앱·GPU 메모리','m'],['NIC (HCA)','n'],['네트워크','w'],['NIC (HCA)','n'],['상대 메모리','m']],copy:[]},
  ];
  el('defs',{}).innerHTML='<marker id="arr11" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--muted)"/></marker>';
  for(const r of rows){
    el('text',{x:0,y:r.y,'font-size':13,'font-weight':700,fill:'var(--ink)'},r.t);
    const n=r.s.length, gap=14, w=(640-gap*(n-1))/n, by=r.y+14, h=40;
    r.s.forEach(([name,kind],i)=>{
      const x=i*(w+gap);
      el('rect',{x,y:by,width:w,height:h,rx:6,fill:C[kind],opacity:kind==='w'?1:.9});
      el('text',{x:x+w/2,y:by+h/2+4,'text-anchor':'middle','font-size':11,'font-weight':600,fill:kind==='w'?'var(--ink)':'#fff'},name);
      if(i<n-1){
        el('line',{x1:x+w+1,y1:by+h/2,x2:x+w+gap-1,y2:by+h/2,stroke:'var(--muted)','stroke-width':1.5,'marker-end':'url(#arr11)'});
        if(r.copy.includes(i)) el('text',{x:x+w+gap/2,y:by-4,'text-anchor':'middle','font-size':10,fill:'var(--muted)'},'복사');
      }
    });
    el('text',{x:0,y:by+h+22,'font-size':12,fill:'var(--muted)'},r.note);
  }
})();
