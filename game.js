
(() => {
"use strict";
const D = window.GAME_DATA;
const SAVE_KEY = "cinder-throne-sector-command-v020";

const now = () => Date.now();
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const clone = o => JSON.parse(JSON.stringify(o));

function makeState(){
  return {
    version:D.version,
    resources:{provisions:120,alloy:15,fuel:0,data:0,authority:0,relics:0},
    units:Object.fromEntries(Object.keys(D.units).map(k=>[k,0])),
    research:{},
    doctrine:Object.fromEntries(Object.keys(D.doctrine).map(k=>[k,0])),
    achievements:{},
    sector:0,
    cleared:[],
    legacy:0,
    totalLegacy:0,
    threatProgress:0,
    suppressions:0,
    buyAmount:"1",
    autoBuy:false,
    compact:false,
    scientific:false,
    playedSeconds:0,
    totalUnitsBought:0,
    totalResearch:0,
    lastUpdate:now(),
    lastSave:now(),
    createdAt:now(),
    log:[{t:now(),m:"Sector command established. Civil and military ledgers opened."}]
  };
}
let state = makeState();
let rates = {};
let unitRates = {};
let lastFrame = performance.now();
let lastRender = 0;
let autoTimer = 0;
let saveTimer = 0;

function fmt(n){
  if(!Number.isFinite(n)) return "∞";
  if(state.scientific && Math.abs(n)>=1000) return n.toExponential(2);
  if(Math.abs(n)<1000) return (Math.round(n*100)/100).toLocaleString();
  const units=["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
  let v=n,i=-1;
  while(Math.abs(v)>=1000 && i<units.length-1){v/=1000;i++;}
  return `${v.toFixed(v>=100?0:v>=10?1:2)}${units[i]}`;
}
function log(m){
  state.log.unshift({t:now(),m});
  state.log=state.log.slice(0,50);
}
function sector(){return D.sectors[state.sector];}
function done(id){return !!state.research[id];}
function unlockedUnit(def){return !def.unlock || done(def.unlock);}

function doctrineMult(id, per){
  return Math.pow(1+per,(state.doctrine[id]||0));
}
function industryMult(){
  let m=sector().mods.industry*doctrineMult("logistics",.18);
  if(done("total_war")) m*=1.20;
  return m;
}
function forcePowerMult(group){
  let m=group==="fleet"?sector().mods.fleet:sector().mods.forces;
  m*=doctrineMult("conquest",.12);
  if(group==="forces" && done("carapace_frames")) m*=1.08;
  if(group==="forces" && done("walking_arsenal")) m*=1.12;
  if(group==="fleet" && done("bastion_keels")) m*=1.15;
  return m;
}
function authorityMult(){
  let m=doctrineMult("creed",.20);
  if(done("cohort_discipline")) m*=1.10;
  return m;
}
function relicMult(){
  let m=doctrineMult("salvage",.25);
  if(done("relic_analysis")) m*=1.50;
  return m;
}
function fleetFuelMult(){
  return done("fleet_logistics")?.85:1;
}
function threatGrowthMult(){
  return done("archive_prediction")?.80:1;
}

function computePower(){
  let ground=0,fleet=0;
  for(const [id,def] of Object.entries(D.units)){
    const q=state.units[id]||0;
    if(def.group==="forces") ground+=q*(def.power||0);
    if(def.group==="fleet") fleet+=q*(def.power||0);
  }
  ground*=forcePowerMult("forces");
  fleet*=forcePowerMult("fleet");
  return {ground,fleet,total:ground+fleet};
}

function computeRates(){
  const r=Object.fromEntries(Object.keys(D.resources).map(k=>[k,0]));
  const ur=Object.fromEntries(Object.keys(D.units).map(k=>[k,0]));

  // Civilian tithe ensures a playable start.
  r.provisions += 1.15*doctrineMult("logistics",.18);

  for(const [id,def] of Object.entries(D.units)){
    const q=state.units[id]||0;
    if(q<=0) continue;
    let prodMult=1;
    if(def.group==="industry") prodMult=industryMult();
    if(def.group==="forces") prodMult=sector().mods.forces*doctrineMult("logistics",.18);
    if(def.group==="fleet") prodMult=sector().mods.fleet*doctrineMult("logistics",.18);

    for(const [res,v] of Object.entries(def.produces||{})){
      let m=prodMult;
      if(res==="fuel" && done("deep_bore")) m*=1.10;
      if(res==="data" && done("machine_index")) m*=1.15;
      if(res==="authority") m*=authorityMult();
      if(res==="relics") m*=relicMult();
      r[res]+=q*v*m;
    }
    for(const [unit,v] of Object.entries(def.producesUnits||{})){
      ur[unit]+=q*v*prodMult;
    }
    for(const [res,v] of Object.entries(def.consumes||{})){
      let c=v;
      if(def.group==="fleet" && res==="fuel") c*=fleetFuelMult();
      r[res]-=q*c;
    }
  }

  // Threat pressure damages logistics when hostile strength exceeds readiness.
  const p=computePower();
  const hostile=sector().threat.base*(1+state.threatProgress);
  const pressure=Math.max(0,(hostile-p.total)/Math.max(1,hostile));
  r.provisions-=pressure*(0.16+state.sector*.05);
  r.fuel-=pressure*(0.025+state.sector*.012);

  rates=r; unitRates=ur;
  return {rates:r,unitRates:ur,pressure,hostile,power:p};
}

function advance(dt){
  const c=computeRates();

  // Resource flow with starvation floor.
  for(const id of Object.keys(state.resources)){
    const delta=(rates[id]||0)*dt;
    state.resources[id]=Math.max(0,state.resources[id]+delta);
  }

  // Automatic producer chains.
  for(const id of Object.keys(state.units)){
    const delta=(unitRates[id]||0)*dt;
    if(delta>0) state.units[id]+=delta;
  }

  // Threat escalates continuously; the value is capped for stability.
  const g=sector().threat.growth*threatGrowthMult();
  state.threatProgress=clamp(state.threatProgress+g*dt/60,0,5);

  state.playedSeconds+=dt;
  checkAchievements();
}

function unitCost(id,count){
  const d=D.units[id],owned=Math.floor(state.units[id]||0),out={};
  for(const [res,base] of Object.entries(d.baseCost)){
    let sum=0;
    for(let i=0;i<count;i++) sum += base*Math.pow(d.growth,owned+i);
    out[res]=sum;
  }
  return out;
}
function canAfford(cost){
  return Object.entries(cost).every(([r,v])=>(state.resources[r]||0)+1e-9>=v);
}
function pay(cost){
  for(const [r,v] of Object.entries(cost)) state.resources[r]=Math.max(0,state.resources[r]-v);
}
function maxAffordable(id,cap=1000){
  let lo=0,hi=1;
  while(hi<cap && canAfford(unitCost(id,hi))){lo=hi;hi*=2;}
  hi=Math.min(hi,cap);
  while(lo+1<hi){
    const mid=Math.floor((lo+hi)/2);
    if(canAfford(unitCost(id,mid)))lo=mid;else hi=mid;
  }
  return canAfford(unitCost(id,hi))?hi:lo;
}
function purchaseUnit(id,forced=null){
  const d=D.units[id];
  if(!unlockedUnit(d)) return false;
  let count=forced ?? (state.buyAmount==="max"?maxAffordable(id):Number(state.buyAmount));
  count=Math.floor(count);
  if(count<1) return false;
  const c=unitCost(id,count);
  if(!canAfford(c)) return false;
  pay(c);state.units[id]+=count;state.totalUnitsBought+=count;
  if(count>=25) log(`${count} × ${d.name} entered the ledger.`);
  checkAchievements();
  return true;
}

function researchAvailable(id){
  const d=D.research[id];
  return !done(id) && (!d.requires || d.requires.every(done));
}
function buyResearch(id){
  const d=D.research[id];
  if(!researchAvailable(id)||!canAfford(d.cost))return;
  pay(d.cost);state.research[id]=true;state.totalResearch++;
  log(`Research sanctioned: ${d.name}.`);
  if(id==="quartermaster_core") state.autoBuy=true;
  checkAchievements();
}

function doctrineCost(id){
  const d=D.doctrine[id],rank=state.doctrine[id]||0;
  return Math.ceil(d.base*Math.pow(1.72,rank));
}
function buyDoctrine(id){
  const d=D.doctrine[id],rank=state.doctrine[id]||0,c=doctrineCost(id);
  if(rank>=d.max||state.legacy<c)return;
  state.legacy-=c;state.doctrine[id]++;
  log(`Doctrine inscribed: ${d.name}, rank ${state.doctrine[id]}.`);
}

function objectiveStatus(){
  const p=computePower();
  const req=sector().req;
  const statuses={};
  for(const [k,v] of Object.entries(req)){
    const have=k==="power"?p.total:(state.resources[k]||0);
    statuses[k]={have,need:v,ok:have>=v};
  }
  return statuses;
}
function campaignReady(){
  const ok=Object.values(objectiveStatus()).every(x=>x.ok);
  return ok && (state.sector>0 || done("translation_matrix"));
}

function advanceSector(){
  if(!campaignReady())return;
  const current=state.sector,s=sector();
  if(!state.cleared.includes(current)) state.cleared.push(current);
  state.legacy+=s.legacy;
  state.totalLegacy+=s.legacy;
  log(`${s.name} brought under command. ${s.legacy} Legacy awarded.`);

  const previousData=state.resources.data;
  const oldDoctrine=clone(state.doctrine);
  const oldLegacy=state.legacy,oldTotal=state.totalLegacy,oldCleared=[...state.cleared];
  const oldSettings={compact:state.compact,scientific:state.scientific,autoBuy:state.autoBuy};
  const oldStats={
    playedSeconds:state.playedSeconds,totalUnitsBought:state.totalUnitsBought,
    totalResearch:state.totalResearch,suppressions:state.suppressions,
    createdAt:state.createdAt,achievements:clone(state.achievements)
  };

  const next=(current+1)%D.sectors.length;
  state=makeState();
  state.sector=next;
  state.doctrine=oldDoctrine;
  state.legacy=oldLegacy;state.totalLegacy=oldTotal;state.cleared=oldCleared;
  Object.assign(state,oldSettings,oldStats);
  state.resources.data=previousData*(oldDoctrine.archive||0)*.08;
  state.units.ashLevy=(oldDoctrine.veterans||0)*8;
  state.units.smelter=(oldDoctrine.veterans||0);
  if(next>0){
    state.research.cohort_discipline=true;
    state.research.deep_bore=true;
  }
  state.log=[{t:now(),m:`Translation completed. Command entered ${D.sectors[next].name}.`}];
  checkAchievements();save();
}

function suppressThreat(){
  const p=computePower();
  const hostile=sector().threat.base*(1+state.threatProgress);
  const cost={authority:Math.max(25,hostile*.10),fuel:Math.max(5,hostile*.025)};
  if(p.total<hostile*.35 || !canAfford(cost)) return;
  pay(cost);
  const effect=clamp(.22+(p.total/Math.max(1,hostile))*.08,.22,.55);
  state.threatProgress=Math.max(0,state.threatProgress-effect);
  state.suppressions++;
  log(`Suppression operation completed against ${sector().threat.name}.`);
  checkAchievements();
}

function suppressionCost(){
  const hostile=sector().threat.base*(1+state.threatProgress);
  return {authority:Math.max(25,hostile*.10),fuel:Math.max(5,hostile*.025)};
}

function autoBuy(){
  if(!state.autoBuy || !done("quartermaster_core")) return;
  const order=["agriVault","smelter","reactorStill","archiveNode","ashLevy","steelCohort","musterHall","warFoundry","picket","breachGuard","lineFrigate","siegeWalker","geneKnight","geneVault","bastionShip"];
  for(const id of order){
    if(unlockedUnit(D.units[id]) && canAfford(unitCost(id,1))){
      purchaseUnit(id,1);break;
    }
  }
}

function achievementCheck(code){
  const ground=["ashLevy","steelCohort","breachGuard","geneKnight","siegeWalker"].reduce((a,k)=>a+(state.units[k]||0),0);
  const ships=["picket","lineFrigate","bastionShip"].reduce((a,k)=>a+(state.units[k]||0),0);
  switch(code){
    case "smelter10":return (state.units.smelter||0)>=10;
    case "ground100":return ground>=100;
    case "ship1":return ships>=1;
    case "relic25":return state.resources.relics>=25;
    case "suppress10":return state.suppressions>=10;
    case "clear4":return state.cleared.length>=4;
    case "legacy10":return state.totalLegacy>=10;
    case "throne":return state.cleared.includes(7);
    default:return false;
  }
}
function checkAchievements(){
  for(const [id,a] of Object.entries(D.achievements)){
    if(!state.achievements[id] && achievementCheck(a.check)){
      state.achievements[id]=now();
      log(`Achievement recorded: ${a.name}.`);
    }
  }
}

function save(){
  state.lastUpdate=now();state.lastSave=now();
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
}
function load(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return;
  try{
    const parsed=JSON.parse(raw);
    const fresh=makeState();
    state=Object.assign(fresh,parsed);
    state.resources=Object.assign(fresh.resources,parsed.resources||{});
    state.units=Object.assign(fresh.units,parsed.units||{});
    state.doctrine=Object.assign(fresh.doctrine,parsed.doctrine||{});
    const elapsed=clamp((now()-(parsed.lastUpdate||now()))/1000,0,8*3600);
    if(elapsed>3){
      let remaining=elapsed;
      while(remaining>0){
        const step=Math.min(remaining,30);
        advance(step);remaining-=step;
      }
      log(`Offline logistics processed ${Math.floor(elapsed/60)} minutes.`);
    }
    state.lastUpdate=now();
  }catch(e){
    console.error(e);state=makeState();
  }
}
function encodeSave(){
  const raw=JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(raw)));
}
function decodeSave(text){
  try{
    const raw=decodeURIComponent(escape(atob(text.trim())));
    const parsed=JSON.parse(raw);
    if(!parsed || typeof parsed!=="object" || !parsed.resources || !parsed.units) throw new Error("Invalid save");
    localStorage.setItem(SAVE_KEY,JSON.stringify(parsed));
    load();
    log("Imported save accepted.");
    save();render();
    return true;
  }catch(e){
    alert("That save string could not be imported.");
    return false;
  }
}

function labelForObjective(k){return k==="power"?"Combat Power":D.resources[k]?.name||k;}
function resourceText(cost){
  return Object.entries(cost).map(([k,v])=>`${labelForObjective(k)}: ${fmt(v)}`).join(" · ");
}
function flowText(d){
  const a=[];
  for(const [r,v] of Object.entries(d.produces||{})) a.push(`+${v}/s ${D.resources[r].name}`);
  for(const [u,v] of Object.entries(d.producesUnits||{})) a.push(`+${v}/s ${D.units[u].name}`);
  for(const [r,v] of Object.entries(d.consumes||{})) a.push(`−${v}/s ${D.resources[r].name}`);
  return a.join(" · ")||`Combat Power: ${d.power||0}`;
}
function threatClass(p){
  if(p<.15)return ["Contained","good"];
  if(p<.40)return ["Moderate","gold"];
  if(p<.70)return ["Severe","bad"];
  return ["Critical","bad"];
}

function renderResources(){
  computeRates();
  document.getElementById("resourceStrip").innerHTML=Object.entries(D.resources).map(([id,d])=>{
    const r=rates[id]||0;
    return `<div class="resource"><div class="r-name">${d.name}</div><div class="r-value">${fmt(state.resources[id])}</div><div class="r-rate ${r<0?"bad":""}">${r>=0?"+":""}${fmt(r)}/s</div></div>`;
  }).join("");
}

function renderUnits(group){
  const el=document.getElementById(group+"Cards");
  el.innerHTML=Object.entries(D.units).filter(([,d])=>d.group===group).map(([id,d])=>{
    const locked=!unlockedUnit(d);
    let count=state.buyAmount==="max"?Math.max(1,maxAffordable(id)):Number(state.buyAmount);
    let cost=unitCost(id,count);
    return `<article class="unit-card ${locked?"locked":""}">
      <div class="unit-head">
        <div><div class="badge">${group}</div><h3>${d.name}</h3></div>
        <div class="qty">${fmt(state.units[id])}</div>
      </div>
      <div class="unit-desc">${d.desc}</div>
      <div class="flow">${flowText(d)}${d.power?`<br><span class="gold">Base combat power ${fmt(d.power)} each</span>`:""}</div>
      <div class="cost">${locked?`Requires: ${D.research[d.unlock]?.name||d.unlock}`:`Cost × ${count}: ${resourceText(cost)}`}</div>
      <div class="card-actions"><button data-unit="${id}" ${locked||!canAfford(cost)?"disabled":""}>${group==="industry"?"Construct":"Muster"}</button></div>
    </article>`;
  }).join("");
}

function renderResearch(){
  document.getElementById("researchCards").innerHTML=Object.entries(D.research).map(([id,d])=>{
    const complete=done(id),available=researchAvailable(id);
    return `<article class="tech ${complete?"complete":available?"":"locked"}">
      <div class="badge">${complete?"complete":"research"}</div>
      <h3>${d.name}</h3><p>${d.desc}</p>
      <div class="req">${d.requires?.length?`Requires: ${d.requires.map(x=>D.research[x].name).join(", ")}`:"No prerequisite"}</div>
      <div class="cost">${complete?"Sanction recorded":`Cost: ${resourceText(d.cost)}`}</div>
      <button data-research="${id}" ${complete||!available||!canAfford(d.cost)?"disabled":""}>${complete?"Completed":"Authorise"}</button>
    </article>`;
  }).join("");
}

function renderDoctrine(){
  document.getElementById("legacyLarge").textContent=fmt(state.legacy);
  document.getElementById("doctrineCards").innerHTML=Object.entries(D.doctrine).map(([id,d])=>{
    const rank=state.doctrine[id]||0,c=doctrineCost(id),max=rank>=d.max;
    return `<article class="tech ${max?"complete":""}">
      <div class="badge">rank ${rank}/${d.max}</div>
      <h3>${d.name}</h3><p>${d.desc}</p>
      <div class="cost">${max?"Maximum rank reached":`Cost: ${c} Legacy`}</div>
      <button data-doctrine="${id}" ${max||state.legacy<c?"disabled":""}>Inscribe</button>
    </article>`;
  }).join("");
}

function renderSector(){
  document.getElementById("sectorGrid").innerHTML=D.sectors.map((s,i)=>{
    const current=i===state.sector,cleared=state.cleared.includes(i);
    return `<article class="sector-card ${current?"current":""} ${cleared?"cleared":""}">
      <div class="badge">${current?"active":cleared?"pacified":"unreached"}</div>
      <h3>${s.name}</h3><p>${s.desc}</p>
      <div class="flow">Threat: ${s.threat.name}<br>Industry ×${s.mods.industry.toFixed(2)} · Ground ×${s.mods.forces.toFixed(2)} · Fleet ×${s.mods.fleet.toFixed(2)}</div>
      <div class="cost">Objectives: ${resourceText(s.req)}</div>
      <div class="cost">Legacy reward: ${s.legacy}</div>
    </article>`;
  }).join("");
}

function renderCommand(){
  const c=computeRates(),s=sector(),obj=objectiveStatus();
  const hostile=c.hostile,power=c.power;
  const pressureRatio=Math.max(0,(hostile-power.total)/Math.max(1,hostile));
  const [threatTxt,threatCls]=threatClass(pressureRatio);

  document.getElementById("sectorName").textContent=s.name;
  document.getElementById("threatLabel").textContent=threatTxt;
  document.getElementById("threatLabel").className=threatCls;
  document.getElementById("legacyTop").textContent=fmt(state.legacy);
  document.getElementById("overviewSector").textContent=s.name;
  document.getElementById("overviewDesc").textContent=s.desc;

  document.getElementById("objectiveProgress").innerHTML=Object.entries(obj).map(([k,x])=>{
    const pct=clamp(x.have/x.need*100,0,100);
    return `<div class="progress-block"><div class="progress-meta"><span>${labelForObjective(k)}</span><span>${fmt(x.have)} / ${fmt(x.need)}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join("") + (state.sector===0&&!done("translation_matrix")?`<div class="bad" style="font:11px Arial,sans-serif;margin-top:8px">Translation Matrix research is required before the first sector transfer.</div>`:"");

  document.getElementById("advanceBtn").disabled=!campaignReady();

  document.getElementById("productionSummary").innerHTML=Object.entries(rates).map(([r,v])=>
    `<div class="summary-row"><span>${D.resources[r].name}</span><span class="${v>=0?"good":"bad"}">${v>=0?"+":""}${fmt(v)}/s</span></div>`
  ).join("");

  document.getElementById("powerSummary").innerHTML=`
    <div class="summary-row"><span>Ground power</span><span>${fmt(power.ground)}</span></div>
    <div class="summary-row"><span>Fleet power</span><span>${fmt(power.fleet)}</span></div>
    <div class="summary-row"><span>Total power</span><span class="gold">${fmt(power.total)}</span></div>
    <div class="summary-row"><span>Hostile strength</span><span class="bad">${fmt(hostile)}</span></div>`;

  const sc=suppressionCost();
  document.getElementById("threatSummary").innerHTML=`
    <div class="summary-row"><span>Hostile formation</span><span>${s.threat.name}</span></div>
    <div class="summary-row"><span>Escalation</span><span>${Math.round(state.threatProgress*100)}%</span></div>
    <div class="summary-row"><span>Logistics pressure</span><span class="${threatCls}">${Math.round(pressureRatio*100)}%</span></div>
    <div class="summary-row"><span>Suppression cost</span><span>${resourceText(sc)}</span></div>`;
  document.getElementById("suppressBtn").disabled=power.total<hostile*.35||!canAfford(sc)||state.threatProgress<=0;

  document.getElementById("log").innerHTML=state.log.map(x=>
    `<div class="log-entry"><span class="gold">${new Date(x.t).toLocaleTimeString()}</span> — ${x.m}</div>`
  ).join("");

  document.getElementById("clock").textContent=`Operational time ${Math.floor(state.playedSeconds/3600)}h ${Math.floor(state.playedSeconds/60)%60}m`;
}

function renderRecords(){
  const power=computePower();
  const achieved=Object.keys(state.achievements).length;
  document.getElementById("stats").innerHTML=`
    <div class="summary-row"><span>Total units purchased</span><span>${fmt(state.totalUnitsBought)}</span></div>
    <div class="summary-row"><span>Research completed</span><span>${state.totalResearch}</span></div>
    <div class="summary-row"><span>Campaigns concluded</span><span>${state.cleared.length}</span></div>
    <div class="summary-row"><span>Suppression operations</span><span>${state.suppressions}</span></div>
    <div class="summary-row"><span>Total Legacy earned</span><span>${state.totalLegacy}</span></div>
    <div class="summary-row"><span>Current combat power</span><span>${fmt(power.total)}</span></div>`;
  document.getElementById("achievementList").innerHTML=Object.entries(D.achievements).map(([id,a])=>{
    const got=!!state.achievements[id];
    return `<div class="achievement ${got?"":"locked"}"><strong>${got?"◆":"◇"} ${a.name}</strong>${a.desc}</div>`;
  }).join("");
  document.getElementById("saveInfo").innerHTML=`
    <div class="summary-row"><span>Save version</span><span>${state.version}</span></div>
    <div class="summary-row"><span>Created</span><span>${new Date(state.createdAt).toLocaleDateString()}</span></div>
    <div class="summary-row"><span>Last saved</span><span>${new Date(state.lastSave).toLocaleTimeString()}</span></div>
    <div class="summary-row"><span>Offline cap</span><span>8 hours</span></div>
    <div class="summary-row"><span>Storage</span><span>Browser localStorage</span></div>`;
}

function render(){
  computeRates();
  renderResources();
  renderCommand();
  renderUnits("industry");renderUnits("forces");renderUnits("fleet");
  renderResearch();renderDoctrine();renderSector();renderRecords();

  document.body.classList.toggle("compact",state.compact);
  document.getElementById("autoBuyToggle").checked=state.autoBuy;
  document.getElementById("compactToggle").checked=state.compact;
  document.getElementById("notationToggle").checked=state.scientific;
  document.querySelectorAll(".batch").forEach(x=>x.classList.toggle("active",x.dataset.buy===state.buyAmount));
}

function openModal(mode){
  const modal=document.getElementById("modal"),title=document.getElementById("modalTitle");
  const hint=document.getElementById("modalHint"),text=document.getElementById("saveText"),primary=document.getElementById("modalPrimary");
  modal.classList.remove("hidden");
  if(mode==="export"){
    title.textContent="Export Save";
    hint.textContent="Copy this string and keep it somewhere safe.";
    text.value=encodeSave();text.readOnly=true;
    primary.textContent="Copy";
    primary.onclick=async()=>{try{await navigator.clipboard.writeText(text.value);primary.textContent="Copied";}catch{ text.select(); }};
  }else{
    title.textContent="Import Save";
    hint.textContent="Paste a Cinder Throne save string below. Importing replaces the current local save.";
    text.value="";text.readOnly=false;
    primary.textContent="Import";
    primary.onclick=()=>{if(decodeSave(text.value)) modal.classList.add("hidden");};
  }
}

function bind(){
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.getElementById("tab-"+b.dataset.tab).classList.add("active");
  }));
  document.querySelectorAll(".batch").forEach(b=>b.addEventListener("click",()=>{state.buyAmount=b.dataset.buy;render();}));
  document.addEventListener("click",e=>{
    const u=e.target.closest("[data-unit]");if(u){purchaseUnit(u.dataset.unit);render();return;}
    const r=e.target.closest("[data-research]");if(r){buyResearch(r.dataset.research);render();return;}
    const d=e.target.closest("[data-doctrine]");if(d){buyDoctrine(d.dataset.doctrine);render();return;}
  });

  document.getElementById("advanceBtn").addEventListener("click",()=>{advanceSector();render();});
  document.getElementById("suppressBtn").addEventListener("click",()=>{suppressThreat();render();});
  document.getElementById("saveBtn").addEventListener("click",()=>{save();log("Manual save written.");render();});
  document.getElementById("exportBtn").addEventListener("click",()=>openModal("export"));
  document.getElementById("importBtn").addEventListener("click",()=>openModal("import"));
  document.getElementById("modalClose").addEventListener("click",()=>document.getElementById("modal").classList.add("hidden"));
  document.getElementById("resetBtn").addEventListener("click",()=>{
    if(confirm("Erase all Cinder Throne progress, including Legacy and achievements?")){
      localStorage.removeItem(SAVE_KEY);state=makeState();save();render();
    }
  });

  document.getElementById("autoBuyToggle").addEventListener("change",e=>{
    if(e.target.checked&&!done("quartermaster_core")){
      e.target.checked=false;log("Quartermaster Core research is required.");
    }else state.autoBuy=e.target.checked;
    render();
  });
  document.getElementById("compactToggle").addEventListener("change",e=>{state.compact=e.target.checked;render();});
  document.getElementById("notationToggle").addEventListener("change",e=>{state.scientific=e.target.checked;render();});
}

load();bind();render();

function loop(t){
  const dt=clamp((t-lastFrame)/1000,0,1);lastFrame=t;
  advance(dt);
  autoTimer+=dt;saveTimer+=dt;state.lastUpdate=now();

  if(autoTimer>=1){autoBuy();autoTimer=0;}
  if(saveTimer>=30){save();saveTimer=0;}
  if(t-lastRender>=250){render();lastRender=t;}

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
