import {bonusCandidateSets, bonusPriority, bonusRadicalCandidates} from './bonus-candidates';
import type {BonusType, CharacterData, Reading, Settings} from './types';

export function availableBonusTypes(settings: Settings): BonusType[] {
  return bonusPriority.filter(type => {
    if (settings.promptSlots) return !settings.promptSlots.some(slot => type === 'radical' ? slot.radical : slot[type] !== 'off');
    return settings.appearance[type] === 'off';
  });
}

export function resolveBonusType(settings: Settings): BonusType | null {
  if (settings.bonusEnabled === false) return null;
  const available = availableBonusTypes(settings);
  return settings.bonusType && settings.bonusType !== 'auto' && available.includes(settings.bonusType) ? settings.bonusType : available[0] ?? null;
}

export function bonusCandidates(settings: Settings): string[] {
  const type = resolveBonusType(settings);
  if (!type) return [];
  if (type === 'initial') return settings.bonusInitials;
  return type === 'final' ? settings.bonusFinals ?? bonusCandidateSets.final : settings.bonusRadicals ?? bonusCandidateSets.radical;
}

export function commonRadicalParts(letter: string, character: CharacterData | undefined): string[] {
  return Object.keys(character?.strokeParts ?? {}).filter(radical => {
    const length = character!.strokeParts![radical].length;
    return bonusRadicalCandidates.includes(radical) && letter !== radical && length > 0 && length < character!.strokeCount!;
  });
}

export function collectBonusValues(word: string, reading: Reading, characters: Record<string, CharacterData>, type: BonusType): string[] {
  return [...new Set(type === 'radical' ? [...word].flatMap(letter => commonRadicalParts(letter, characters[letter])) : type === 'initial' ? reading.initials : reading.finals)].filter(Boolean);
}
