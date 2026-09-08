
(() => {
"use strict";

const SAVE_KEY = "crusade-engine-save-v1";
const fmt = n => {
  if (!Number.isFinite(n)) return "∞";
  if (Math.abs(n) < 1000) return (Math.round(n * 100) / 100).toLocaleString();
  const units = ["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No"];
  let i = -1, v = n;
  while (Math.abs(v) >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)}${units[i]}`;
};
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const deepClone = o => JSON.parse(JSON.stringify(o));

const RESOURCES = {
  rations: {name:"Rations"},
  plasteel: {name:"Plasteel"},
  promethium: {name:"Promethium"},
  data: {name:"Cogitator Data"},
  faith: {name:"Zeal"}
};

const UNIT_DEFS = {
  levy: {
    group:"forces", name:"Press-Ganged Levy", desc:"Mass infantry drafted from hive districts.",
    baseCost:{rations:25}, growth:1.17, produces:{faith:0.03}
  },
  rifle: {
    group:"forces", name:"Line Cohort", desc:"Disciplined rifle companies capable of holding a front.",
    baseCost:{rations:90,plasteel:12}, growth:1.18, produces:{faith:0.09}, consumes:{rations:0.01},
    unlock:"field_discipline"
  },
  shock: {
    group:"forces", name:"Shock Legion", desc:"Armoured assault troops for breach operations.",
    baseCost:{rations:350,plasteel:160,promethium:35}, growth:1.19, produces:{faith:0.30}, consumes:{promethium:0.02},
    unlock:"carapace"
  },
  knight: {
    group:"forces", name:"Gene-Wrought Knight", desc:"Rare transhuman warriors maintained by sealed gene-vaults.",
    baseCost:{rations:1800,plasteel:950,promethium:220,data:180}, growth:1.20, produces:{faith:1.2}, consumes:{promethium:0.08},
    unlock:"gene_craft"
  },
  foundry: {
    group:"industry", name:"Foundry Stack", desc:"Converts raw salvage into plasteel.",
    baseCost:{rations:50,plasteel:10}, growth:1.16, produces:{plasteel:0.6}, consumes:{rations:0.025}
  },
  refinery: {
    group:"industry", name:"Fuel Refinery", desc:"Processes deep-crust hydrocarbons into promethium.",
    baseCost:{rations:120,plasteel:45}, growth:1.17, produces:{promethium:0.24}, consumes:{rations:0.04},
    unlock:"deep_drilling"
  },
  cogitator: {
    group:"industry", name:"Cogitator Vault", desc:"Machine shrines collate tactical and industrial data.",
    baseCost:{plasteel:180,promethium:35}, growth:1.19, produces:{data:0.14}, consumes:{promethium:0.015},
    unlock:"logic_engines"
  },
  manufactorum: {
    group:"industry", name:"War Manufactorum", desc:"A self-feeding military industry complex.",
    baseCost:{plasteel:950,promethium:260,data:120}, growth:1.20, produces:{plasteel:3.5,promethium:0.55}, consumes:{rations:0.10},
    unlock:"war_economy"
  }
};

const RESEARCH_DEFS = {
  field_discipline:{name:"Field Discipline",desc:"Unlock Line Cohorts. +10% force Zeal generation.",cost:{data:12,faith:8}},
  deep_drilling:{name:"Deep Drilling",desc:"Unlock Fuel Refineries. +10% Promethium production.",cost:{data:25,plasteel:80}},
  logic_engines:{name:"Logic Engines",desc:"Unlock Cogitator Vaults. +15% Data production.",cost:{data:40,promethium:30},requires:["deep_drilling"]},
  carapace:{name:"Carapace Doctrine",desc:"Unlock Shock Legions. +15% force Zeal generation.",cost:{data:80,faith:100,plasteel:250},requires:["field_discipline"]},
  war_economy:{name:"Total War Economy",desc:"Unlock War Manufactorums. +20% industrial output.",cost:{data:160,plasteel:900,promethium:260},requires:["logic_engines"]},
  gene_craft:{name:"Gene-Craft Sanction",desc:"Unlock Gene-Wrought Knights. +25% elite output.",cost:{data:400,faith:650,promethium:500},requires:["carapace","war_economy"]},
  auto_quartermaster:{name:"Quartermaster Cogitation",desc:"Enables automatic purchasing of affordable units.",cost:{data:220,faith:300},requires:["logic_engines"]},
  void_charting:{name:"Void Charting",desc:"Required to leave the first sector and begin true crusade progression.",cost:{data:350,faith:500,promethium:350},requires:["war_economy"]}
};

const DOCTRINE_DEFS = {
  logistics:{name:"Logistics Primacy",desc:"+20% all resource production per rank.",base:2,max:10},
  veteran:{name:"Veteran Muster",desc:"Begin each campaign with +5 Levy and +1 Foundry per rank.",base:3,max:8},
  archive:{name:"Sealed Archive",desc:"Retain 10% of Cogitator Data after campaign reset per rank.",base:4,max:5},
  devotion:{name:"Unbroken Creed",desc:"+25% Zeal generation per rank.",base:3,max:10}
};

const SECTORS = [
  {name:"Ashfall Reach",desc:"A dead industrial moon under intermittent raider pressure.",level:1,req:{faith:120,plasteel:400},legacy:1,mods:{industry:1,forces:1,threat:0.05}},
  {name:"Cinder Marches",desc:"A furnace world whose storms punish fuel-starved armies.",level:2,req:{faith:900,promethium:600,plasteel:2200},legacy:2,mods:{industry:1.12,forces:0.93,threat:0.10}},
  {name:"Gallowspire",desc:"A hive planet divided by insurgent cults and failing life-support.",level:3,req:{faith:4200,data:1000,plasteel:9000},legacy:4,mods:{industry:0.95,forces:1.18,threat:0.14}},
  {name:"Null Basilica",desc:"An ancient shrine-complex whose machine vaults resist all intrusion.",level:4,req:{faith:14000,data:5200,promethium:9000},legacy:7,mods:{industry:1.05,forces:1.05,threat:0.18}},
  {name:"Black Meridian",desc:"The crusade reaches a fortress-system built around a dying star.",level:5,req:{faith:50000,data:18000,plasteel:70000,promethium:28000},legacy:12,mods:{industry:1.20,forces:0.95,threat:0.22}}
];

function newState(){
  return {
    version:1,
    resources:{rations:100,plasteel:0,promethium:0,data:0,faith:0},
    units:Object.fromEntries(Object.keys(UNIT_DEFS).map(k=>[k,0])),
    research:{},
    doctrine:{logistics:0,veteran:0,archive:0,devotion:0},
    sector:0,
    cleared:[],
    legacy:0,
    buyAmount:"1",
    autoBuy:false,
    compact:false,
    lastUpdate:Date.now(),
    lastSave:Date.now(),
    playedSeconds:0,
    log:[{t:Date.now(),m:"Command authority established. Production lines await orders."}]
  };
}

let state = newState();
let rates = Object.fromEntries(Object.keys(RESOURCES).map(k=>[k,0]));
let lastRender = 0;

function log(msg){
  state.log.unshift({t:Date.now(),m:msg});
  state.log = state.log.slice(0,40);
}

function sector(){ return SECTORS[state.sector % SECTORS.length]; }
function researchDone(id){ return !!state.research[id]; }

function researchMultiplier(kind){
  let m=1;
  if(kind==="forces"){
    if(researchDone("field_discipline")) m*=1.10;
    if(researchDone("carapace")) m*=1.15;
  }
  if(kind==="promethium" && researchDone("deep_drilling")) m*=1.10;
  if(kind==="data" && researchDone("logic_engines")) m*=1.15;
  if(kind==="industry" && researchDone("war_economy")) m*=1.20;
  return m;
}

function globalMultiplier(){
  return Math.pow(1.20, state.doctrine.logistics || 0);
}
function zealMultiplier(){
  return Math.pow(1.25, state.doctrine.devotion || 0);
}

function computeRates(){
  const out = {rations:0,plasteel:0,promethium:0,data:0,faith:0};
  // Basic civilian ration tithe: keeps the early game moving.
  out.rations += 1.35 * globalMultiplier();

  for(const [id,def] of Object.entries(UNIT_DEFS)){
    const q=state.units[id]||0;
    if(!q) continue;
    let mod=globalMultiplier();
    if(def.group==="industry") mod*=sector().mods.industry*researchMultiplier("industry");
    if(def.group==="forces") mod*=sector().mods.forces*researchMultiplier("forces");
    if(id==="knight" && researchDone("gene_craft")) mod*=1.25;
    if(def.produces){
      for(const [r,v] of Object.entries(def.produces)){
        let rm=mod;
        if(r==="promethium") rm*=researchMultiplier("promethium");
        if(r==="data") rm*=researchMultiplier("data");
        if(r==="faith") rm*=zealMultiplier();
        out[r]+=q*v*rm;
      }
    }
    if(def.consumes){
      for(const [r,v] of Object.entries(def.consumes)) out[r]-=q*v;
    }
  }

  // Threat attrition is a world malus: higher sectors eat into rations and fuel.
  const threat=sector().mods.threat;
  out.rations -= threat*(1+state.units.shock*0.01+state.units.knight*0.025);
  out.promethium -= threat*Math.max(0,state.units.shock*0.005+state.units.knight*0.012);
  rates=out;
}

function advance(dt){
  computeRates();
  // Stop individual negative resources at zero rather than allowing debt.
  for(const r of Object.keys(state.resources)){
    const delta=rates[r]*dt;
    if(delta<0 && state.resources[r]+delta<0){
      state.resources[r]=0;
    }else{
      state.resources[r]=Math.max(0,state.resources[r]+delta);
    }
  }
  state.playedSeconds+=dt;
}

function costFor(id,count){
  const def=UNIT_DEFS[id], owned=state.units[id]||0;
  const total={};
  for(const [r,base] of Object.entries(def.baseCost)){
    let sum=0;
    for(let i=0;i<count;i++) sum += base*Math.pow(def.growth,owned+i);
    total[r]=sum;
  }
  return total;
}
function canAfford(cost){
  return Object.entries(cost).every(([r,v])=>(state.resources[r]||0)+1e-9>=v);
}
function pay(cost){
  for(const [r,v] of Object.entries(cost)) state.resources[r]=Math.max(0,state.resources[r]-v);
}
function maxAffordable(id,cap=1000){
  let lo=0,hi=1;
  while(hi<cap && canAfford(costFor(id,hi))){lo=hi;hi*=2;}
  hi=Math.min(hi,cap);
  while(lo+1<hi){
    const mid=Math.floor((lo+hi)/2);
    if(canAfford(costFor(id,mid)))lo=mid; else hi=mid;
  }
  return canAfford(costFor(id,hi))?hi:lo;
}
function buyUnit(id, forcedCount=null){
  const def=UNIT_DEFS[id];
  if(def.unlock && !researchDone(def.unlock)) return;
  let count=forcedCount;
  if(count==null){
    count=state.buyAmount==="max"?maxAffordable(id):Number(state.buyAmount);
  }
  if(!count || count<1) return;
  const cost=costFor(id,count);
  if(!canAfford(cost)) return;
  pay(cost); state.units[id]+=count;
  if(count>=10) log(`Quartermaster mustered ${count} × ${def.name}.`);
}

function researchAvailable(id){
  const d=RESEARCH_DEFS[id];
  return !state.research[id] && (!d.requires || d.requires.every(researchDone));
}
function buyResearch(id){
  const d=RESEARCH_DEFS[id];
  if(!researchAvailable(id) || !canAfford(d.cost)) return;
  pay(d.cost);state.research[id]=true;
  log(`Research completed: ${d.name}.`);
  if(id==="auto_quartermaster") state.autoBuy=true;
}

function doctrineCost(id){
  const d=DOCTRINE_DEFS[id],rank=state.doctrine[id]||0;
  return Math.ceil(d.base*Math.pow(1.7,rank));
}
function buyDoctrine(id){
  const d=DOCTRINE_DEFS[id],rank=state.doctrine[id]||0,c=doctrineCost(id);
  if(rank>=d.max || state.legacy<c) return;
  state.legacy-=c;state.doctrine[id]++;
  log(`Doctrine advanced: ${d.name} rank ${state.doctrine[id]}.`);
}

function campaignReady(){
  return Object.entries(sector().req).every(([r,v])=>(state.resources[r]||0)>=v) &&
    (state.sector===0 ? researchDone("void_charting") : true);
}
function completeCampaign(){
  if(!campaignReady()) return;
  const s=sector();
  if(!state.cleared.includes(state.sector)) state.cleared.push(state.sector);
  state.legacy += s.legacy;
  log(`${s.name} pacified. ${s.legacy} Legacy gained.`);

  const oldData=state.resources.data;
  state.sector=(state.sector+1)%SECTORS.length;
  const doctrine=deepClone(state.doctrine);
  const legacy=state.legacy, cleared=[...state.cleared], compact=state.compact, auto=state.autoBuy;
  const retainedData=oldData*0.10*(doctrine.archive||0);

  state.resources={rations:100,plasteel:0,promethium:0,data:retainedData,faith:0};
  state.units=Object.fromEntries(Object.keys(UNIT_DEFS).map(k=>[k,0]));
  state.research={};
  state.doctrine=doctrine;
  state.legacy=legacy;state.cleared=cleared;state.compact=compact;state.autoBuy=auto;
  state.units.levy=(doctrine.veteran||0)*5;
  state.units.foundry=(doctrine.veteran||0);
  if(state.sector>0){ state.research.field_discipline=true; }
  log(`Translation complete. Crusade entered ${sector().name}.`);
  save();
}

function autoBuy(){
  if(!state.autoBuy || !researchDone("auto_quartermaster")) return;
  const priority=["foundry","refinery","cogitator","levy","rifle","manufactorum","shock","knight"];
  for(const id of priority){
    const def=UNIT_DEFS[id];
    if(def.unlock && !researchDone(def.unlock)) continue;
    const c=costFor(id,1);
    if(canAfford(c)){ buyUnit(id,1); break; }
  }
}

function save(){
  state.lastSave=Date.now();
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const parsed=JSON.parse(raw);
    state=Object.assign(newState(),parsed);
    state.resources=Object.assign(newState().resources,parsed.resources||{});
    state.units=Object.assign(newState().units,parsed.units||{});
    state.doctrine=Object.assign(newState().doctrine,parsed.doctrine||{});
    const now=Date.now();
    const offline=clamp((now-(state.lastUpdate||now))/1000,0,8*3600);
    if(offline>2){
      // Offline approximation: integrate with current static rates in chunks.
      let remain=offline;
      while(remain>0){const step=Math.min(remain,60);advance(step);remain-=step;}
      log(`Offline logistics processed ${Math.floor(offline/60)} minutes of elapsed time.`);
    }
    state.lastUpdate=now;
  }catch(e){
    console.error(e);
    state=newState();
  }
}

function reqText(req){
  return Object.entries(req).map(([r,v])=>`${RESOURCES[r]?.name||r}: ${fmt(v)}`).join(" · ");
}
function flowText(def){
  const p=Object.entries(def.produces||{}).map(([r,v])=>`+${v}/s ${RESOURCES[r].name}`);
  const c=Object.entries(def.consumes||{}).map(([r,v])=>`−${v}/s ${RESOURCES[r].name}`);
  return [...p,...c].join(" · ")||"No passive flow";
}
function effectiveFlow(def,id){
  const q=state.units[id]||0;
  if(!q) return "";
  let bits=[];
  for(const [r,v] of Object.entries(def.produces||{})){
    const total = Math.max(0, rates[r]); // only approximate global display
    bits.push(`${RESOURCES[r].name} network ${total>=0?"+":""}${fmt(total)}/s`);
  }
  return bits.join(" · ");
}

function renderResources(){
  const el=document.getElementById("resourceStrip");
  el.innerHTML=Object.entries(RESOURCES).map(([id,d])=>{
    const rate=rates[id]||0;
    return `<div class="resource">
      <div class="r-name">${d.name}</div>
      <div class="r-value">${fmt(state.resources[id])}</div>
      <div class="r-rate ${rate<0?"bad":""}">${rate>=0?"+":""}${fmt(rate)}/s</div>
    </div>`;
  }).join("");
}
function renderUnitCards(group){
  const target=document.getElementById(group+"Cards");
  target.innerHTML=Object.entries(UNIT_DEFS).filter(([,d])=>d.group===group).map(([id,d])=>{
    const locked=d.unlock&&!researchDone(d.unlock);
    let count=state.buyAmount==="max"?Math.max(1,maxAffordable(id)):Number(state.buyAmount);
    const cost=costFor(id,count||1);
    return `<article class="unit-card ${locked?"locked":""}">
      <div class="unit-head"><div><span class="badge">${group}</span><h3>${d.name}</h3></div><div class="unit-qty">${fmt(state.units[id])}</div></div>
      <div class="unit-desc">${d.desc}</div>
      <div class="flow">${flowText(d)}${effectiveFlow(d,id)?`<br><span class="muted">${effectiveFlow(d,id)}</span>`:""}</div>
      <div class="cost">${locked?`Requires ${RESEARCH_DEFS[d.unlock]?.name||d.unlock}`:`Cost × ${count}: ${reqText(cost)}`}</div>
      <div class="card-actions"><button data-buyunit="${id}" ${locked||!canAfford(cost)?"disabled":""}>Muster / Build</button></div>
    </article>`;
  }).join("");
}
function renderResearch(){
  const el=document.getElementById("researchCards");
  el.innerHTML=Object.entries(RESEARCH_DEFS).map(([id,d])=>{
    const complete=researchDone(id), avail=researchAvailable(id);
    return `<article class="tech ${complete?"complete":avail?"":"locked"}">
      <span class="badge">${complete?"completed":"research"}</span>
      <h3>${d.name}</h3>
      <p>${d.desc}</p>
      <div class="req">${d.requires?.length?`Prerequisites: ${d.requires.map(x=>RESEARCH_DEFS[x].name).join(", ")}`:"No prerequisite"}</div>
      <div class="cost">${complete?"Sanction recorded":`Cost: ${reqText(d.cost)}`}</div>
      <button data-research="${id}" ${complete||!avail||!canAfford(d.cost)?"disabled":""}>${complete?"Complete":"Authorise"}</button>
    </article>`;
  }).join("");
}
function renderDoctrine(){
  document.getElementById("doctrineLegacy").textContent=fmt(state.legacy);
  document.getElementById("doctrineCards").innerHTML=Object.entries(DOCTRINE_DEFS).map(([id,d])=>{
    const rank=state.doctrine[id]||0,c=doctrineCost(id),max=rank>=d.max;
    return `<article class="tech ${max?"complete":""}">
      <span class="badge">rank ${rank}/${d.max}</span><h3>${d.name}</h3><p>${d.desc}</p>
      <div class="cost">${max?"Maximum doctrine":`Cost: ${c} Legacy`}</div>
      <button data-doctrine="${id}" ${max||state.legacy<c?"disabled":""}>Inscribe Doctrine</button>
    </article>`;
  }).join("");
}
function renderCampaigns(){
  document.getElementById("campaignGrid").innerHTML=SECTORS.map((s,i)=>{
    const current=i===state.sector,cleared=state.cleared.includes(i);
    return `<article class="campaign ${current?"current":""} ${cleared?"cleared":""}">
      <span class="badge">${current?"current":cleared?"pacified":"unreached"}</span>
      <h3>${s.name}</h3><p>${s.desc}</p>
      <div class="cost">Objectives: ${reqText(s.req)}</div>
      <div class="cost">Legacy reward: ${s.legacy}</div>
      <div class="cost">World modifiers: Industry ×${s.mods.industry.toFixed(2)}, Forces ×${s.mods.forces.toFixed(2)}</div>
    </article>`;
  }).join("");
}
function renderOverview(){
  const s=sector();
  document.getElementById("sectorName").textContent=s.name;
  document.getElementById("sectorLevel").textContent=s.level;
  document.getElementById("legacy").textContent=fmt(state.legacy);
  document.getElementById("overviewSector").textContent=s.name;
  document.getElementById("overviewDesc").textContent=s.desc;

  const progress=document.getElementById("campaignProgress");
  progress.innerHTML=Object.entries(s.req).map(([r,v])=>{
    const have=state.resources[r]||0,pct=clamp(have/v*100,0,100);
    return `<div class="progress-line"><div class="progress-meta"><span>${RESOURCES[r].name}</span><span>${fmt(have)} / ${fmt(v)}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join("") + (state.sector===0&&!researchDone("void_charting")?`<div class="progress-line bad">Void Charting research required before translation.</div>`:"");
  document.getElementById("travelBtn").disabled=!campaignReady();

  const prod=document.getElementById("productionSummary");
  prod.innerHTML=Object.entries(rates).map(([r,v])=>`<div class="summary-row"><span>${RESOURCES[r].name}</span><span class="${v>=0?"good":"bad"}">${v>=0?"+":""}${fmt(v)}/s</span></div>`).join("");

  const threat=sector().mods.threat;
  document.getElementById("threatSummary").innerHTML=`
    <div class="summary-row"><span>Hostile pressure</span><span class="bad">${Math.round(threat*100)}%</span></div>
    <div class="summary-row"><span>Industrial modifier</span><span>${sector().mods.industry.toFixed(2)}×</span></div>
    <div class="summary-row"><span>Force modifier</span><span>${sector().mods.forces.toFixed(2)}×</span></div>
    <div class="summary-row"><span>Campaign ready</span><span class="${campaignReady()?"good":"muted"}">${campaignReady()?"YES":"NO"}</span></div>`;

  document.getElementById("log").innerHTML=state.log.map(x=>`<div class="log-entry"><span class="gold">${new Date(x.t).toLocaleTimeString()}</span> — ${x.m}</div>`).join("");
}
function render(){
  computeRates();
  renderResources();renderOverview();renderUnitCards("forces");renderUnitCards("industry");renderResearch();renderCampaigns();renderDoctrine();
  document.getElementById("autoBuyToggle").checked=state.autoBuy;
  document.getElementById("compactToggle").checked=state.compact;
  document.body.classList.toggle("compact",state.compact);
  document.querySelectorAll(".batch").forEach(b=>b.classList.toggle("active",b.dataset.buy===state.buyAmount));
  document.getElementById("gameClock").textContent=`Operational time: ${Math.floor(state.playedSeconds/3600)}h ${Math.floor(state.playedSeconds/60)%60}m`;
}

function bind(){
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.getElementById("tab-"+b.dataset.tab).classList.add("active");
  }));
  document.querySelectorAll(".batch").forEach(b=>b.addEventListener("click",()=>{state.buyAmount=b.dataset.buy;render()}));
  document.addEventListener("click",e=>{
    const u=e.target.closest("[data-buyunit]"); if(u){buyUnit(u.dataset.buyunit);render();return}
    const r=e.target.closest("[data-research]"); if(r){buyResearch(r.dataset.research);render();return}
    const d=e.target.closest("[data-doctrine]"); if(d){buyDoctrine(d.dataset.doctrine);render();return}
  });
  document.getElementById("travelBtn").addEventListener("click",()=>{completeCampaign();render()});
  document.getElementById("saveBtn").addEventListener("click",()=>{save();log("Manual save written to local storage.");render()});
  document.getElementById("autoBuyToggle").addEventListener("change",e=>{
    if(e.target.checked&&!researchDone("auto_quartermaster")){e.target.checked=false;log("Quartermaster Cogitation research is required.");}
    else state.autoBuy=e.target.checked;render();
  });
  document.getElementById("compactToggle").addEventListener("change",e=>{state.compact=e.target.checked;render()});
  document.getElementById("resetBtn").addEventListener("click",()=>{
    if(confirm("Erase all campaign progress and doctrine?")){localStorage.removeItem(SAVE_KEY);state=newState();render();}
  });
  const modal=document.getElementById("exportModal");
  document.getElementById("exportBtn").addEventListener("click",()=>{
    const txt=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    document.getElementById("exportText").value=txt;modal.classList.remove("hidden");
  });
  document.getElementById("closeModalBtn").addEventListener("click",()=>modal.classList.add("hidden"));
  document.getElementById("copyExportBtn").addEventListener("click",async()=>{
    await navigator.clipboard.writeText(document.getElementById("exportText").value);
  });
}

load();bind();render();
let last=performance.now(), autoAcc=0, saveAcc=0;
function loop(now){
  const dt=clamp((now-last)/1000,0,1);last=now;
  advance(dt);autoAcc+=dt;saveAcc+=dt;state.lastUpdate=Date.now();
  if(autoAcc>=1){autoBuy();autoAcc=0;}
  if(saveAcc>=30){save();saveAcc=0;}
  if(now-lastRender>250){render();lastRender=now;}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
