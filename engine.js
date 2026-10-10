/* High Altitude Garden Planner — pure data and agronomy helpers.
 * Recommendations are screening judgments, never survival predictions. */
(function(root){
"use strict";
const uid=()=> (typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():"hagp-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
const starterVarieties=[
 {id:"cv-germanpink",name:"German Pink",species:"Solanum lycopersicum",kind:"tomato",habit:"indeterminate",maturityDays:null,maturityBasis:"transplant",sunMin:6,nightMin:55,soilMin:55,moisture:"moderate",notes:"Reported history at this property: flowering without reported fruit set in multiple seasons. Exact seed-supplier maturity data still needed.",source:"General tomato guidance; cultivar-specific requirements unverified",provenance:"starter"},
 {id:"cv-sartroloise",name:"Sart Roloise",species:"Solanum lycopersicum",kind:"tomato",habit:"indeterminate",maturityDays:null,maturityBasis:"transplant",sunMin:6,nightMin:55,soilMin:55,moisture:"moderate",notes:"Near-ripeness was reported in 2026; harvest outcome not yet recorded.",source:"General tomato guidance; cultivar-specific maturity unverified",provenance:"starter"},
 {id:"cv-blueflax",name:"Native Blue Flax",species:"Linum lewisii",kind:"perennial",habit:"",maturityDays:null,maturityBasis:"unknown",sunMin:6,nightMin:null,soilMin:null,moisture:"low",notes:"Sunny, well-drained site; drought tolerant once established. Establishment moisture still matters.",source:"Starter reference; confirm species on seed packet",provenance:"starter"},
 {id:"cv-penstemon",name:"Rocky Mountain Penstemon",species:"Penstemon strictus",kind:"perennial",habit:"",maturityDays:null,maturityBasis:"unknown",sunMin:6,nightMin:null,soilMin:null,moisture:"low",notes:"Candidate for sunny pockets; seed establishment may take time.",source:"Starter reference; confirm packet instructions",provenance:"starter"},
 {id:"cv-mckana",name:"McKana Giants Columbine",species:"Aquilegia hybrid",kind:"perennial",habit:"",maturityDays:null,maturityBasis:"unknown",sunMin:3,nightMin:null,soilMin:null,moisture:"moderate",notes:"Best trialed in sheltered partial shade with establishment water.",source:"User seed packet observation; growing requirements preliminary",provenance:"starter"},
 {id:"cv-fescue",name:"Arizona Fescue",species:"Festuca arizonica",kind:"grass",habit:"",maturityDays:null,maturityBasis:"unknown",sunMin:4,nightMin:null,soilMin:null,moisture:"low",notes:"Potential soil-cover candidate; not an instant erosion-control solution.",source:"Starter reference; verify availability and local suitability",provenance:"starter"},
 {id:"cv-larkspur",name:"Rocket Larkspur",species:"Consolida ajacis",kind:"annual",habit:"",maturityDays:null,maturityBasis:"seed",sunMin:6,nightMin:null,soilMin:null,moisture:"moderate",notes:"Annual ornamental; toxic if ingested; not a wildlife-forage plant.",source:"Starter reference; verify seed packet",provenance:"starter"},
 {id:"cv-lupine",name:"Silver Lupine",species:"Lupinus argenteus",kind:"perennial",habit:"",maturityDays:null,maturityBasis:"unknown",sunMin:5,nightMin:null,soilMin:null,moisture:"low",notes:"Native lupine candidate. Seed coat preparation may affect germination.",source:"Starter reference; verify seed packet species",provenance:"starter"}
];
const starterZones=[
 {id:"zone-kitchen",name:"Kitchen Garden",light:"unknown",sunHours:null,moisture:"irrigated",soil:"Amended garden soil",status:"active",notes:"Cultivated garden. Actual summer sun hours and soil temperatures still need recording."},
 {id:"zone-steps",name:"Rock Steps / Woodland",light:"part",sunHours:null,moisture:"dry",soil:"Sandy, rocky mountain soil",status:"active",notes:"Beneath mature conifers. Consider tree root competition, snowmelt movement, and limited direct sunlight."},
 {id:"zone-sunny",name:"Sunny Back Hill",light:"full",sunHours:null,moisture:"dry",soil:"Rocky mountain soil",status:"active",notes:"Promising meadow test location; can receive establishment water from rain catchment."},
 {id:"zone-drive",name:"Driveway Hillside",light:"full",sunHours:null,moisture:"dry",soil:"To assess",status:"weeds",notes:"Existing thistle and weed pressure. Confirm thistle species and control before meadow seeding."},
 {id:"zone-erosion",name:"Upper Southwest Erosion Area",light:"part",sunHours:null,moisture:"runoff",soil:"Rocky, sandy slope",status:"stabilize",notes:"Concentrated runoff and sediment trapping behind downed logs. Preserve stability; no broad tilling."},
 {id:"zone-greenhouse",name:"Greenhouse (planned)",light:"unknown",sunHours:null,moisture:"unknown",soil:"To assess",status:"planned",notes:"Proposed future greenhouse, not an existing measured environment."}
];
const initial=()=>({version:1,createdAt:new Date().toISOString(),profile:{name:"Brook Forest",elevationFt:8700,latitude:"",longitude:"",lastFrost:"",firstFrost:"",frostNote:"Enter your own estimate or wait for measured data. County averages are not property measurements."},zones:starterZones.map(x=>({...x})),varieties:starterVarieties.map(x=>({...x})),trials:[],observations:[],forecast:null});
const dateOnly=(s)=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))&&!isNaN(new Date(s+"T12:00:00Z"));
const monthDay=(s)=>/^\d{2}-\d{2}$/.test(String(s||""));
const n=(v)=>v===""||v===null||v===undefined?null:Number.isFinite(Number(v))?Number(v):null;
function getEffective(o){return o.flag==="verified"&&n(o.verifiedValue)!==null?n(o.verifiedValue):o.flag==="suspect"?null:n(o.value)}
function observationsFor(state,metric,zoneId){return (state.observations||[]).filter(o=>o.metric===metric&&(!zoneId||!o.zoneId||o.zoneId===zoneId)&&getEffective(o)!==null).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)))}
function assessment(variety,zone,state,transplant){
 const checks=[],missing=[];
 const add=(name,level,detail,action)=>checks.push({name,level,detail,action});
 if(!variety||!zone)return {rating:"Insufficient information",className:"unknown",confidence:"Low",checks:[],missing:["Select a variety and a growing zone."]};
 const suns=n(zone.sunHours),required=n(variety.sunMin);
 if(required!==null&&suns!==null){
  if(suns+1<required)add("Direct sunlight","risk",suns+" measured hours vs "+required+" recommended","Try a sunnier location or measure midsummer light again.");
  else if(suns<required)add("Direct sunlight","caution",suns+" hours vs "+required+" recommended","Test a sunnier growing pocket.");
  else add("Direct sunlight","good",suns+" hours vs "+required+" recommended","Keep monitoring changes in seasonal shade.");
 }else if(required!==null){missing.push("Measure direct sun hours for this zone. Broad light labels are not reliable measurements.");if(zone.light==="part"&&required>=6)add("Reported light exposure","caution","This zone is described as partially shaded; "+required+" direct sun hours are recommended.","Measure sun exposure at midsummer before assuming this site receives enough light.");}
 if(zone.status==="stabilize")add("Slope stability","risk","This zone is marked as an active erosion-management area.","Address concentrated drainage before disturbing or seeding the slope.");
 if(zone.status==="weeds")add("Established weeds","caution","Existing weed competition was reported.","Control and identify weeds before investing in seed.");
 if(zone.status==="planned")missing.push("This area is planned but not yet built or measured.");
 const m=variety.moisture||"unknown";
 if(m==="moderate"&&zone.moisture==="dry")add("Establishment moisture","caution","Moderate water needs vs a dry growing site.","Plan targeted establishment watering and monitor surface moisture.");
 if(zone.moisture==="runoff")add("Runoff","caution","Water moves through this zone during storms.","Keep plantings out of concentrated flow until drainage is addressed.");
 if(zone.moisture==="unknown"&&m!=="unknown")missing.push("Record this area's soil moisture / irrigation.");
 const maturity=n(variety.maturityDays);
 const first=state.profile?.firstFrost;
 if(variety.kind==="tomato"||variety.kind==="annual"){
  if(maturity!==null&&dateOnly(transplant)&&monthDay(first)){
   const year=Number(transplant.slice(0,4));const end=Date.parse(year+"-"+first+"T12:00:00Z");const start=Date.parse(transplant+"T12:00:00Z");
   const available=Math.round((end-start)/86400000);
   if(available<0) add("Harvest window","risk","The entered fall frost estimate is before the proposed planting date.","Adjust dates and verify the property frost record.");
   else if(variety.maturityBasis==="transplant"){
    if(available<maturity)add("Harvest window","risk",available+" days until estimated frost vs "+maturity+" catalog days from transplant.","Use protection, a shorter-season cultivar, or a warmer planting site.");
    else if(available-maturity<14)add("Harvest window","caution",available+" available days leaves less than two weeks beyond catalog maturity.","Treat catalog days as optimistic; consider protection.");
    else add("Harvest window","good",available+" available days vs "+maturity+" catalog days.","Confirm whether catalog days account for cool nights.");
   } else missing.push("Maturity days are not confirmed to run from transplanting.");
  }else missing.push("Add estimated first autumn frost, proposed planting date, and catalog maturity days to evaluate the harvest window.");
 }
 if(n(variety.nightMin)!==null){
  const nightly=observationsFor(state,"night_low_f",zone.id);
  if(nightly.length>=3){
   const sample=nightly.slice(0,45),bad=sample.filter(o=>getEffective(o)<n(variety.nightMin)),avg=sample.reduce((s,o)=>s+getEffective(o),0)/sample.length;
   const level=bad.length>=3?"caution":"good";
   add("Recorded nighttime lows",level,bad.length+"/"+sample.length+" recorded lows below "+variety.nightMin+"°F; mean of logged lows "+avg.toFixed(1)+"°F. Dates may not match flowering.","Compare temperatures during the actual flowering window before concluding they caused fruit-set problems.");
  }else missing.push("At least 3 property-level nighttime-low records are needed for an initial temperature comparison.");
 }
 if(n(variety.soilMin)!==null){
  const soil=observationsFor(state,"soil_temp_f",zone.id);
  if(soil.length){
   const latest=soil[0],val=getEffective(latest),level=val<n(variety.soilMin)?"caution":"good";
   add("Last soil temperature",level,val+"°F recorded "+String(latest.timestamp).slice(0,10)+"; target at least "+variety.soilMin+"°F.","Measure again on transplant day; this is a dated snapshot, not a future prediction.");
  } else missing.push("Add a current soil-temperature observation for this zone.");
 }

 // Regional reanalysis is a reference, NEVER an observation on the user's property.
 const hist=state.history?.daily;
 if(hist&&Array.isArray(hist.time)&&Array.isArray(hist.temperature_2m_min)){
  const values=hist.time.map((day,i)=>({day,temp:n(hist.temperature_2m_min[i])})).filter(x=>x.temp!==null&&x.day.slice(5)>="06-01"&&x.day.slice(5)<="09-01");
  if(values.length>=30&&n(variety.nightMin)!==null){
   const below=values.filter(x=>x.temp<n(variety.nightMin)).length,ratio=below/values.length;
   add("Regional modeled summer lows",ratio>=0.4?"caution":"good",below+" of "+values.length+" modeled summer daily minima below "+variety.nightMin+"°F. This is regional reference data, NOT readings from your bed.","Track actual air temperatures during flowering. Daily minima are not average nighttime temperatures.");
  }
 }
 const forecast=state.forecast?.daily;
 if(forecast&&dateOnly(transplant)&&Array.isArray(forecast.time)){
  const i=forecast.time.indexOf(transplant);
  if(i>=0&&n(forecast.temperature_2m_min[i])!==null&&n(forecast.temperature_2m_min[i])<=32){
   add("Modeled transplant-date frost","risk","Regional forecast low "+forecast.temperature_2m_min[i]+"°F on proposed planting date. Local readings may differ.","Delay transplanting or provide reliable frost protection; monitor updated forecasts.");
  }
 }
 if(variety.kind==="tomato"&&maturity===null)missing.push("Published cultivar-specific days to maturity are missing; do not substitute another tomato's number.");
 const bad=checks.filter(x=>x.level==="risk").length,caution=checks.filter(x=>x.level==="caution").length,positive=checks.filter(x=>x.level==="good").length;
 let rating="Insufficient information",className="unknown";
 if(bad){rating="High risk — investigate",className="risk"}
 else if(caution){rating="Experimental — adjustments advised",className="caution"}
 else if(positive>=2&&missing.length<=1){rating="Preliminary match",className="good"}
 else if(positive||missing.length<3){rating="Uncertain — trial recommended",className="caution"}
 const measured=checks.filter(x=>/Direct sunlight|nighttime lows|soil temperature/i.test(x.name)).length;
 const confidence=(measured>=3&&missing.length<=1)?"Moderate":"Low";
 return {rating,className,confidence,checks,missing,explanation:"These are screening rules, not calibrated probabilities or a diagnosis. Elevation alone cannot determine success."};
}
function parseCatalog(raw){
 const s=String(raw||"").slice(0,10000),out={};
 const range=s.match(/\b(\d{2,3})\s*(?:-|–|to)\s*(\d{2,3})\s*days\b/i);const single=s.match(/\b(\d{2,3})\s*(?:days?|d)\s*(?:to maturity|until maturity)?\b/i);
 if(range)out.maturityDays=Math.max(Number(range[1]),Number(range[2]));else if(single)out.maturityDays=Number(single[1]);
 if(/\bindeterminate\b/i.test(s))out.habit="indeterminate";else if(/\bsemi[ -]?determinate\b/i.test(s))out.habit="semi-determinate";else if(/\bdeterminate\b/i.test(s))out.habit="determinate";
 if(/\bfull sun\b/i.test(s))out.sunMin=6;else if(/\bpart(?:ial)? shade\b|\bpart sun\b/i.test(s))out.sunMin=3;
 const soil=s.match(/soil.{0,35}?(\d{2,3})\s*°?\s*f/i);if(soil)out.soilMin=Number(soil[1]);
 return out;
}
function splitCSV(text){
 const rows=[];let row=[],field="",q=false;const s=String(text||"").replace(/^\uFEFF/,"");
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(q&&s[i+1]==='"'){field+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(field);field="";}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==""))rows.push(row);row=[];field="";}else field+=c}
 row.push(field);if(row.some(x=>x!==""))rows.push(row);return rows;
}
function parseWeatherCSV(csv){
 const rows=splitCSV(csv);if(rows.length<2)throw Error("CSV has no data rows.");
 const header=rows.shift().map(x=>x.trim().toLowerCase());const ix=(...names)=>names.map(x=>header.indexOf(x)).find(x=>x>=0)??-1;
 const t=ix("timestamp","dateutc","date","datetime","time"),metric=ix("metric","kind"),value=ix("value","reading"),z=ix("zone","zoneid","zone_id"),source=ix("source"),temp=ix("tempf","temperature_f");
 if(t<0)throw Error("CSV needs timestamp or dateutc column.");
 if((metric<0||value<0)&&temp<0)throw Error("CSV needs metric + value, or Ecowitt-style dateutc + tempf.");
 let imported=[],skipped=0;
 for(const row of rows){
  const dt=new Date(row[t]);if(!Number.isFinite(dt.getTime())){skipped++;continue;}
  const v=n(row[value>=0?value:temp]);if(v===null||v<-150||v>100000){skipped++;continue;}
  const m=metric>=0?row[metric].trim():"air_temp_f";
  if(!["night_low_f","soil_temp_f","air_temp_f","rain_inches","snow_depth_inches"].includes(m)){skipped++;continue;}
  imported.push({id:uid(),timestamp:dt.toISOString(),metric:m,value:v,zoneId:z>=0?row[z].trim():"",source:source>=0?row[source].trim():"CSV import",flag:"ok",verifiedValue:null,note:metric<0?"Ecowitt-style air temperature sample; NOT an overnight low.":""});
 }
 return {imported,skipped};
}
root.HAGP={uid,today,n,initial,dateOnly,monthDay,assessment,parseCatalog,parseWeatherCSV,getEffective,observationsFor};
if(typeof module!=="undefined"&&module.exports)module.exports=root.HAGP;
})(typeof window!=="undefined"?window:globalThis);
