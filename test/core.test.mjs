import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,integer,fraction,ratio,percent,page} from '../src/model.mjs';
import {choose,distribution,passingFaces,eventWays} from '../src/calculate.mjs';
import {analyze,checkMass,deltaText} from '../src/analyze.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,reportJSON,distributionCSV,sweepCSV,reportHTML,chartSVG} from '../src/exports.mjs';
const p=extra=>({...example,...extra});
function brute(p){
 const bins=Array(p.keep+1).fill(0n),pass=v=>p.relation==='lt'?v<p.target:p.relation==='le'?v<=p.target:p.relation==='ge'?v>=p.target:v>p.target;
 function visit(values){
  if(values.length===p.dice){const sorted=values.slice().sort((a,b)=>p.order==='lowest'?a-b:b-a),successes=sorted.slice(0,p.keep).filter(pass).length;bins[successes]++;return}
  for(let face=1;face<=p.faces;face++)visit([...values,face]);
 }
 visit([]);return bins;
}
test('strict schema rejects unsupported fields, out-of-range integers and malformed settings',()=>{
 const clone=validate(example);clone.notes='changed';assert.notEqual(clone.notes,example.notes);
 for(const extra of [{schema:'wrong'},{extra:1},{dice:0},{dice:101},{faces:1},{keep:5},{target:10},{required:3},{order:'other'},{relation:'__proto__'},{event:'bad'},{notes:'a'.repeat(4001)},{title:'\ud800'}])assert.throws(()=>validate(p(extra)));
 for(const s of ['1.0','1e2','-1','+2','01',' 2','2 ',''])assert.throws(()=>integer(s));assert.equal(integer('100'),100);
});
test('signed reduced fractions and probabilities format whole and recurring percentages correctly',()=>{
 assert.deepEqual(fraction(-2n,4n),{numerator:'-1',denominator:'2'});assert.equal(ratio(0n,10n),'0/1');
 for(const [n,d,text] of [[3n,4n,'75%'],[1n,3n,'33.333333%'],[1n,8n,'12.5%'],[0n,1n,'0%'],[1n,1n,'100%'],[1n,10n**20n,'<0.000001%'],[10n**20n-1n,10n**20n,'>99.999999%']])assert.equal(percent(n,d),text);
 assert.throws(()=>percent(-1n,2n));assert.throws(()=>percent(3n,2n));assert.throws(()=>fraction(1n,0n));
 assert.equal(deltaText(-1n,4n),'−25 pp');assert.equal(deltaText(0n,1n),'0 pp');
});
test('binomial coefficients agree with a separate factorial definition',()=>{
 const fact=n=>{let f=1n;for(let i=2;i<=n;i++)f*=BigInt(i);return f};
 for(let n=0;n<=20;n++)for(let k=0;k<=n;k++)assert.equal(choose(n,k),fact(n)/(fact(k)*fact(n-k)));
 assert.throws(()=>choose(2,3));assert.throws(()=>choose(-1,0));
});
test('strict and inclusive face conditions handle both boundary targets',()=>{
 assert.deepEqual(['lt','le','ge','gt'].map(r=>passingFaces(8,r,4)),[3,4,5,4]);
 for(const relation of ['lt','le','ge','gt'])for(const target of [0,9]){const d=distribution(p({relation,target}));assert.ok(d.passingFaces===0||d.passingFaces===8);assert.equal(d.bins.filter(w=>w>0n).length,1)}
});
test('example event, baseline, full distribution and mean are exact',()=>{
 const r=analyze(example);assert.equal(r.current.percent,'93.75%');assert.deepEqual(r.current.probability,{numerator:'15',denominator:'16'});assert.equal(r.current.baselinePercent,'75%');assert.equal(r.deltaText,'+18.75 pp');
 assert.deepEqual(r.current.pool.bins,[256n,1024n,2816n]);assert.deepEqual(r.mean,{numerator:'13',denominator:'8'});
});
test('opposite retention discards passing dice before the retained group is counted',()=>{
 const r=analyze(p({order:'highest'}));assert.deepEqual(r.current.pool.bins,[2816n,1024n,256n]);assert.deepEqual(r.current.probability,{numerator:'5',denominator:'16'});assert.equal(r.deltaText,'−43.75 pp');
});
test('exactly and at-most count events use inclusive count semantics',()=>{
 const d=distribution(example);
 assert.equal(eventWays(d,'exact',1),1024n);assert.equal(eventWays(d,'atLeast',0),4096n);assert.equal(eventWays(d,'atMost',0),256n);assert.equal(eventWays(d,'atMost',2),4096n);
});
test('formula agrees with independent ordered-face enumeration after sorting and retaining',t=>{
 let cases=0;
 for(let faces=2;faces<=5;faces++)for(let dice=1;dice<=5;dice++)for(let keep=1;keep<=dice;keep++)for(const order of ['highest','lowest'])for(const relation of ['lt','le','ge','gt'])for(let target=0;target<=faces+1;target++){
  const input=p({faces,dice,keep,order,relation,target,required:0});assert.deepEqual(distribution(input).bins,brute(input),JSON.stringify(input));cases++;
 }
 t.diagnostic(cases+' independently enumerated retention/threshold cases verified.');
});
test('keeping every rolled die equals the baseline for every threshold',()=>{
 const r=analyze(p({dice:5,keep:5,required:2}));assert.deepEqual(r.current.pool.bins,r.current.baseline.bins);assert.ok(r.sweep.every(s=>s.delta.numerator==='0'));
});
test('target sweep is complete and matches direct counts at the selected target',()=>{
 const r=analyze(example);assert.equal(r.sweep.length,10);assert.deepEqual(r.sweep.map(s=>s.target),[0,1,2,3,4,5,6,7,8,9]);
 const selected=r.sweep.find(s=>s.target===4);assert.equal(selected.ways,r.current.ways);assert.deepEqual(selected.probability,r.current.probability);
 for(let i=1;i<r.sweep.length;i++)assert.ok(r.sweep[i].ways>=r.sweep[i-1].ways);
 const upper=analyze(p({relation:'ge',order:'highest'}));for(let i=1;i<upper.sweep.length;i++)assert.ok(upper.sweep[i].ways<=upper.sweep[i-1].ways);
});
test('mass verification rejects altered totals, missing bins, negatives and non-integers',()=>{
 const d=distribution(example);
 for(const change of [d=>{d.total++},d=>{d.bins.pop()},d=>{d.bins[0]=-1n},d=>{d.bins[0]=1},d=>{d.bins[0]++}]){const altered=structuredClone(d);change(altered);assert.throws(()=>checkMass(altered,2,8))}
});
test('maximum supported study uses BigInt beyond floating-point integer precision',()=>{
 const r=analyze(p({dice:100,faces:100,keep:50,target:51,relation:'lt',required:25}));
 assert.equal(r.current.pool.total,100n**100n);assert.ok(r.current.pool.total>BigInt(Number.MAX_SAFE_INTEGER));assert.equal(r.rows.length,51);assert.equal(r.sweep.length,102);
 const parsed=JSON.parse(reportJSON(r));assert.equal(parsed.current.pool.total,(100n**100n).toString());assert.equal(typeof parsed.rows[25].ways,'string');
});
test('JSON project round trip exactly rebuilds counts, means and baseline comparison',()=>{
 const r=analyze(example),round=analyze(JSON.parse(projectJSON(r)));assert.deepEqual(round.current,r.current);assert.deepEqual(round.sweep,r.sweep);assert.deepEqual(round.mean,r.mean);
});
test('full tables and reports include all rows, not just the visible page',()=>{
 const r=analyze(p({dice:30,keep:25,faces:24,target:12,required:4}));
 assert.equal(distributionCSV(r).split('\r\n').length,28);assert.equal(sweepCSV(r).split('\r\n').length,28);assert.equal(page(r.rows,1).items[0].count,20);
 assert.match(reportHTML(r),/Complete face-target sweep/);assert.equal(JSON.parse(reportJSON(r)).sweep.length,26);
});
test('HTML and SVG escape imported text and avoid long exact fractions in chart labels',()=>{
 const r=analyze(p({title:'</title><script>alert(1)</script>',notes:'<img src=x onerror=alert(1)>'}));
 assert.ok(!reportHTML(r).includes('<script>'));assert.ok(!reportHTML(r).includes('<img src=x'));assert.match(reportHTML(r),/&lt;img/);assert.ok(!chartSVG(r).includes('<script>'));assert.match(chartSVG(r),/not an application screenshot/);
 const huge=analyze(p({dice:100,faces:100,keep:1,required:1,target:2}));assert.match(chartSVG(huge),/exact fractions in data tables/);
});
test('generated chart bars cover all counts with bounded 0–100% geometry and selected-event labels',()=>{
 const r=analyze(example),svg=chartSVG(r);assert.equal((svg.match(/<rect x=/g)||[]).length,3);assert.match(svg,/0 passing: 6.25%/);assert.match(svg,/1 passing: 25%/);assert.match(svg,/2 passing: 68.75%/);assert.match(svg,/pool-chart-title pool-chart-desc/);
});
