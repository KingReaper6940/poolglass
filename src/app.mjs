import {validate,integer,page,percent,ratio,RELATIONS,EVENTS} from './model.mjs';
import {analyze} from './analyze.mjs';
import {example} from './example.mjs';
import {projectJSON,reportJSON,distributionCSV,sweepCSV,reportHTML,chartSVG} from './exports.mjs';
import {readUTF8,downloads} from './files.mjs';
export function mount(document,options={}){
 const $=id=>document.getElementById(id),save=options.save||downloads(document).save;
 let result=null,fresh=false,revision=0,ci=0,si=0;
 const buttons=[...document.querySelectorAll('[data-export]')],node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
 function status(text,kind=''){$('status').textContent=text;$('status').className=kind}
 function stale(){revision++;fresh=false;buttons.forEach(b=>b.disabled=true);$('freshness').textContent=result?'PREVIOUS STUDY IS STALE':'NOT BUILT';status('Inputs changed. Calculate again; previous results are stale.','stale')}
 function read(){
  const p={schema:'poolglass/1',title:$('title').value,order:$('order').value,relation:$('relation').value,event:$('event').value,notes:$('notes').value};
  for(const k of ['dice','faces','keep','target','required'])p[k]=integer($(k).value);return p;
 }
 function renderCounts(){
  const slice=page(result.rows,ci);ci=slice.current;const p=result.project;
  $('counts').replaceChildren(...slice.items.map(row=>{
   const selected=p.event==='exact'?row.count===p.required:p.event==='atLeast'?row.count>=p.required:row.count<=p.required,tr=document.createElement('tr'),td=node('td',row.count);tr.dataset.selected=String(selected);
   if(selected)td.append(node('small','Included in event'));tr.append(td,node('td',row.percent),node('td',percent(row.atLeast,row.total)),node('td',percent(row.atMost,row.total)));return tr;
  }));
  $('count-total').textContent=result.rows.length+' possible count values';$('count-page').textContent='Page '+(ci+1)+' of '+slice.pages+' · 20 per page';$('count-prev').disabled=ci===0;$('count-next').disabled=ci>=slice.pages-1;
 }
 function renderSweep(){
  const slice=page(result.sweep,si);si=slice.current;
  $('sweep').replaceChildren(...slice.items.map(row=>{const tr=document.createElement('tr');tr.dataset.current=String(row.target===result.project.target);const td=node('td',row.target);if(row.target===result.project.target)td.append(node('small','Selected target'));tr.append(td,node('td',row.percent),node('td',row.baselinePercent),node('td',row.deltaText));return tr}));
  $('sweep-total').textContent=result.sweep.length+' target values';$('sweep-page').textContent='Page '+(si+1)+' of '+slice.pages+' · 20 per page';$('sweep-prev').disabled=si===0;$('sweep-next').disabled=si>=slice.pages-1;
 }
 function apply(next){
  result=next;fresh=true;revision++;ci=Math.floor(next.project.required/20);si=Math.floor(next.project.target/20);
  const p=next.project,c=next.current;
  $('freshness').textContent='COUNTS CONSERVED';buttons.forEach(b=>b.disabled=false);
  $('question').textContent=EVENTS[p.event][0].toUpperCase()+EVENTS[p.event].slice(1)+' '+p.required+' of '+p.keep+' kept dice pass.';
  $('metrics').replaceChildren(...[['pool probability',c.percent],['baseline probability',c.baselinePercent],['change · percentage points, rounded',next.deltaText]].map(([label,value])=>{const d=document.createElement('div');d.append(node('strong',value),node('span',label));return d}));
  const a=c.pool.passingFaces,low=['lt','le'].includes(p.relation),range=a===0?'none':low?'1–'+a:(p.faces-a+1)+'–'+p.faces;
  $('definition').textContent='Roll '+p.dice+'d'+p.faces+'; keep '+p.keep+' '+p.order+'. Passing faces: '+range+' ('+a+' of '+p.faces+'), '+RELATIONS[p.relation]+' '+p.target+'. Retention '+(c.pool.favor?'favors':'disfavors')+' passing faces.';
  $('baseline-help').textContent='Baseline: roll '+p.keep+'d'+p.faces+' and retain every die, with the same face condition and count event. Percentages and percentage-point differences are rounded to six decimal places.';
  const definitions=[
   ['Pool favorable / total ordered outcomes',c.ways+' / '+c.pool.total],
   ['Pool exact event probability',ratio(c.ways,c.pool.total)],
   ['Baseline favorable / total ordered outcomes',c.baseWays+' / '+c.baseline.total],
   ['Baseline exact event probability',ratio(c.baseWays,c.baseline.total)],
   ['Exact probability difference (multiply by 100 for percentage points)',c.delta.numerator+'/'+c.delta.denominator],
   ['Expected passing retained dice',next.mean.numerator+'/'+next.mean.denominator],
   ['Baseline expected passing dice',next.baselineMean.numerator+'/'+next.baselineMean.denominator],
   ['Outcome conservation',p.faces+'^'+p.dice+' = '+c.pool.total+'; all weights nonnegative and summed exactly. This check does not independently prove each bin.'],
   ['Retention mapping for X original passing dice',c.pool.favor?'min(X, '+p.keep+')':'max(0, X − '+(p.dice-p.keep)+')']
  ];
  $('exact').replaceChildren(...definitions.flatMap(([label,value])=>[node('dt',label),node('dd',value)]));
  // Trusted numeric geometry plus an escaped title; imported markup never executes.
  $('chart').innerHTML=chartSVG(next);renderCounts();renderSweep();
  status('Study ready. Exact integer outcomes calculated for '+next.rows.length+' counts and '+next.sweep.length+' face targets. Save a project before closing.');
 }
 function install(input){
  const next=analyze(input);
  for(const k of ['title','dice','faces','keep','order','relation','target','event','required','notes'])$(k).value=next.project[k];
  apply(next);
 }
 $('settings').addEventListener('input',stale);$('settings').addEventListener('change',stale);
 $('settings').addEventListener('submit',e=>{e.preventDefault();try{apply(analyze(read()))}catch(error){stale();status(error.message+' Previous view is stale.','error')}});
 $('sample').addEventListener('click',()=>install(example));
 $('strict-sample').addEventListener('click',()=>install({...example,title:'Strict roll-under study',dice:3,faces:12,keep:2,order:'lowest',relation:'lt',target:6,event:'atLeast',required:1,notes:''}));
 for(const [id,which,delta] of [['count-prev','count',-1],['count-next','count',1],['sweep-prev','sweep',-1],['sweep-next','sweep',1]])$(id).addEventListener('click',()=>{if(!result)return;if(which==='count'){ci+=delta;renderCounts()}else{si+=delta;renderSweep()}});
 $('project-file').addEventListener('change',async()=>{
  const file=$('project-file').files?.[0];if(!file)return;const token=++revision;status('Reading study locally…');
  try{const text=await readUTF8(file,40000);if(token!==revision)return;install(JSON.parse(text))}
  catch(error){if(token===revision)status('Study not imported; existing work intact. '+error.message,'error')}
  finally{$('project-file').value=''}
 });
 $('clear').addEventListener('click',()=>{
  revision++;fresh=false;result=null;ci=0;si=0;$('settings').reset();buttons.forEach(b=>b.disabled=true);$('freshness').textContent='NOT BUILT';$('question').textContent='A chance you can inspect.';$('metrics').replaceChildren(...['pool probability','baseline probability','change · percentage points'].map(label=>{const d=document.createElement('div');d.append(node('strong','—'),node('span',label));return d}));
  $('definition').textContent='Calculate a study to inspect its passing faces and retention.';$('baseline-help').textContent='The baseline rolls only the kept dice. All decimals are rounded.';$('exact').replaceChildren();$('chart').replaceChildren(node('p','Your distribution has a place here.'));$('counts').replaceChildren();$('sweep').replaceChildren();$('count-total').textContent='No results yet';$('sweep-total').textContent='COMPLETE TARGET SWEEP';
  for(const id of ['count-page','sweep-page'])$(id).textContent='Page 1 of 1';for(const id of ['count-prev','count-next','sweep-prev','sweep-next'])$(id).disabled=true;status('Desk reset. No study is saved automatically.');
 });
 const outputs={project:['poolglass-project.json','application/json',projectJSON],json:['poolglass-receipt.json','application/json',reportJSON],counts:['poolglass-counts.csv','text/csv',distributionCSV],sweep:['poolglass-targets.csv','text/csv',sweepCSV],html:['poolglass-study.html','text/html',reportHTML],svg:['poolglass-distribution.svg','image/svg+xml',chartSVG]};
 for(const b of buttons)b.addEventListener('click',()=>{if(!fresh||!result)return;try{const [name,type,fn]=outputs[b.dataset.export];save(name,type+';charset=utf-8',fn(result));status('Downloaded '+name+'. All count values and face targets included where applicable.')}catch(error){status(error.message,'error')}});
 return {install,getResult:()=>result,isFresh:()=>fresh};
}
if(typeof document!=='undefined')mount(document);
