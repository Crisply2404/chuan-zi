import type {Prompt,Settings,WordEntry} from './types';
import type {WordRules} from './rules';

export interface CpuPlan {words:string[]; attempt:number; succeed:boolean}
const commonCache=new WeakMap<WordRules,Map<number,WordEntry[]>>();

export function cpuPlan(rules:WordRules,prompt:Prompt,settings:Settings,used:Set<string>,tutorial=false):CpuPlan {
  const solution=rules.cpuAnswer(prompt,settings,used);
  if(!solution) return {words:[],attempt:0,succeed:false};
  const roll=Math.random();
  const succeed=!tutorial&&roll>=.2;
  const count=tutorial?2:roll<.2?2:roll<.65?1+Math.floor(Math.random()*2):0;
  if(!count)return {words:[solution.word],attempt:0,succeed:true};
  let groups=commonCache.get(rules);
  if(!groups){
    groups=new Map();
    for(const entry of rules.data.words){
      if((entry.frequency??0)<=50)continue;
      const length=[...entry.word].length;
      const group=groups.get(length)??[];group.push(entry);groups.set(length,group);
    }
    for(const group of groups.values())group.sort((first,second)=>(second.frequency??0)-(first.frequency??0));
    commonCache.set(rules,groups);
  }
  const common=(groups.get([...solution.word].length)??[]).slice(0,2000).filter(entry=>!used.has(entry.word)&&entry.word!==solution.word&&!rules.match(entry.word,prompt,settings,used).valid);
  const letters=[...solution.word];
  common.sort((first,second)=>{
    const similarity=(word:string)=>[...word].reduce((score,letter,index)=>score+(letters[index]===letter?3:letters.includes(letter)?1:0),0);
    return similarity(second.word)-similarity(first.word)||(second.frequency??0)-(first.frequency??0);
  });
  const errors=common.slice(0,8);
  const words=Array.from({length:Math.min(count,errors.length)},(_,index)=>errors[index].word);
  if(succeed) words.push(solution.word);
  return {words,attempt:0,succeed};
}
