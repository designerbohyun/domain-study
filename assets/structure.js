// 구조도 데이터와 화면. 칸(node)마다 용어를 역할별로 묶고, 용어에서 거꾸로 칸을 찾는다.
// 기준 제품은 회차 자료와 같은 NVIDIA H100 SXM.
(function () {
  const T = window.TERMS || {};
  const S = window.SESSIONS || [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 역할 묶음 이름: 구성 = 이 칸 자체, 개념 = 이 칸에서 일어나는 일, 지표 = 이 칸을 재는 값, 공유 = 나눠 쓰는 법, 비교 = 다른 칩·회사의 같은 자리
  const GROUPS = [["구성", "이 칸을 이루는 것"], ["개념", "이 칸에서 일어나는 일"], ["지표", "이 칸을 재는 값"], ["공유", "나눠 쓰는 법"], ["비교", "다른 칩·회사의 같은 자리"]];

  const NODES = {
    k8s: { name: "Kubernetes 운영", desc: "여러 서버의 GPU를 작업마다 나눠 주고 관리하는 운영 계층입니다.", s: [13, 14, 15, 16], 공유: ["dra", "mig", "mps", "timeslice"], 지표: ["dcgm", "gpuutil"] },
    network: { name: "서버 간 네트워크", desc: "서버 여러 대를 하나처럼 묶어 학습할 때, 서버끼리 데이터를 주고받는 통로입니다.", s: [11, 12], 구성: ["infiniband", "roce"], 개념: ["nccl"] },
    server: { name: "GPU 서버 (노드)", desc: "CPU와 GPU 8장이 한 상자에 들어간 서버입니다. CPU가 일을 시키고, 무거운 계산은 GPU가 맡습니다.", s: [1, 7, 8], 개념: ["hetero", "offload", "amdahl", "gpgpu"] },
    cpu: { name: "CPU", desc: "프로그램 전체를 이끌고, GPU에 일을 넘기는 쪽입니다. 순서대로 하는 복잡한 일에 강합니다.", s: [1, 8], 구성: ["cpu"], 개념: ["hetero", "offload", "amdahl"], 비교: ["amx"] },
    host: { name: "Host Memory (CPU 메모리)", desc: "CPU 쪽의 메인 메모리입니다. 데이터는 여기서 PCIe를 거쳐 GPU의 VRAM으로 옮겨집니다.", s: [5, 7], 개념: ["offload"] },
    pcie: { name: "PCIe", desc: "CPU와 GPU 사이의 기본 통로입니다. GPU끼리 잇는 NVLink보다 훨씬 좁습니다.", s: [1, 7], 구성: ["pcie"] },
    nvlink: { name: "NVLink · NVSwitch", desc: "같은 서버 안의 GPU끼리 직접 잇는 고속 통로입니다. NVSwitch가 8장을 모두 이어 줍니다.", s: [1, 9, 10], 구성: ["nvlink", "nvswitch"], 개념: ["nccl"] },
    nic: { name: "NIC (네트워크 카드)", desc: "서버를 바깥 네트워크에 잇는 카드입니다. GPU 서버는 보통 GPU 한 장마다 하나씩 둡니다.", s: [11], 구성: ["infiniband", "roce"] },
    gpu: { name: "GPU 한 장 (H100 SXM)", desc: "GPU 칩과 HBM을 한 패키지에 담은 제품 단위입니다. 사람들이 'GPU 한 장'이라고 부르는 것이 이것입니다.", s: [1, 2], 구성: ["gpu", "h100", "sxm"], 개념: ["gpgpu", "tflops", "memwall"], 지표: ["gpuutil", "mfu", "tensoractive", "dcgm"], 비교: ["tpu", "asic", "npu", "fpga"] },
    cowos: { name: "패키지 · 인터포저", desc: "GPU 칩과 HBM 스택을 얇은 실리콘 판 위에 나란히 올려 잇는 부분입니다.", s: [5], 구성: ["cowos", "sxm"] },
    hbm: { name: "HBM · VRAM (Global Memory)", desc: "GPU가 혼자 쓰는 메인 메모리입니다. 모델과 데이터가 모두 여기에 올라갑니다. H100 SXM은 80GB, 3.35TB/s입니다.", s: [5, 6], 구성: ["hbm", "vram", "gmem", "tsv"], 개념: ["oom", "memwall", "coalescing", "localmem"], 비교: ["gddr"] },
    chip: { name: "GPU 칩", desc: "SM 132개, L2 캐시, 일을 나눠 주는 GigaThread Engine이 들어 있는 실리콘 칩입니다.", s: [1, 2], 구성: ["gpc", "tpc", "yield"], 개념: ["wave"], 공유: ["mig", "greenctx"] },
    gigathread: { name: "GigaThread Engine", desc: "커널이 시작되면 블록을 빈 SM에 하나씩 나눠 주는 장치입니다.", s: [3], 구성: ["gigathread"], 개념: ["kernel", "grid", "stream", "cudagraphs", "wave", "clc"] },
    gpc: { name: "GPC · TPC", desc: "SM을 묶는 단위입니다. SM 2개가 TPC 하나, TPC 9개가 GPC 하나입니다. H100은 GPC가 8개입니다.", s: [1, 2], 구성: ["gpc", "tpc"], 개념: ["yield", "cluster"] },
    l2: { name: "L2 캐시", desc: "모든 SM이 함께 쓰는 칩 안의 캐시입니다. VRAM으로 가는 요청이 모두 여기를 거칩니다. H100은 50MB입니다.", s: [2, 5], 구성: ["l2", "sram"], 개념: ["hit", "atomic"], 비교: ["infinitycache"] },
    io: { name: "외부 연결 포트", desc: "칩 가장자리에서 NVLink와 PCIe로 바깥과 잇는 부분입니다.", s: [7, 9], 구성: ["nvlink", "pcie"] },
    sm: { name: "SM (Streaming Multiprocessor)", desc: "실제로 계산을 하는 기본 단위입니다. 블록이 SM에 올라가 끝날 때까지 머뭅니다. H100 SXM에는 132개가 켜져 있습니다.", s: [2, 3], 구성: ["sm"], 개념: ["block", "occupancy", "latency", "lat", "cycle", "cluster", "clc", "persistent", "megakernel", "warpspec"], 지표: ["smactive", "smocc", "nsight"], 공유: ["greenctx"], 비교: ["cu"] },
    smem: { name: "L1 캐시 · Shared Memory", desc: "SM 안의 SRAM 한 덩어리를 L1 캐시와 Shared Memory가 나눠 씁니다. H100은 합쳐서 SM당 256KB입니다.", s: [2, 5], 구성: ["smem", "l1", "sram"], 개념: ["bank", "tiling", "hit", "cluster"] },
    tma: { name: "TMA", desc: "VRAM에서 Shared Memory로 큰 데이터 덩어리를 옮기는 일만 하는 장치입니다. H100부터 있습니다.", s: [2, 3, 5], 구성: ["tma"] },
    tmem: { name: "TMEM", desc: "Tensor Core 결과를 레지스터 대신 담는 공간입니다. 데이터센터용 Blackwell부터 SM마다 256KB가 있고, H100에는 없습니다.", s: [2, 3, 5], 구성: ["tmem"] },
    quad: { name: "SM 구역", desc: "SM은 네 구역으로 나뉩니다. 구역마다 Warp Scheduler 하나, CUDA Core 32개, Tensor Core 하나가 있습니다.", s: [2], 구성: ["scheduler", "cudacore", "tensorcore"] },
    scheduler: { name: "Warp Scheduler", desc: "매 사이클 바로 실행할 수 있는 warp 하나를 골라 명령을 줍니다. 기다리는 warp 대신 다른 warp를 실행해 지연을 숨깁니다.", s: [2, 3], 구성: ["scheduler"], 개념: ["warp", "simt", "divergence", "latency", "lat", "ilp", "warpspec", "cycle"] },
    register: { name: "레지스터 파일", desc: "스레드마다 따로 주는 가장 빠른 저장 공간입니다. 구역마다 64KB, SM 하나에 256KB입니다.", s: [2, 5], 구성: ["register"], 개념: ["spill", "localmem", "shuffle", "thread", "occupancy"] },
    cudacore: { name: "CUDA Core", desc: "숫자 하나씩 계산하는 FP32 계산 유닛입니다. 구역마다 32개라 warp 하나 분량을 한 번에 실행합니다.", s: [1, 2], 구성: ["cudacore", "fma"], 개념: ["thread", "fp", "tflops"] },
    units: { name: "INT32 · FP64 유닛", desc: "정수 계산과 더 정밀한 실수 계산을 맡는 유닛입니다. H100은 구역마다 16개씩 있습니다.", s: [2], 개념: ["fp"] },
    tensorcore: { name: "Tensor Core", desc: "행렬 곱셈만 전담하는 계산 유닛입니다. AI 계산의 대부분을 맡습니다. 구역마다 하나, H100 전체로 528개입니다.", s: [1, 2, 4], 구성: ["tensorcore"], 개념: ["matrix", "mixed", "fp", "te", "tf32", "sparsity", "tiling"], 지표: ["tensoractive", "mfu"], 비교: ["tpu", "amx"] },
    sfu: { name: "SFU", desc: "sin, exp 같은 함수를 계산하는 유닛입니다. 구역마다 4개입니다.", s: [2], 구성: ["sfu"] },
    ldst: { name: "LD/ST (메모리 읽기·쓰기)", desc: "레지스터와 메모리 사이에 값을 읽고 쓰는 유닛입니다. warp의 32개 스레드가 이웃한 주소를 읽으면 한 번에 끝납니다.", s: [3, 6], 개념: ["coalescing", "localmem"] },
    // 실행: 프로그램 쪽 단위
    xgrid: { name: "그리드 (커널 한 번)", desc: "커널 한 번 실행으로 만들어지는 블록 전체입니다. GigaThread Engine이 블록을 빈 SM에 나눠 주고, 한 번에 다 못 올라가면 wave로 나눠 실행합니다. 예: 숫자 100만 개에 2 곱하기는 블록 3,907개입니다.", s: [3], hw: "chip", 구성: ["kernel", "grid"], 개념: ["gridstride", "stream", "cudagraphs", "persistent", "megakernel", "fusion", "spmd", "wave", "tail"], 지표: ["nsight"] },
    xblock: { name: "블록 (Thread Block)", desc: "스레드 최대 1,024개의 묶음입니다. SM 하나에 올라가 끝날 때까지 머물고, Shared Memory를 함께 씁니다. 블록끼리는 서로 독립입니다. 예: 스레드 256개, warp 8개.", s: [2, 3], hw: "sm", 구성: ["block"], 개념: ["cluster", "coopgroups", "smem", "race", "atomic", "deadlock"] },
    xwarp: { name: "Warp", desc: "같은 명령을 함께 실행하는 32개 스레드입니다. 하드웨어가 블록을 번호 순서대로 32개씩 잘라 만들고, Warp Scheduler가 명령을 주는 단위입니다. 예: 블록 하나에 8개.", s: [2, 3], hw: "scheduler", 구성: ["warp", "lane"], 개념: ["simt", "divergence", "coalescing", "shuffle", "warpspec", "soa"] },
    xthread: { name: "스레드", desc: "커널 코드를 실행하는 가장 작은 단위입니다. 자기 번호로 맡을 데이터를 찾고, 레지스터를 따로 가지며, 계산 유닛 한 칸에서 실행됩니다. 예: 숫자 1개.", s: [3], hw: "cudacore", 구성: ["thread"], 개념: ["register", "race"] },
    // 소프트웨어 층
    sapp: { name: "프레임워크 · 앱", desc: "PyTorch, vLLM처럼 사용자가 직접 쓰는 층입니다. 아래 라이브러리를 불러 GPU를 씁니다.", s: [17, 20], 개념: ["fusion", "mixed"] },
    slib: { name: "라이브러리", desc: "행렬 곱셈, 합성곱, GPU 간 통신처럼 자주 쓰는 계산을 미리 빠르게 만들어 둔 묶음입니다.", s: [1, 2, 10], 구성: ["cublas", "cudnn", "nccl", "tensorrt", "te"] },
    slang: { name: "커널을 쓰는 언어 · 도구", desc: "GPU에서 돌 함수, 즉 커널을 직접 쓰는 방법입니다.", s: [1, 3], 구성: ["cuda", "triton", "cudatile"], 개념: ["coopgroups"], 비교: ["opencl", "rocm", "sycl", "zluda"] },
    scompile: { name: "컴파일", desc: "커널 코드를 GPU가 실행할 기계어로 바꾸는 과정입니다. 중간 언어 PTX를 거쳐 세대별 기계어 SASS가 됩니다.", s: [1], 구성: ["toolkit", "nvcc", "ptx", "sass", "cc"] },
    sruntime: { name: "실행 관리 (런타임 · 드라이버)", desc: "커널을 언제, 어떤 순서로 GPU에 넘길지 정하는 층입니다.", s: [3, 14], 개념: ["kernel", "stream", "cudagraphs"], 공유: ["mps", "greenctx"] },
    stools: { name: "측정 도구", desc: "GPU가 실제로 얼마나 일했는지 재는 도구와 지표입니다.", s: [2, 22, 23], 구성: ["nsight", "dcgm"], 지표: ["gpuutil", "smactive", "smocc", "tensoractive", "mfu"] },
  };

  // 하드웨어는 바깥에서 안으로 확대한다. 칸: [노드, 이름, 보조 설명, 칸 수(4칸 격자 기준), 종류, 확대할 단계, 작은 칸 수]
  const LEVELS = {
    cluster: { title: "클러스터", frame: null, rows: [
      [["k8s", "Kubernetes 운영", "GPU를 작업에 나눠 줌", 4, "ctrl"]],
      [["server", "GPU 서버", "노드 1", 1, "comp", "server", 8], ["server", "GPU 서버", "노드 2", 1, "comp", "server", 8], ["server", "GPU 서버", "노드 3", 1, "comp", "server", 8], ["server", "…", "수십에서 수천 대", 1, "comp", "server"]],
      [["network", "서버 간 네트워크", "InfiniBand · RoCE", 4, "link"]],
    ] },
    server: { title: "서버", frame: ["server", "GPU 서버 한 대 (H100 SXM 8장)"], rows: [
      [["cpu", "CPU", "보통 2개", 2, "ctrl"], ["host", "Host Memory", "CPU 쪽 메모리", 1, "mem"], ["nic", "NIC", "네트워크 카드", 1, "link"]],
      [["pcie", "PCIe", "CPU와 GPU 사이 통로", 4, "link"]],
      [1, 2, 3, 4].map(i => ["gpu", "GPU", "H100 · " + i, 1, "comp", "package"]),
      [5, 6, 7, 8].map(i => ["gpu", "GPU", "H100 · " + i, 1, "comp", "package"]),
      [["nvlink", "NVLink · NVSwitch", "GPU 8장을 모두 직접 연결", 4, "link"]],
    ] },
    package: { title: "GPU 한 장", frame: ["gpu", "GPU 한 장 (H100 SXM 패키지)"], rows: [
      [["hbm", "HBM3", "스택 3개", 1, "mem", null, 3], ["chip", "GPU 칩", "SM 132 · L2 50MB", 2, "comp", "chip"], ["hbm", "HBM3", "스택 2개", 1, "mem", null, 2]],
      [["cowos", "실리콘 인터포저 (CoWoS)", "칩과 HBM을 잇는 판", 4, "link"]],
    ] },
    chip: { title: "GPU 칩", frame: ["chip", "GPU 칩 (H100)"], rows: [
      [["gigathread", "GigaThread Engine", "블록을 SM에 나눠 줌", 4, "ctrl"]],
      [1, 2, 3, 4].map(i => ["gpc", "GPC " + i, "TPC 9 · SM 18", 1, "comp", "sm", 18]),
      [["l2", "L2 캐시", "50MB · 모든 SM이 공유", 4, "mem"]],
      [5, 6, 7, 8].map(i => ["gpc", "GPC " + i, "TPC 9 · SM 18", 1, "comp", "sm", 18]),
      [["hbm", "메모리 컨트롤러", "HBM으로", 2, "mem"], ["io", "NVLink · PCIe 포트", "칩 바깥으로", 2, "link"]],
    ], note: "설계상 SM은 144개이고, H100 SXM은 그중 132개를 켭니다." },
    sm: { title: "SM", frame: ["sm", "SM 하나 (H100에 132개)"], rows: [
      [1, 2, 3, 4].map(i => ["quad", "구역 " + i, "Scheduler · CUDA Core 32 · Tensor Core 1", 1, "comp", "quad"]),
      [["smem", "L1 캐시 · Shared Memory", "합쳐서 256KB", 4, "mem"]],
      [["tma", "TMA", "데이터 운반 전담", 2, "ctrl"], ["tmem", "TMEM", "Blackwell부터 · H100에는 없음", 2, "tensor dashed"]],
    ] },
    quad: { title: "SM 구역", frame: ["quad", "SM 구역 하나"], rows: [
      [["scheduler", "Warp Scheduler", "매 사이클 warp 하나 선택", 4, "ctrl"]],
      [["register", "레지스터 파일", "64KB", 4, "mem"]],
      [["cudacore", "CUDA Core", "FP32 · 32개", 2, "comp", null, 32], ["units", "INT32 · FP64", "16개씩", 1, "comp"], ["tensorcore", "Tensor Core", "1개", 1, "tensor"]],
      [["sfu", "SFU", "4개", 2, "ctrl"], ["ldst", "LD/ST", "메모리 읽기 · 쓰기", 2, "mem"]],
    ] },
  };
  const ORDER = ["cluster", "server", "package", "chip", "sm", "quad"];

  const EXEC = [["xgrid", "chip", "GPU 칩 전체"], ["xblock", "sm", "SM 하나"], ["xwarp", "scheduler", "Warp Scheduler"], ["xthread", "cudacore", "계산 유닛 한 칸 · 레지스터"]];
  const MEMORY = [
    ["register", "Register", "SM 안 · 스레드 하나", "SM당 256KB", "약 1 사이클", 1],
    ["smem", "Shared Memory · L1", "SM 안 · 블록 · SM", "SM당 256KB", "수십 사이클", 2],
    ["l2", "L2 캐시", "칩 안 · 모든 SM", "50MB", "약 200 사이클", 3],
    ["hbm", "HBM (VRAM)", "칩 옆 · GPU 전체", "80GB", "수백 사이클", 4],
    ["host", "Host Memory", "CPU 쪽 · PCIe 너머", "수백 GB 이상", "수 마이크로초", 5],
  ];
  const STACK = ["sapp", "slib", "slang", "scompile", "sruntime", "stools"];
  const VIEWS = [["hw", "하드웨어"], ["exec", "실행"], ["mem", "메모리"], ["sw", "소프트웨어"]];

  // 노드마다 어느 화면 어느 단계에서 보이는지
  const WHERE = {};
  const addWhere = (id, w) => { (WHERE[id] = WHERE[id] || []).push(w); };
  ORDER.forEach(lv => { const L = LEVELS[lv]; const seen = new Set(); if (L.frame) { seen.add(L.frame[0]); addWhere(L.frame[0], { v: "hw", lv }); } L.rows.forEach(r => r.forEach(c => { if (!seen.has(c[0])) { seen.add(c[0]); addWhere(c[0], { v: "hw", lv }); } })); });
  EXEC.forEach(([x]) => addWhere(x, { v: "exec" }));
  MEMORY.forEach(([n]) => addWhere(n, { v: "mem" }));
  STACK.forEach(n => addWhere(n, { v: "sw" }));
  const termKeys = n => GROUPS.flatMap(([g]) => NODES[n][g] || []);
  const nodesOf = key => Object.keys(NODES).filter(n => termKeys(n).includes(key));
  const crumb = (lv) => ORDER.slice(0, ORDER.indexOf(lv) + 1).map(x => LEVELS[x].title).join(" › ");
  const whereText = w => w.v === "hw" ? "하드웨어 › " + crumb(w.lv) : VIEWS.find(v => v[0] === w.v)[1];

  const app = document.getElementById("structure-app");
  if (!app) { window.STRUCTURE = { NODES, nodesOf }; return; }

  const st = { v: "hw", lv: "cluster", sel: "server", find: null };
  const $ = id => document.getElementById(id);
  const sessionLink = n => { const s = S.find(x => x.no === n); return s && s.page ? `<a href="${s.page}">${n}회차</a>` : `<span class="muted">${n}회차</span>`; };
  const cls = (n, extra = "") => `node ${extra}${n === st.sel ? " sel" : ""}${st.find && termKeys(n).includes(st.find) ? " has" : ""}`;

  function box(c) {
    const [n, label, sub, span, kind, zoom, cells] = c;
    const dots = cells ? `<span class="cells">${"<i></i>".repeat(cells)}</span>` : "";
    return `<button type="button" class="${cls(n, "k-" + kind.split(" ").join(" k-"))}" data-n="${n}"${zoom ? ` data-zoom="${zoom}"` : ""} style="grid-column:span ${span}">
      <b>${esc(label)}</b><small>${esc(sub)}</small>${dots}${zoom ? '<span class="zoom" aria-hidden="true">안으로 ›</span>' : ""}</button>`;
  }
  function drawHw() {
    const L = LEVELS[st.lv];
    const bc = ORDER.map(x => `<button type="button" class="chip${x === st.lv ? " on" : ""}" data-lv="${x}">${esc(LEVELS[x].title)}</button>`).join('<span class="sep">›</span>');
    const rows = L.rows.map(r => `<div class="row">${r.map(box).join("")}</div>`).join("");
    const frame = L.frame ? `<button type="button" class="${cls(L.frame[0], "frame-label")}" data-n="${L.frame[0]}">${esc(L.frame[1])}</button>` : "";
    return `<div class="crumbs" aria-label="확대 단계">${bc}</div>
      <div class="frame${L.frame ? "" : " open"}">${frame}<div class="grid4">${rows}</div></div>
      ${L.note ? `<p class="note">${esc(L.note)}</p>` : ""}
      <p class="note">칸을 누르면 오른쪽에 그 칸의 용어가 나옵니다. "안으로 ›"가 있는 칸은 한 번 더 누르면 안쪽 구조로 들어갑니다.</p>`;
  }
  function drawExec() {
    return `<div class="exec">${EXEC.map(([x, h, hl]) => `<div class="xrow">
      <button type="button" class="${cls(x, "k-ctrl")}" data-n="${x}"><b>${esc(NODES[x].name)}</b></button>
      <span class="arrow" aria-hidden="true">올라가는 곳 →</span>
      <button type="button" class="${cls(h, "k-comp")}" data-n="${h}" data-goto="hw"><b>${esc(hl)}</b><small>${esc(NODES[h].name)}</small></button></div>`).join("")}</div>
      <p class="note">왼쪽은 프로그램이 일을 나누는 단위이고, 오른쪽은 그 단위가 실제로 실행되는 하드웨어입니다.</p>`;
  }
  function drawMem() {
    return `<div class="ladder">${MEMORY.map(([n, label, where, size, lat, lvl]) => `<button type="button" class="${cls(n, "k-mem")}" data-n="${n}" style="--w:${40 + lvl * 12}%">
      <b>${esc(label)}</b><small>${esc(where)}</small><span class="m"><span>${esc(size)}</span><span>${esc(lat)}</span></span></button>`).join("")}</div>
      <p class="note">위로 갈수록 계산 유닛에서 가깝고, 빠르고, 작습니다. 크기는 H100 SXM, 지연은 대략값입니다.</p>`;
  }
  function drawSw() {
    return `<div class="stack">${STACK.map(n => `<button type="button" class="${cls(n, "k-ctrl")}" data-n="${n}"><b>${esc(NODES[n].name)}</b><small>${esc(termKeys(n).filter(k => (NODES[n].구성 || []).includes(k)).map(k => T[k].n.split(" (")[0]).join(" · ") || NODES[n].desc)}</small></button>`).join("")}
      <div class="hwbar">GPU 하드웨어</div></div>
      <p class="note">위가 사용자에게 가깝고, 아래로 갈수록 하드웨어에 가깝습니다.</p>`;
  }
  function drawPanel() {
    const n = NODES[st.sel]; if (!n) { $("st-panel").innerHTML = ""; return; }
    const groups = GROUPS.map(([g, label]) => (n[g] || []).length ? `<div class="tg"><div class="k">${label}</div><div class="tchips">${n[g].map(k => `<span class="tchip${k === st.find ? " on" : ""}"><button class="t" data-t="${k}">${esc(T[k].n)}</button></span>`).join("")}</div></div>` : "").join("");
    const ws = WHERE[st.sel] || [];
    const where = [ws.find(w => w.v === st.v) || ws[0]].filter(Boolean).map(whereText);
    const zoom = st.v === "hw" && LEVELS[st.lv].rows.flat().find(c => c[0] === st.sel && c[5]);
    const hwLink = n.hw ? `<button type="button" class="btn" data-n="${n.hw}" data-goto="hw">하드웨어에서 보기: ${esc(NODES[n.hw].name)}</button>` : "";
    $("st-panel").innerHTML = `<div class="k">${esc(where[0] || "")}</div><h2>${esc(n.name)}</h2><p>${esc(n.desc)}</p>
      ${zoom ? `<button type="button" class="btn" data-lv="${zoom[5]}">안쪽 구조 보기 ›</button>` : ""}${hwLink}
      ${groups || '<p class="muted">이 칸에 묶인 용어는 아직 없습니다.</p>'}
      ${n.s && n.s.length ? `<div class="sess"><span class="muted">다루는 회차:</span> ${n.s.map(sessionLink).join(", ")}</div>` : ""}`;
  }
  function draw() {
    document.querySelectorAll("#st-views .chip").forEach(b => b.classList.toggle("on", b.dataset.v === st.v));
    $("st-diagram").innerHTML = { hw: drawHw, exec: drawExec, mem: drawMem, sw: drawSw }[st.v]();
    drawPanel();
    drawFind();
  }
  function go(n, view) {
    const w = (WHERE[n] || []).find(x => !view || x.v === view) || (WHERE[n] || [])[0];
    if (w) { st.v = w.v; if (w.lv) st.lv = w.lv; }
    st.sel = n; draw();
  }
  function drawFind() {
    const out = $("st-found");
    if (!st.find) { out.innerHTML = ""; return; }
    const ns = nodesOf(st.find);
    out.innerHTML = `<b>${esc(T[st.find].n)}</b> · 있는 곳 ${ns.length}곳: ` + ns.map(n => `<button type="button" class="linkish" data-n="${n}" data-goto="any">${esc(whereText(WHERE[n][0]))} › ${esc(NODES[n].name)}</button>`).join(" · ") +
      ` <button type="button" class="iconbtn" id="st-clear" aria-label="찾기 지우기">×</button>`;
  }
  function find(key) {
    if (!T[key]) return;
    st.find = key; $("st-q").value = T[key].n;
    const ns = nodesOf(key);
    if (ns.length && !termKeys(st.sel).includes(key)) go(ns[0]); else draw();
  }

  app.innerHTML = `<div class="st-tools">
      <div class="seg" id="st-views">${VIEWS.map(([v, l]) => `<button type="button" class="chip" data-v="${v}">${l}</button>`).join("")}</div>
      <div class="st-find"><input id="st-q" type="search" list="st-terms" placeholder="용어로 위치 찾기 (예: warp, HBM, NCCL)" aria-label="용어로 위치 찾기" autocomplete="off">
      <datalist id="st-terms">${Object.entries(T).sort((a, b) => a[1].n.localeCompare(b[1].n, "ko")).map(([, g]) => `<option value="${esc(g.n)}">`).join("")}</datalist></div>
      <div class="note" id="st-found"></div>
    </div>
    <div class="st-body"><div class="st-diagram" id="st-diagram"></div><aside class="st-panel panel" id="st-panel" aria-live="polite"></aside></div>`;

  app.addEventListener("click", e => {
    if (e.target.closest("#st-clear")) { st.find = null; $("st-q").value = ""; draw(); return; }
    const v = e.target.closest("[data-v]"); if (v) { st.v = v.dataset.v; st.sel = { hw: st.sel, exec: "xblock", mem: "smem", sw: "slang" }[st.v]; if (st.v === "hw" && !(WHERE[st.sel] || []).some(w => w.v === "hw")) st.sel = LEVELS[st.lv].frame ? LEVELS[st.lv].frame[0] : "server"; draw(); return; }
    const lv = e.target.closest("[data-lv]"); if (lv) { st.v = "hw"; st.lv = lv.dataset.lv; const f = LEVELS[st.lv].frame; st.sel = f ? f[0] : "server"; draw(); return; }
    const b = e.target.closest("[data-n]"); if (!b) return;
    const n = b.dataset.n;
    if (b.dataset.goto) { go(n, b.dataset.goto === "any" ? null : b.dataset.goto); return; }
    if (b.dataset.zoom && st.sel === n) { st.lv = b.dataset.zoom; const f = LEVELS[st.lv].frame; st.sel = f ? f[0] : n; draw(); return; }
    st.sel = n; draw();
    if (innerWidth <= 900) $("st-panel").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("st-q").addEventListener("change", e => {
    const q = e.target.value.trim().toLowerCase(); if (!q) { st.find = null; draw(); return; }
    const hit = Object.entries(T).find(([k, g]) => k === q || g.n.toLowerCase() === q) || Object.entries(T).find(([, g]) => g.n.toLowerCase().includes(q));
    if (hit) find(hit[0]); else $("st-found").textContent = "일치하는 용어가 없습니다.";
  });

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-locate]"); if (!b) return;
    const pop = document.getElementById("pop"); if (pop) pop.hidden = true;
    find(b.dataset.locate); app.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("t")) find(h.get("t")); else if (h.get("n") && NODES[h.get("n")]) go(h.get("n")); else draw();
  window.STRUCTURE = { NODES, nodesOf };
})();
