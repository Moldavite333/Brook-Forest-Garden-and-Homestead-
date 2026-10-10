
(function(){"use strict";
const E=window.HAGP,view=document.getElementById("view"),nav=document.getElementById("top-nav"),bottom=document.getElementById("bottom-nav");
const tabs=[["home","⌂","Home"],["zones","▧","Zones"],["varieties","✳","Plants"],["trials","▤","Trials"],["weather","◷","Weather"],["data","⚙","Data"]];
let state,page="home",zoneEdit=null,varietyEdit=null,trialEdit=null,chosenTrial=null,chosenWeather=null,matching=null,matchingZone=null,plantSearch="",storeType="IndexedDB",busy=false,toastTimer=null;
const esc=x=>String(x===null||x===undefined?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText=x=>x?String(x).slice(0,10):"Not recorded";
const opts=(arr,val)=>arr.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(val)?" selected":"")+'>'+esc(t)+'</option>').join("");
const field=(label,name,value,type="text",other="")=>'<div class="field"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+esc(value??"")+'" '+other+'></div>';
const area=(label,name,value,help="")=>'<div class="field full"><label for="f-'+name+'">'+label+'</label><textarea id="f-'+name+'" name="'+name+'">'+esc(value??"")+'</textarea>'+(help?'<small class="muted">'+help+'</small>':"")+'</div>';
const pick=(label,name,values,current)=>'<div class="field"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'">'+opts(values,current)+'</select></div>';
const a=(text,action,id="",cls="secondary")=>'<button class="btn '+cls+'" type="button" data-action="'+action+'" data-id="'+esc(id)+'">'+text+'</button>';
const chip=(text,kind="")=>'<span class="chip '+kind+'">'+esc(text)+'</span>';
const fmt=n=>Number(n).toLocaleString();
const section=(name,body)=>'<section class="section"><h3>'+name+'</h3></section>'+body;
const heading=(tag,title,description,action="")=>'<div class="pagehead"><div><div class="eyebrow">'+tag+'</div><h2>'+title+'</h2><div class="lead">'+description+'</div></div>'+action+'</div>';
const blank=(title,sub)=>'<div class="empty"><b>'+title+'</b><p>'+sub+'</p></div>';
const statusBadge=s=>chip(s,s==="thrived"?"good":s==="failed"?"danger":s==="struggled"||s==="weeds"||s==="stabilize"?"warn":"");
const datelocal=()=>{let d=new Date(),z=d.getTimezoneOffset();return new Date(d.getTime()-z*60000).toISOString().slice(0,10)};
function notice(msg){document.querySelector(".toast")?.remove();let el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=msg;document.body.append(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),3700)}
let db=null;
async function openStore(){
 if(!window.indexedDB)throw Error("IndexedDB unavailable");
 return new Promise((resolve,reject)=>{const req=indexedDB.open("high-altitude-garden-planner",1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("data"))req.result.createObjectStore("data")};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
async function getStored(){if(db){return new Promise((resolve,reject)=>{let q=db.transaction("data","readonly").objectStore("data").get("garden");q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}let raw=localStorage.getItem("hagp-garden");return raw?JSON.parse(raw):null}
async function save(){state.updatedAt=new Date().toISOString();try{if(db){await new Promise((resolve,reject)=>{let tx=db.transaction("data","readwrite");tx.objectStore("data").put(state,"garden");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}else localStorage.setItem("hagp-garden",JSON.stringify(state))}catch(e){notice("Could not save. Export a backup now: "+e.message);throw e}}
async function commit(message){await save();render();if(message)notice(message)}
function navTab(tab){return (tab==="match"||tab==="edit-variety")?"varieties":(tab==="edit-zone"?"zones":(tab==="trial-detail"||tab==="edit-trial"?"trials":tab))}
function drawNav(){nav.innerHTML=tabs.map(([id,sym,text])=>'<button class="nav-btn" type="button" data-action="go" data-id="'+id+'" '+(navTab(page)===id?'aria-current="page"':"")+'><span aria-hidden="true">'+sym+'</span>'+text+'</button>').join("");
 bottom.innerHTML=tabs.map(([id,sym,text])=>'<button type="button" data-action="go" data-id="'+id+'" '+(navTab(page)===id?'aria-current="page"':"")+'><span aria-hidden="true">'+sym+'</span>'+text+'</button>').join("")}
function render(){drawNav();try{view.innerHTML=({home:home,zones:zonesPage,"edit-zone":zoneForm,varieties:varietiesPage,"edit-variety":varietyForm,match:matchPage,trials:trialsPage,"edit-trial":trialForm,"trial-detail":trialDetail,weather:weatherPage,data:dataPage}[page]||home)()}catch(err){console.error(err);view.innerHTML='<div class="notice bad">This screen had an error: '+esc(err.message)+'. Your saved data has not been erased.</div>'+a("Go home","go","home")}}
function home(){
 const aTrials=state.trials.filter(t=>t.status==="active").length,flagged=state.observations.filter(o=>o.flag==="suspect").length;
 return '<div class="hero"><div><div class="eyebrow" style="color:#c9e3d0">BROOK FOREST · '+esc(state.profile.elevationFt||"?")+' FT</div><h2>Every growing season should make the next one smarter.</h2><p>Find what grows here. Test what doesn’t. Keep the evidence instead of starting over every spring.</p><div class="buttons">'+a("Will It Grow Here? →","go","varieties","light")+a("Record a growing trial","add-trial","","light")+'</div></div></div>'+
 '<div class="grid"><div class="card"><div class="pillhead">Growing locations</div><div class="stat">'+fmt(state.zones.length)+'</div><div class="tiny muted">Editable property microclimates</div></div><div class="card"><div class="pillhead">Active trials</div><div class="stat">'+fmt(aTrials)+'</div><div class="tiny muted">Plants under observation</div></div><div class="card"><div class="pillhead">Weather records</div><div class="stat">'+fmt(state.observations.length)+'</div><div class="tiny muted">'+(flagged?flagged+" need manual review":"Manual/CSV observations")+'</div></div></div>'+
 section("Your first priorities",'<div class="grid two"><div class="card"><h3>01 · Document the property</h3><p>We’ve started with six named areas. Refine sunlight, moisture, and growing conditions as you measure them—not as Google Earth guesses.</p>'+a("Review zones","go","zones")+'</div><div class="card"><h3>02 · Start the evidence trail</h3><p>Record German Pink’s fruit-set history, your fall wildflower trials, and what actually returns in spring.</p>'+a("Open growing trials","go","trials")+'</div></div>')+
 section("Data honesty",'<div class="notice">No station is connected yet. The starter plant library and zone descriptions are <b>preliminary</b>; the app never treats unknown catalog requirements or regional forecasts as measurements at your house.</div>')+
 section("How this works",'<div class="grid"><div class="card"><span class="pillhead">1 · Compare</span><h3>Will It Grow Here?</h3><p>Use variety requirements against each garden location; see why a risk appears.</p></div><div class="card"><span class="pillhead">2 · Observe</span><h3>Log the season</h3><p>Seed, transplant, flower, fruit, fail, thrive—capture each stage and intervention.</p></div><div class="card"><span class="pillhead">3 · Learn</span><h3>Try something better</h3><p>Compare outcomes over years. One failure is information, not a final verdict.</p></div></div>');
}
function zonesPage(){
 return heading("PROPERTY PROFILE","Growing zones","Different beds on the same property can behave like different climates.",a("+ Add zone","add-zone","",""))+
 '<div class="grid two">'+state.zones.map(z=>'<article class="card"><div class="row row-top"><div><div class="item-title">'+esc(z.name)+'</div><div class="item-meta">'+esc(z.soil||"Soil unrecorded")+'</div></div>'+statusBadge(z.status)+'</div><div style="margin:12px 0">'+chip(z.light==="full"?"Open / sunny (estimate)":z.light==="part"?"Mixed light (estimate)":z.light==="shade"?"Shade (estimate)":"Sun unknown")+chip(z.sunHours===null||z.sunHours===""?"Sun hours unknown":z.sunHours+" hrs sun")+chip(z.moisture+" moisture")+'</div><p class="muted">'+esc(z.notes||"No field notes yet.")+'</p>'+a("Edit growing zone","edit-zone",z.id,"secondary")+'</article>').join("")+'</div><p class="tiny muted">Starter zones are based on your descriptions and photos, not surveyed boundaries or measured sun exposure.</p>';
}
function zoneForm(){
 const z=state.zones.find(o=>o.id===zoneEdit)||{},editing=!!z.id;
 return heading("GROWING LOCATION",editing?"Edit zone":"New growing zone","Be specific enough to compare one location against another.")+
 '<form data-form="zone" class="card"><div class="form-grid">'+field("Zone name","name",z.name||"","text","required maxlength=80")+field("Measured summer direct sun hours","sunHours",z.sunHours,"number",'min="0" max="24" step="0.5" placeholder="Leave blank if unknown"')+
 pick("Light description","light",[["unknown","Not measured"],["full","Mostly open / sunny"],["part","Part sun / woodland"],["shade","Mostly shade"]],z.light||"unknown")+
 pick("Moisture / watering","moisture",[["unknown","Not recorded"],["dry","Generally dry"],["irrigated","Irrigated"],["moderate","Moderate natural moisture"],["runoff","Concentrated runoff"]],z.moisture||"unknown")+
 field("Soil / drainage","soil",z.soil||"")+pick("Site status","status",[["active","Ready for garden trials"],["planned","Planned / not measured"],["weeds","Weed remediation needed"],["stabilize","Erosion stabilization needed"]],z.status||"active")+
 area("Notes / exposures / existing vegetation","notes",z.notes||"")+'</div><div class="buttons" style="margin-top:18px"><button class="btn">Save growing zone</button>'+a("Cancel","go","zones")+(editing?a("Delete zone","delete-zone",z.id,"ghost"):"")+'</div></form>';
}
function varietyCard(v){
 const attempts=state.trials.filter(t=>t.varietyId===v.id),successes=attempts.filter(t=>t.status==="thrived").length;
 const recordNote=attempts.length?chip(attempts.length+" recorded trials")+chip(successes+" thrived","good"):"";
 return '<article class="card"><div class="row row-top"><div><div class="item-title">'+esc(v.name)+'</div><div class="item-meta"><i>'+esc(v.species||"Species unknown")+'</i> · '+esc(v.kind)+'</div></div>'+chip(v.provenance==="starter"?"Starter reference":"Your record")+'</div><p class="tiny muted">'+esc(v.notes||"No growing notes yet.")+'</p><div>'+chip(v.maturityDays? v.maturityDays+" days":"Maturity unknown")+chip(v.sunMin!==null&&v.sunMin!==""?v.sunMin+"+ sun hrs":"Sun unknown")+'</div>'+recordNote+'<div class="buttons" style="margin-top:12px">'+a("Will It Grow Here?","match",v.id,"")+a("Edit","edit-variety",v.id)+'</div></article>';
}
function varietiesPage(){
 return heading("PLANT LIBRARY","Will It Grow Here?","Search a variety, check its source information, then compare it to a specific garden zone.",a("+ Add variety","add-variety","",""))+
 '<div class="field search"><label for="variety-search">Search variety or species</label><input id="variety-search" type="search" placeholder="German Pink, blue flax, columbine…" value="'+esc(plantSearch)+'"></div><div id="variety-results" class="results">'+varietyCards(plantSearch)+'</div><div class="section"><h3>What this does and does not know</h3></div><div class="notice">Published days-to-maturity, warm-night requirements and soil temperatures are not universal. Tomato screening uses general tomato thresholds until you verify the exact cultivar’s catalog data. No made-up success percentages.</div>';
}
function varietyCards(q){const list=state.varieties.filter(v=>(v.name+" "+v.species+" "+v.kind).toLowerCase().includes(String(q).toLowerCase()));return list.length?list.map(varietyCard).join(""):blank("No variety found","Add this exact cultivar and paste its seed-catalog details.");}
function varietyForm(){
 const v=state.varieties.find(o=>o.id===varietyEdit)||{},edit=!!v.id;
 return heading("CULTIVAR RECORD",edit?"Edit variety":"Add a plant variety","Fields can stay unknown. Exact cultivars matter more than filling boxes with guesses.")+
 '<form data-form="variety" class="card"><div class="form-grid">'+field("Variety / cultivar name","name",v.name||"","text","required maxlength=100")+
 field("Scientific name","species",v.species||"")+pick("Plant type","kind",[["tomato","Tomato"],["annual","Annual flower / crop"],["perennial","Perennial / shrub"],["grass","Grass"]],v.kind||"tomato")+
 pick("Tomato growth habit","habit",[["","Unknown / not applicable"],["determinate","Determinate"],["indeterminate","Indeterminate"],["semi-determinate","Semi-determinate"]],v.habit||"")+
 field("Published days to maturity","maturityDays",v.maturityDays,"number",'min="1" max="500" placeholder="Unknown"')+
 pick("Maturity counted from","maturityBasis",[["unknown","Unknown"],["transplant","Transplant"],["seed","Seed sowing"]],v.maturityBasis||"unknown")+
 field("Minimum direct sun hours","sunMin",v.sunMin,"number",'min="0" max="24" step="0.5" placeholder="Unknown"')+
 field("Concern threshold for night lows (°F)","nightMin",v.nightMin,"number",'min="-40" max="110" step="0.5" placeholder="Unknown"')+
 field("Minimum soil temperature (°F)","soilMin",v.soilMin,"number",'min="-20" max="120" step="0.5" placeholder="Unknown"')+
 pick("Moisture needs","moisture",[["unknown","Unknown"],["low","Low once established"],["moderate","Moderate / consistent"],["high","High"]],v.moisture||"unknown")+
 area("Seed supplier / source / reference URL","source",v.source||"")+
 area("Growing notes & known exceptions","notes",v.notes||"")+
 '<div class="field full subtle"><label for="catalog-text">Paste seed catalog text (optional)</label><textarea id="catalog-text" name="catalogText" placeholder="Paste the packet or catalog description here…"></textarea><small>We’ll suggest days to maturity, habit, sun and soil temperature only when explicit. You review all changes before saving. This first build does not scrape websites or scan photos.</small><button type="button" class="btn secondary small" id="extract-catalog" style="align-self:flex-start;margin-top:7px">Extract into fields</button><div class="tiny muted" id="catalog-feedback" aria-live="polite"></div></div>'+
 '</div><div class="buttons" style="margin-top:16px"><button class="btn">Save variety</button>'+a("Cancel","go","varieties")+(edit?a("Delete","delete-variety",v.id,"ghost"):"")+'</div></form>';
}
function matchPage(){
 const v=state.varieties.find(x=>x.id===matching),zone=state.zones.find(x=>x.id===matchingZone)||state.zones[0];
 if(!v)return heading("VARIETY MATCH","Choose a variety","Open the plant library.");
 const assessment=E.assessment(v,zone,state,state.matchDate||"");
 return heading("PROPERTY COMPATIBILITY","Will "+esc(v.name)+" grow here?","A screening assessment for one cultivar in one specific location.")+
 '<div class="split"><div class="card"><form data-form="match" class="form-grid">'+pick("Garden location","zoneId",state.zones.map(z=>[z.id,z.name]),zone.id)+field("Proposed transplant / planting date","transplant",state.matchDate||"","date")+'<div class="field full"><button class="btn" type="submit">Analyze this location</button></div></form>'+
 '<div class="score '+assessment.className+'"><div class="pillhead">Assessment · confidence '+assessment.confidence+'</div><b>'+esc(assessment.rating)+'</b><p class="tiny">'+esc(assessment.explanation)+'</p></div>'+
 '<h3>What the evidence says</h3>'+(assessment.checks.length?assessment.checks.map(c=>'<div class="reason"><strong>'+chip(c.level==="good"?"Favorable":c.level==="risk"?"Barrier":"Caution",c.level==="good"?"good":c.level==="risk"?"danger":"warn")+esc(c.name)+'</strong><div>'+esc(c.detail)+'</div><small>'+esc(c.action)+'</small></div>').join(""):blank("Not enough measured information","The app refuses to invent a verdict."))+
 '<div class="section"><h3>What to measure next</h3></div>'+(assessment.missing.length?'<ul>'+assessment.missing.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ul>':'<p class="muted">Continue tracking outcomes to validate this preliminary recommendation.</p>')+'</div>'+
 '<aside class="card"><div class="pillhead">Variety card</div><h3>'+esc(v.name)+'</h3><p class="muted"><i>'+esc(v.species)+'</i></p><div class="divider"></div><p><b>Maturity:</b> '+(v.maturityDays?esc(v.maturityDays)+" days, from "+esc(v.maturityBasis):"Not documented")+'</p><p><b>Sun:</b> '+(v.sunMin===null?"Unknown":esc(v.sunMin)+"+ hrs direct")+'</p><p><b>Source:</b> '+esc(v.source||"Not recorded")+'</p><p class="muted">'+esc(v.notes||"")+'</p><div class="divider"></div>'+a("Log a trial for this plant","trial-from-match",v.id,"")+a("Edit variety data","edit-variety",v.id)+'</aside></div>';
}
function trialsPage(){
 return heading("GROWING JOURNAL","Trial history","Your success/failure record is more important than a perfect-looking planting calendar.",a("+ New trial","add-trial","",""))+
 (state.trials.length?'<div class="results">'+state.trials.slice().sort((a,b)=>Number(b.year)-Number(a.year)).map(t=>{let v=state.varieties.find(x=>x.id===t.varietyId),z=state.zones.find(x=>x.id===t.zoneId);return '<article class="card"><div class="row row-top"><div><div class="item-title">'+esc(v?.name||"Deleted variety")+'</div><div class="item-meta">'+esc(z?.name||"Unknown zone")+' · Season '+esc(t.year)+'</div></div>'+statusBadge(t.status)+'</div><p class="muted">'+esc(t.notes||"No growing notes yet.")+'</p><div>'+chip((t.events||[]).length+" journal entries")+chip(t.transplantDate?"Transplanted "+t.transplantDate:"Planting date pending")+'</div><div style="margin-top:12px">'+a("Open trial & log observations","trial",t.id,"")+'</div></article>'}).join("")+'</div>':blank("No growing trials saved yet","Start with the fall 2026 meadow planting or a historical tomato observation. Don't invent dates or harvests."))+
 '<p class="tiny muted" style="margin-top:15px">One record per variety, bed, and season. You can mark past attempts as historical with incomplete dates.</p>';
}
function trialForm(){
 const t=state.trials.find(x=>x.id===trialEdit)||{},v=state.varieties.find(x=>x.id===matching);
 return heading("FIELD EXPERIMENT",t.id?"Edit trial":"Start a growing trial","A trial is an actual attempt or historical observation, not a prediction.")+
 '<form class="card" data-form="trial"><div class="form-grid">'+pick("Exact variety","varietyId",state.varieties.map(o=>[o.id,o.name]),t.varietyId||v?.id||state.varieties[0]?.id)+
 pick("Growing location","zoneId",state.zones.map(o=>[o.id,o.name]),t.zoneId||matchingZone||state.zones[0]?.id)+
 field("Season year","year",t.year||new Date().getFullYear(),"number",'min="1900" max="2100" required')+
 field("Date sown","sowDate",t.sowDate||"","date")+field("Transplant date","transplantDate",t.transplantDate||"","date")+
 pick("Overall status","status",[["active","Active / observing"],["thrived","Thrived"],["struggled","Struggled"],["failed","Failed"],["inconclusive","Inconclusive"]],t.status||"active")+
 area("Goal, treatment, problems or prior observations","notes",t.notes||"","Record observations even when exact dates are unknown.")+area("Next-season experiment / what to change","nextExperiment",t.nextExperiment||"")+
 '</div><div class="buttons" style="margin-top:16px"><button class="btn">Save trial</button>'+a("Cancel","go","trials")+'</div></form>';
}
function trialDetail(){
 const t=state.trials.find(x=>x.id===chosenTrial);if(!t)return heading("JOURNAL","Trial not found","");
 const v=state.varieties.find(x=>x.id===t.varietyId),z=state.zones.find(x=>x.id===t.zoneId);
 return heading("SEASON "+esc(t.year),esc(v?.name||"Unknown variety"),esc(z?.name||"Unknown zone")+" · "+esc(t.status),a("Edit trial","edit-trial",t.id))+
 '<div class="grid two"><section class="card"><div class="pillhead">Trial record</div><p><b>Seeded:</b> '+dateText(t.sowDate)+'</p><p><b>Transplanted:</b> '+dateText(t.transplantDate)+'</p><p><b>Result:</b> '+esc(t.status)+'</p><p>'+esc(t.notes||"")+'</p></section>'+
 '<section class="card"><div class="pillhead">Add an observation</div><form data-form="event"><div class="form-grid">'+field("Date","date",datelocal(),"date","required")+
 pick("What happened?","kind",[["observation","Growth observation"],["germination","Germination"],["flowering","First flowers"],["fruit-set","Fruit set"],["harvest","Harvest"],["frost","Cold / frost damage"],["drought","Drought stress"],["pests","Pests / browsing"],["intervention","Treatment / experiment"],["failure","Failure / death"]],"observation")+
 area("What happened? What would you change?","notes","")+
 '</div><button class="btn" style="margin-top:12px">Save observation</button></form></section></div>'+
 diagnosisPanel(t,v,z)+section("Growing timeline",t.events?.length?'<ol class="time-list">'+t.events.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(ev=>'<li><div class="row"><strong>'+esc(ev.kind.replace("-"," "))+'</strong><span class="item-meta">'+esc(ev.date)+'</span></div><div>'+esc(ev.notes||"No notes.")+'</div></li>').join("")+'</ol>':blank("Nothing logged yet","Log flower dates, fruit set, frost injury and experiments so we can investigate future failures."))+
 '<div class="buttons">'+a("Back to trials","go","trials")+a("Delete trial","delete-trial",t.id,"ghost")+'</div>';
}

function diagnosisPanel(t,v,z){
 const prior=state.trials.filter(x=>x.varietyId===t.varietyId).sort((a,b)=>a.year-b.year);
 const flower=(t.events||[]).some(x=>x.kind==="flowering"),fruit=(t.events||[]).some(x=>x.kind==="fruit-set");
 const issue=(t.status==="failed"||t.status==="struggled");
 const summaries=prior.map(x=>'<li><b>'+esc(x.year)+'</b> · '+esc(state.zones.find(z=>z.id===x.zoneId)?.name||"Unknown location")+' · '+esc(x.status)+'</li>').join("");
 return '<div class="grid two" style="margin-top:16px"><section class="card"><div class="pillhead">Why did it fail?</div><h3>Evidence before assumptions</h3>'+
 (issue?'<p>We have a struggling or failed season on record. Investigate <b>actual flowering-period nights</b>, moisture, light, seedbed conditions, competition, pests and pollination before blaming elevation.</p>':'<p>When a variety struggles, review observations and local temperatures together. A surviving plant with no flowers is a different problem than one that flowers but does not set fruit.</p>')+
 (flower&&!fruit?'<p class="notice">Flowers were logged but fruit set was not. That might mean fruit never formed <b>or just was not recorded</b>; verify before diagnosing.</p>':"")+
 '<p><b>Next-season experiment:</b> '+esc(t.nextExperiment||"Not written yet. Add one by editing this trial.")+'</p>'+a("Edit experiment","edit-trial",t.id,"secondary")+'</section>'+
 '<section class="card"><div class="pillhead">Long-term variety record</div><h3>'+esc(v?.name||"Variety")+'</h3><p>'+prior.length+' trial(s) logged across seasons. Outcomes are observations, not scientific proof.</p>'+(summaries?'<ul>'+summaries+'</ul>':"")+'<p class="tiny muted">A repeated result across different weather and management conditions is more informative than a single bad season.</p></section></div>';
}
function weatherCards(){
 const f=state.forecast; if(!f)return '<p class="muted">No modeled forecast loaded. Enter approximate coordinates in Data, then press Refresh forecast.</p>';
 const days=f.daily?.time||[];return '<p class="tiny muted">Regional model · Open-Meteo · '+esc(dateText(f.fetchedAt))+' · not a property weather-station reading</p><div class="forecast-grid">'+days.slice(0,7).map((d,i)=>'<div class="forecast-day"><strong>'+esc(d.slice(5))+'</strong><b class="'+(f.daily.temperature_2m_min[i]<=32?"cold":"")+'">'+Math.round(f.daily.temperature_2m_min[i])+'°</b><span>'+Math.round(f.daily.temperature_2m_max[i])+'° high</span></div>').join("")+'</div>';
}

function historicCard(){
 const h=state.history;
 if(!h||!Array.isArray(h.daily?.time)){
 return '<div class="divider"></div><div class="row"><div><strong>Historical regional reference</strong><p class="tiny muted">Optional 3 complete years of modeled daily lows. Never treated as measured backyard temperatures.</p></div>'+a("Load history","history","","small")+'</div>';
 }
 const dates=h.daily.time,lows=h.daily.temperature_2m_min||[];
 const summer=dates.map((d,i)=>({d,temp:Number(lows[i])})).filter(o=>o.d.slice(5)>="06-01"&&o.d.slice(5)<="09-01"&&Number.isFinite(o.temp));
 const avg=summer.length?summer.reduce((t,o)=>t+o.temp,0)/summer.length:null;
 return '<div class="divider"></div><div class="row row-top"><div><strong>Historical regional reference</strong><p class="tiny muted">Modeled daily minimum temperature (not observed nighttime mean). '+esc(h.startDate)+' to '+esc(h.endDate)+'.</p>'+(avg!==null?'<p><b>'+avg.toFixed(1)+'°F</b> average summer daily minimum · '+summer.length+' days</p>':'<p>Regional history loaded.</p>')+'</div>'+a("Refresh","history","","small")+'</div>';
}
function weatherPage(){
 const obs=state.observations.slice().sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));let suspect=obs.filter(o=>o.flag==="suspect");
 return heading("YOUR PROPERTY, NOT YOUR COUNTY","Weather evidence","Raw readings are kept. Suspicious values are flagged, and manual verification never erases the originals.")+
 '<div class="grid two"><section class="card"><div class="row"><h3>Regional forecast</h3>'+a("Refresh forecast","forecast","","small")+'</div>'+weatherCards()+historicCard()+'<p class="tiny muted">The forecast is not a measurement and should never be presented as a precise prediction for a shaded or sheltered bed.</p></section>'+
 '<section class="card"><h3>Record local weather</h3><form data-form="weather"><div class="form-grid">'+field("Date","date",datelocal(),"date","required")+field("Time","time","08:00","time","required")+
 pick("Measurement","metric",[["night_low_f","Measured overnight low (°F)"],["air_temp_f","Air temp snapshot (°F)"],["soil_temp_f","Soil temp (°F)"],["rain_inches","Rain accumulation (in)"],["snow_depth_inches","Snow depth (in)"]],"night_low_f")+
 pick("Location / sensor","zoneId",[["","Main property / station"],...state.zones.map(z=>[z.id,z.name])],"")+
 field("Reading","value","","number",'required step="0.1"')+
 field("Instrument / source","source","Manual thermometer")+
 area("Notes (time, shading, sensor height etc.)","note","")+'</div><button class="btn" style="margin-top:12px">Save raw reading</button></form></section></div>'+
 (suspect.length?section("Needs manual verification",'<div class="notice bad"><b>'+suspect.length+' flagged reading(s).</b> Preserve raw values and enter a separate verified value.</div>'):"")+
 section("Observation history",obs.length?'<div class="rows">'+obs.slice(0,50).map(o=>{let eff=E.getEffective(o),zone=state.zones.find(z=>z.id===o.zoneId);return '<article class="card"><div class="row row-top"><div><div class="item-title">'+esc(o.metric.replaceAll("_"," "))+' · '+esc(o.value)+(o.metric.includes("inches")?'"':"°F")+'</div><div class="item-meta">'+esc(new Date(o.timestamp).toLocaleString())+' · '+esc(zone?.name||"Property")+" · "+esc(o.source)+'</div></div>'+chip(o.flag==="verified"?"Manual verified":o.flag==="suspect"?"Flagged anomaly":"Raw",o.flag==="verified"?"good":o.flag==="suspect"?"danger":"")+'</div>'+
 (o.flag==="verified"?'<p>Verified '+esc(eff)+(o.metric.includes("inches")?'"':"°F")+'; raw '+esc(o.value)+' retained.</p>':"")+
 (o.note?'<p class="tiny muted">'+esc(o.note)+'</p>':"")+
 (o.flag==="suspect"?a("Verify or dismiss anomaly","verify",o.id,""):a("Delete reading","delete-weather",o.id,"ghost"))+'</article>'}).join("")+'</div>':blank("No measurements yet","Add a manual night low or import observations from a station CSV."))+
 '<div class="section"><h3>Import weather readings</h3></div><div class="card"><p>CSV supports <code>timestamp,metric,value,zone,source</code> or Ecowitt-style <code>dateutc,tempf</code>. Ecowitt air-temperature snapshots are <b>not</b> automatically treated as nighttime lows.</p><label for="weathercsv">Select weather CSV</label><input id="weathercsv" type="file" accept=".csv,text/csv"><p class="tiny muted">Station live API, automatic synchronization, and historical model archive are planned—not connected in this first build.</p></div>'+
 (chosenWeather?verifyPanel(chosenWeather):"");
}
function verifyPanel(id){
 const o=state.observations.find(o=>o.id===id);if(!o)return "";
 return '<section class="card" style="margin-top:14px"><h3>Verify flagged snow reading</h3><p><b>Original value:</b> '+esc(o.value)+' inches. The raw record and flag are retained permanently.</p><form data-form="verify"><div class="form-grid">'+field("Your checked value (inches)","verifiedValue",o.verifiedValue??"","number",'required min="0" step="0.1"')+
 field("How verified?","verificationSource","36-inch manual snow gauge","text","required")+area("Notes","note",o.note||"")+'</div><button class="btn" style="margin-top:12px">Save manual verification</button>'+a("Cancel","cancel-verify","","ghost")+'</form></section>';
}
function dataPage(){
 const p=state.profile;
 return heading("OWNERSHIP & BACKUPS","Property & data","Your records currently live in this browser on this device. Export regularly; a GitHub repo is not a backup of your personal garden entries.")+
 '<div class="grid two"><div class="card"><h3>Property profile</h3><form data-form="profile"><div class="form-grid">'+field("Property nickname","name",p.name,"text","required")+field("Elevation (feet)","elevationFt",p.elevationFt,"number",'min="-300" max="30000"')+
 field("Latitude (private, optional)","latitude",p.latitude,"number",'min="-90" max="90" step="any" placeholder="Do not guess"')+
 field("Longitude (private, optional)","longitude",p.longitude,"number",'min="-180" max="180" step="any" placeholder="Do not guess"')+
 field("Estimated last spring frost (MM-DD)","lastFrost",p.lastFrost,"text",'pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" placeholder="Unknown"')+
 field("Estimated first fall frost (MM-DD)","firstFrost",p.firstFrost,"text",'pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" placeholder="Unknown"')+
 area("How were frost dates determined?","frostNote",p.frostNote||"")+'</div><button class="btn" style="margin-top:12px">Save property profile</button></form><p class="tiny muted">The app will not guess exact property coordinates or frost dates. Coordinates are stored locally; requesting forecast sends them to Open-Meteo.</p></div>'+
 '<div class="card"><h3>Your data is yours</h3><p><b>Storage:</b> '+esc(storeType)+' on this browser. No account and no automatic cloud sync yet.</p><p><b>Records:</b> '+state.zones.length+' zones · '+state.varieties.length+' varieties · '+state.trials.length+' trials · '+state.observations.length+' weather readings.</p><div class="buttons">'+a("Export full JSON backup","export","","")+ '<label class="btn secondary" for="backupfile" style="cursor:pointer">Restore JSON backup</label></div><input id="backupfile" type="file" accept=".json,application/json" style="margin-top:10px"><p class="notice"><b>Important:</b> Clearing browser data, uninstalling, or changing phones can destroy local records. Export backups after every meaningful gardening session.</p><div class="divider"></div><h4>Integrations roadmap</h4><p>Brook Forest Weather shared observations → Ecowitt → other stations. These connectors are not live yet.</p><p>Regional forecast (optional): <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, modeled data only.</p></div></div>'+
 section("Why this first build is intentionally small",'<div class="notice good">Working now: garden zones, plant library, paste-and-review catalog data, explainable suitability screening, seasonal trials, observations, manual weather, CSV import, suspicious snow reading verification, JSON backup and offline app shell. Not yet: photo scanning, automatic station API, live multi-device sync, detailed sun/terrain modeling, and probabilistic crop predictions.</div>');
}
async function init(){
 try{db=await openStore()}catch(err){storeType="localStorage fallback";console.warn("IndexedDB fallback",err)}
 try{state=await getStored();if(!state||!Array.isArray(state.zones))state=E.initial()}catch(err){state=E.initial();notice("Existing data could not be loaded. Do not overwrite a backup before investigating.")}
 await save();render();
 if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(console.warn);
}
function go(next){page=next;zoneEdit=null;varietyEdit=null;trialEdit=null;chosenWeather=null;window.scrollTo({top:0,behavior:"instant"});render()}
function numOrNull(v){return v===""?null:E.n(v)}
function fval(form,k){return String(new FormData(form).get(k)||"").trim()}
async function onForm(form){
 const typ=form.dataset.form,F=k=>fval(form,k);
 if(typ==="zone"){if(!F("name"))return notice("Give this zone a name.");let z=state.zones.find(o=>o.id===zoneEdit),record={id:z?.id||E.uid(),name:F("name"),sunHours:numOrNull(F("sunHours")),light:F("light"),moisture:F("moisture"),soil:F("soil"),status:F("status"),notes:F("notes")};if(z)Object.assign(z,record);else state.zones.push(record);page="zones";zoneEdit=null;return commit("Growing zone saved")}
 if(typ==="variety"){if(!F("name"))return notice("The variety needs a name.");let v=state.varieties.find(o=>o.id===varietyEdit),record={id:v?.id||E.uid(),name:F("name"),species:F("species"),kind:F("kind"),habit:F("habit"),maturityDays:numOrNull(F("maturityDays")),maturityBasis:F("maturityBasis"),sunMin:numOrNull(F("sunMin")),nightMin:numOrNull(F("nightMin")),soilMin:numOrNull(F("soilMin")),moisture:F("moisture"),source:F("source"),notes:F("notes"),provenance:"user"};if(v)Object.assign(v,record);else state.varieties.push(record);page="varieties";varietyEdit=null;return commit("Variety saved")}
 if(typ==="match"){matchingZone=F("zoneId");state.matchDate=F("transplant");render();return}
 if(typ==="trial"){let old=state.trials.find(x=>x.id===trialEdit),record={id:old?.id||E.uid(),varietyId:F("varietyId"),zoneId:F("zoneId"),year:Number(F("year")),sowDate:F("sowDate"),transplantDate:F("transplantDate"),status:F("status"),notes:F("notes"),nextExperiment:F("nextExperiment"),events:old?.events||[]};if(!Number.isInteger(record.year)||record.year<1900||record.year>2100)return notice("Check the season year.");if(old)Object.assign(old,record);else state.trials.push(record);page="trials";trialEdit=null;return commit("Trial saved")}
 if(typ==="event"){let t=state.trials.find(x=>x.id===chosenTrial);if(!t)return; t.events=t.events||[];t.events.push({id:E.uid(),date:F("date"),kind:F("kind"),notes:F("notes")});return commit("Observation added to the trial")}
 if(typ==="profile"){const p=state.profile;for(let key of ["name","latitude","longitude","lastFrost","firstFrost","frostNote"])p[key]=F(key);p.elevationFt=numOrNull(F("elevationFt"));if(p.latitude!==""&&(Number(p.latitude)>90||Number(p.latitude)<-90))return notice("Latitude is outside range.");if(p.longitude!==""&&(Number(p.longitude)>180||Number(p.longitude)<-180))return notice("Longitude is outside range.");return commit("Property profile saved")}
 if(typ==="weather"){
  const metric=F("metric"),value=Number(F("value")),time=new Date(F("date")+"T"+F("time")+":00");if(!Number.isFinite(value)||!Number.isFinite(time.getTime()))return notice("Enter a valid reading and date.");
  if((metric==="snow_depth_inches"||metric==="rain_inches")&&value<0)return notice("Precipitation and snow depth cannot be negative.");
  const stamp=time.toISOString(),zoneId=F("zoneId");let flag="ok",notes=F("note");
  if(metric==="snow_depth_inches"){
   let prev=state.observations.filter(o=>o.metric===metric&&o.zoneId===zoneId&&new Date(o.timestamp)<time).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)))[0];
   if(prev&&Math.abs(time-new Date(prev.timestamp))/3600000<=3&&Math.abs(value-Number(E.getEffective(prev)??prev.value))>6){flag="suspect";notes+=(notes?" | ":"")+"Automatic flag: >6 inch jump within 3 hours; check against a manual snow gauge.";}
  }
  state.observations.push({id:E.uid(),timestamp:stamp,metric,value,zoneId,source:F("source")||"Manual",flag,verifiedValue:null,note:notes});return commit(flag==="suspect"?"Reading saved and flagged for manual verification":"Weather reading saved");
 }
 if(typ==="verify"){let o=state.observations.find(x=>x.id===chosenWeather);if(!o)return;const val=Number(F("verifiedValue"));if(!Number.isFinite(val)||val<0)return notice("Enter a valid measured snow depth.");o.verifiedValue=val;o.verificationSource=F("verificationSource");o.flag="verified";o.note=F("note");o.verifiedAt=new Date().toISOString();chosenWeather=null;return commit("Manual verification saved; raw reading preserved")}
}
document.addEventListener("submit",async e=>{let form=e.target.closest("form[data-form]");if(!form)return;e.preventDefault();try{await onForm(form)}catch(err){console.error(err);notice("Save failed: "+err.message)}});
document.addEventListener("input",e=>{if(e.target.id==="variety-search"){plantSearch=e.target.value;document.getElementById("variety-results").innerHTML=varietyCards(plantSearch)}});
document.addEventListener("click",async e=>{
 const extra=e.target.closest("#extract-catalog");if(extra){const f=extra.closest("form");let text=f.querySelector("#catalog-text").value;const out=E.parseCatalog(text);Object.entries(out).forEach(([key,value])=>{let input=f.elements.namedItem(key);if(input)input.value=value});f.querySelector("#catalog-feedback").textContent=Object.keys(out).length?"Suggested: "+Object.entries(out).map(([k,v])=>k+" = "+v).join(", ")+". Verify against source before saving.":"No clear requirements detected; enter values manually.";return}
 const el=e.target.closest("[data-action]");if(!el)return;const act=el.dataset.action,id=el.dataset.id;
 try{
 if(act==="go")return go(id);
 if(act==="add-zone"){zoneEdit=null;page="edit-zone";return render()}
 if(act==="edit-zone"){zoneEdit=id;page="edit-zone";return render()}
 if(act==="delete-zone"){if(state.trials.some(t=>t.zoneId===id))return notice("This zone has trials; preserve history before deleting.");if(confirm("Delete this growing zone?")){state.zones=state.zones.filter(x=>x.id!==id);page="zones";return commit("Zone removed")}return}
 if(act==="add-variety"){varietyEdit=null;page="edit-variety";return render()}
 if(act==="edit-variety"){varietyEdit=id;page="edit-variety";return render()}
 if(act==="delete-variety"){if(state.trials.some(t=>t.varietyId===id))return notice("This variety has trials; preserve linked history.");if(confirm("Delete this cultivar?")){state.varieties=state.varieties.filter(x=>x.id!==id);page="varieties";return commit("Variety removed")}return}
 if(act==="match"){matching=id;matchingZone=state.zones[0]?.id;page="match";return render()}
 if(act==="trial-from-match"){matching=id;trialEdit=null;page="edit-trial";return render()}
 if(act==="add-trial"){trialEdit=null;matching=null;page="edit-trial";return render()}
 if(act==="edit-trial"){trialEdit=id;page="edit-trial";return render()}
 if(act==="trial"){chosenTrial=id;page="trial-detail";return render()}
 if(act==="delete-trial"){if(confirm("Delete this trial and all its journal entries? This cannot be undone without a backup.")){state.trials=state.trials.filter(x=>x.id!==id);page="trials";return commit("Trial deleted")}return}
 if(act==="delete-weather"){if(confirm("Delete raw weather reading? Use verification rather than deleting suspicious sensor data.")){state.observations=state.observations.filter(x=>x.id!==id);return commit("Weather reading deleted")}return}
 if(act==="verify"){chosenWeather=id;render();return setTimeout(()=>document.querySelector('[data-form="verify"]')?.scrollIntoView({behavior:"smooth"}),50)}
 if(act==="cancel-verify"){chosenWeather=null;return render()}
 if(act==="history"){if(busy)return;busy=true;el.disabled=true;try{await fetchHistory()}finally{busy=false;render()}return}
 if(act==="forecast"){if(busy)return;busy=true;el.disabled=true;try{await fetchForecast()}finally{busy=false;render()}return}
 if(act==="export"){exportBackup();return}
 }catch(err){console.error(err);notice("Action failed: "+err.message)}
});
async function fetchForecast(){
 const lat=Number(state.profile.latitude),lon=Number(state.profile.longitude);
 if(state.profile.latitude===""||state.profile.longitude===""||!Number.isFinite(lat)||!Number.isFinite(lon))return notice("Enter property latitude and longitude under Data first.");
 try{const url="https://api.open-meteo.com/v1/forecast?latitude="+encodeURIComponent(lat)+"&longitude="+encodeURIComponent(lon)+"&daily=temperature_2m_min,temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FDenver&forecast_days=7";
 const response=await fetch(url);if(!response.ok)throw Error("Forecast service HTTP "+response.status);
 const json=await response.json();if(!json.daily?.time?.length)throw Error("No daily forecast returned.");
 state.forecast={daily:json.daily,fetchedAt:new Date().toISOString(),source:"Open-Meteo regional modeled forecast"};await save();notice("Modeled forecast updated (not station observations)")}catch(err){notice("Forecast unavailable: "+err.message)}
}

async function fetchHistory(){
 const lat=Number(state.profile.latitude),lon=Number(state.profile.longitude);
 if(state.profile.latitude===""||state.profile.longitude===""||!Number.isFinite(lat)||!Number.isFinite(lon))return notice("Add privately stored latitude and longitude under Data first.");
 const y=new Date().getFullYear(),start=(y-3)+"-01-01",end=(y-1)+"-12-31";
 try{
 const url="https://archive-api.open-meteo.com/v1/archive?latitude="+encodeURIComponent(lat)+"&longitude="+encodeURIComponent(lon)+"&start_date="+start+"&end_date="+end+"&daily=temperature_2m_min,temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FDenver";
 const response=await fetch(url);if(!response.ok)throw Error("History service HTTP "+response.status);
 const json=await response.json();if(!json.daily?.time?.length)throw Error("No historical daily minima returned.");
 state.history={daily:json.daily,fetchedAt:new Date().toISOString(),startDate:start,endDate:end,source:"Open-Meteo gridded reanalysis; not site measurements"};await save();notice("Regional modeled historical reference saved (not property measurements)");
 }catch(err){notice("History unavailable: "+err.message)}
}
function exportBackup(){
 const blob=new Blob([JSON.stringify({app:"high-altitude-garden-planner",schemaVersion:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="high-altitude-garden-backup-"+datelocal()+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);notice("Download the backup and keep it somewhere safe.")
}
document.addEventListener("change",async e=>{
 if(e.target.id==="weathercsv"){
  const file=e.target.files[0];if(!file)return;try{const {imported,skipped}=E.parseWeatherCSV(await file.text());if(!imported.length)return notice("No supported records in that CSV.");if(!confirm("Import "+imported.length+" weather records? "+skipped+" skipped. Only available fields will be used."))return;
  const seen=new Set(state.observations.map(o=>o.timestamp+"|"+o.metric+"|"+o.zoneId+"|"+o.source));let added=0;for(let o of imported){const key=o.timestamp+"|"+o.metric+"|"+o.zoneId+"|"+o.source;if(!seen.has(key)){state.observations.push(o);seen.add(key);added++}}
  await commit(added+" weather readings imported, "+(imported.length-added)+" duplicates ignored.")
  }catch(err){notice("CSV import failed: "+err.message)}return}
 if(e.target.id==="backupfile"){
  const file=e.target.files[0];if(!file)return;try{const raw=JSON.parse(await file.text()),data=raw?.data;if(raw.app!=="high-altitude-garden-planner"||raw.schemaVersion!==1||!data||!Array.isArray(data.zones)||!Array.isArray(data.varieties)||!Array.isArray(data.trials)||!Array.isArray(data.observations))throw Error("Not a compatible v1 garden backup.");
  if(!confirm("REPLACE ALL current local garden data with this backup? Export the current data first if you need it."))return;
  state=data;page="home";await commit("Backup restored successfully.")}catch(err){notice("Could not restore backup: "+err.message)}return}
});
init().catch(err=>{console.error(err);view.innerHTML='<div class="notice bad">App initialization failed: '+esc(err.message)+'. Your previous data may still be in this browser.</div>'});
})();
