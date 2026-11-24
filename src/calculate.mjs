export function passingFaces(faces,relation,target){
 const n=relation==='lt'?target-1:relation==='le'?target:relation==='ge'?faces-target+1:faces-target;
 return Math.max(0,Math.min(faces,n));
}
export function choose(n,k){if(!Number.isInteger(n)||!Number.isInteger(k)||k<0||k>n)throw Error('Invalid binomial coefficient.');let c=1n;for(let i=1;i<=Math.min(k,n-k);i++)c=c*BigInt(n-i+1)/BigInt(i);return c}
export function distribution(p,target=p.target,dice=p.dice){
 const a=passingFaces(p.faces,p.relation,target),b=p.faces-a,total=BigInt(p.faces)**BigInt(dice),bins=Array(p.keep+1).fill(0n);
 const passLow=['lt','le'].includes(p.relation),favor=(passLow&&p.order==='lowest')||(!passLow&&p.order==='highest');
 for(let x=0;x<=dice;x++){
  const ways=choose(dice,x)*BigInt(a)**BigInt(x)*BigInt(b)**BigInt(dice-x);
  const kept=favor?Math.min(x,p.keep):Math.max(0,x-(dice-p.keep));bins[kept]+=ways;
 }
 return {dice,passingFaces:a,total,bins,favor};
}
export function eventWays(dist,event,required){return dist.bins.reduce((n,w,k)=>n+((event==='exact'?k===required:event==='atLeast'?k>=required:k<=required)?w:0n),0n)}
