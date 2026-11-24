export const RELATIONS={lt:'below',le:'at most',ge:'at least',gt:'above'};
export const EVENTS={atLeast:'at least',exact:'exactly',atMost:'at most'};
export function validate(p){
 const keys=['schema','title','dice','faces','keep','order','relation','target','event','required','notes'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join('|')!==keys.sort().join('|')||p.schema!=='poolglass/1')throw Error('Expected a Poolglass version 1 project.');
 for(const [key,max] of [['title',100],['notes',4000]])if(typeof p[key]!=='string'||p[key].length>max||!p[key].isWellFormed())throw Error(key+' exceeds its text limit or contains an unpaired surrogate.');
 for(const [key,min,max] of [['dice',1,100],['faces',2,100],['keep',1,p.dice],['target',0,p.faces+1],['required',0,p.keep]])if(!Number.isInteger(p[key])||p[key]<min||p[key]>max)throw Error(key+' must be a whole number from '+min+' to '+max+'.');
 if(!['highest','lowest'].includes(p.order)||!Object.hasOwn(RELATIONS,p.relation)||!Object.hasOwn(EVENTS,p.event))throw Error('Choose a supported retention, face condition and success event.');
 return structuredClone(p);
}
export function integer(text){if(!/^(0|[1-9][0-9]*)$/.test(text))throw Error('Use whole decimal numbers without spaces, signs or exponents.');return Number(text)}
export function gcd(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b]}return a}
export function fraction(n,d){if(d<=0n)throw Error('Invalid denominator.');const g=gcd(n,d);return {numerator:(n/g).toString(),denominator:(d/g).toString()}}
export function ratio(n,d){const f=fraction(n,d);return f.numerator+'/'+f.denominator}
export function percent(n,d){
 if(n<0n||n>d||d<=0n)throw Error('Invalid probability.');
 if(n===0n)return '0%';if(n===d)return '100%';
 const units=1000000n,q=(n*100n*units+d/2n)/d;
 if(q===0n)return '<0.000001%';if(q===100n*units)return '>99.999999%';
 const part=(q%units).toString().padStart(6,'0').replace(/0+$/,'');return (q/units).toString()+(part?'.'+part:'')+'%';
}
export function page(items,n,size=20){const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(0,Math.min(Number.isInteger(n)?n:0,pages-1));return {items:items.slice(current*size,(current+1)*size),current,pages}}
