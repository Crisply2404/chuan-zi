import {conditionTypes, type PromptSlot, type Settings} from './types';

export function emptyPromptSlot(): PromptSlot {
  return {initial: 'off', final: 'off', tone: false, radical: false, component: false, contains: false};
}

export function slotHasCondition(slot: PromptSlot): boolean {
  return slot.initial !== 'off' || slot.final !== 'off' || slot.tone || slot.radical || slot.component || slot.contains;
}

export function slotsFromSettings(settings: Settings): PromptSlot[] {
  if (settings.promptSlots) return structuredClone(settings.promptSlots);
  return Array.from({length: settings.promptLength}, (_, index) => {
    const slot = emptyPromptSlot();
    if (index >= settings.promptLength - settings.hiddenCount) return slot;
    for (const type of conditionTypes) {
      if (settings.appearance[type] === 'off') continue;
      if (type === 'tone' && settings.toneScope === 'one' && index > 0) continue;
      if (type === 'initial' || type === 'final') slot[type] = 'required';
      else slot[type] = true;
    }
    return slot;
  });
}

export function withPromptSlots(settings: Settings, slots: PromptSlot[]): Settings {
  const minLength = Math.max(settings.minLength, settings.dictionary === 'idioms' ? 4 : 2, slots.length);
  const appearance = {...settings.appearance};
  for (const type of conditionTypes) {
    appearance[type] = slots.some(slot => type === 'initial' || type === 'final' ? slot[type] !== 'off' : slot[type]) ? 'required' : 'off';
  }
  return {...settings, mode: 'custom', promptSlots: slots, promptLength: slots.length,
    hiddenCount: slots.filter(slot => !slotHasCondition(slot)).length, minLength, maxLength: Math.max(settings.maxLength, minLength),
    appearance, relations: [], toneScope: 'all'};
}
