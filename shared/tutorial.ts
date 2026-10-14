import type {ModeId, PromptCell, Settings} from './types';
import {getModeSettings} from './presets';

export const tutorialLessons: {mode: Exclude<ModeId,'custom'>; word: string; cells: PromptCell[]; caption: string}[] = [
  {mode:'character',word:'天空',cells:[{contains:'天'}],caption:'输入包含这个字的词'},
  {mode:'radical',word:'冰凉',cells:[{radical:'冫'}],caption:'找带这个部首的字'},
  {mode:'initial-tone',word:'知书达理',cells:[{initial:'zh',tone:1},{},{},{}],caption:'声母和声调一起满足'},
  {mode:'tone-only',word:'美不胜收',cells:[{tone:3},{},{},{tone:1}],caption:'按声调寻找词语'},
];

export function tutorialSettings(index:number):Settings {
  const lesson=tutorialLessons[index];
  if(!lesson) throw new Error('教学模式索引无效');
  return {...getModeSettings(lesson.mode),dictionary:index>=2?'idioms':'all',promptLength:lesson.cells.length,hiddenCount:lesson.cells.filter(cell=>!Object.keys(cell).length).length,minLength:index>=2?4:2,maxLength:index>=2?4:9,minAnswers:1,maxAnswers:100000,
    bonusEnabled:false,startingLives:4,maxLives:4,bestOf:1,initialSeconds:120};
}
