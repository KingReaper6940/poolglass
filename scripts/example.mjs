import {mkdir,writeFile} from 'node:fs/promises';
import {analyze} from '../src/analyze.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,reportJSON,distributionCSV,sweepCSV,reportHTML,chartSVG} from '../src/exports.mjs';
const r=analyze(example),out=new URL('../examples/',import.meta.url);await mkdir(out,{recursive:true});
for(const [name,text] of [['project.json',projectJSON(r)],['receipt.json',reportJSON(r)],['distribution.csv',distributionCSV(r)],['targets.csv',sweepCSV(r)],['study.html',reportHTML(r)],['distribution.svg',chartSVG(r)]])await writeFile(new URL(name,out),text);
console.log('Wrote six complete synthetic study artifacts.');console.log({event:r.current.percent,exact:r.current.probability,baseline:r.current.baselinePercent,delta:r.deltaText});
