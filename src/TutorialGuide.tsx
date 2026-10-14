import {useEffect,useState} from 'react';
import {Check,Component,Music2,Speech,Type} from 'lucide-react';
import type {Prompt,RoomView} from '../shared/types';
import {modeColors,modeLabels} from '../shared/presets';
import {tutorialLessons} from '../shared/tutorial';
import {PromptView} from './PromptView';

export function TutorialGuide({room,active}:{room:RoomView;active:boolean}){
  const [demo,setDemo]=useState('');
  const tutorial=room.tutorial!;
  useEffect(()=>{
    setDemo('');
    if(!active||tutorial.completed)return;
    const word=tutorial.example.word;
    let step=0;
    const timer=setInterval(()=>{step++;setDemo([...word].slice(0,step%([...word].length+5)).join(''));},500);
    return()=>clearInterval(timer);
  },[tutorial.lesson,active,tutorial.completed]);
  const icons=[Type,Component,Speech,Music2];
  return <div className="tutorial-guide" aria-label="教学引导">
    <div className="tutorial-progress">{tutorialLessons.map((lesson,index)=>{
      const Icon=icons[index];
      return <span key={lesson.mode} aria-label={modeLabels[lesson.mode]} aria-current={index===tutorial.lesson?'step':undefined} className={index<tutorial.lesson?'tutorial-step-complete':''} style={{color:modeColors[lesson.mode]}}>{index<tutorial.lesson?<Check size={18}/>:<Icon size={18}/>}</span>;
    })}</div>
    {tutorial.completed?<span className="tutorial-complete"><Check size={20}/>教学完成</span>:active&&room.prompt?<>
      <span className="tutorial-caption">{tutorialLessons[tutorial.lesson].caption}</span>
      <div className="tutorial-demo" aria-label="作答示范"><PromptView prompt={room.prompt as Prompt} draft={demo} draftMatch={demo===tutorial.example.word?tutorial.example:undefined}/></div>
    </>:<span className="tutorial-caption">看看电脑怎样尝试</span>}
  </div>;
}
