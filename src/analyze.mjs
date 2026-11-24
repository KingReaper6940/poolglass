import {validate,fraction,ratio,percent} from './model.mjs';
import {distribution,eventWays} from './calculate.mjs';
export function checkMass(dist,keep,faces){
 if(!Array.isArray(dist.bins)||dist.bins.length!==keep+1||dist.bins.some(w=>typeof w!=='bigint'||w<0n)||dist.total!==BigInt(faces)**BigInt(dist.dice)||dist.bins.reduce((a,b)=>a+b,0n)!==dist.total)throw Error('Outcome-weight conservation failed.');
 return true;
}
function mean(d){return fraction(d.bins.reduce((n,w,k)=>n+BigInt(k)*w,0n),d.total)}
function comparison(p,target){
 const pool=distribution(p,target),baseline=distribution(p,target,p.keep);checkMass(pool,p.keep,p.faces);checkMass(baseline,p.keep,p.faces);
 const ways=eventWays(pool,p.event,p.required),baseWays=eventWays(baseline,p.event,p.required),deltaNumerator=ways*baseline.total-baseWays*pool.total,deltaDenominator=pool.total*baseline.total;
 return {target,pool,baseline,ways,baseWays,probability:fraction(ways,pool.total),baselineProbability:fraction(baseWays,baseline.total),percent:percent(ways,pool.total),baselinePercent:percent(baseWays,baseline.total),delta:fraction(deltaNumerator,deltaDenominator),deltaNumerator,deltaDenominator};
}
export function deltaText(n,d){
 if(n===0n)return '0 pp';
 const abs=n<0n?-n:n,q=(abs*100000000n+d/2n)/d,whole=q/1000000n,part=(q%1000000n).toString().padStart(6,'0').replace(/0+$/,'');
 if(q===0n)return '<0.000001 pp '+(n<0n?'decrease':'increase');
 return (n<0n?'−':'+')+whole+(part?'.'+part:'')+' pp';
}
export function analyze(input){
 const project=validate(input),current=comparison(project,project.target),sweep=[];
 for(let target=0;target<=project.faces+1;target++){
  const row=comparison(project,target);
  sweep.push({target,passingFaces:row.pool.passingFaces,ways:row.ways,total:row.pool.total,baseWays:row.baseWays,baseTotal:row.baseline.total,probability:row.probability,baselineProbability:row.baselineProbability,percent:row.percent,baselinePercent:row.baselinePercent,delta:row.delta,deltaText:deltaText(row.deltaNumerator,row.deltaDenominator)});
 }
 const rows=current.pool.bins.map((ways,count)=>({count,ways,total:current.pool.total,probability:fraction(ways,current.pool.total),exact:ratio(ways,current.pool.total),percent:percent(ways,current.pool.total),atLeast:eventWays(current.pool,'atLeast',count),atMost:eventWays(current.pool,'atMost',count)}));
 return {project,current,rows,sweep,mean:mean(current.pool),baselineMean:mean(current.baseline),audit:{massVerified:true,poolOutcomes:current.pool.total,baselineOutcomes:current.baseline.total,bins:rows.length},deltaText:deltaText(current.deltaNumerator,current.deltaDenominator)};
}
