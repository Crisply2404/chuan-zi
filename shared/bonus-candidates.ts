import {bonusInitialCandidates} from './bonus-initials';

export const bonusFinalCandidates = ['a', 'ai', 'an', 'ang', 'ao', 'e', 'ei', 'en', 'eng', 'er', 'i', 'ia', 'ian', 'iang', 'iao', 'ie', 'in', 'ing', 'iong', 'iu', 'o', 'ong', 'ou', 'u', 'ua', 'uai', 'uan', 'uang', 'ue', 'ui', 'un', 'uo', 'ü', 'üe'];
export const bonusRadicalCandidates = ['氵', '扌', '忄', '艹', '宀', '讠', '纟', '钅', '灬', '辶', '阝', '犭', '饣', '衤', '礻', '冫', '疒', '亻', '刂', '囗', '⺮'];
export const bonusCandidateSets = {initial: bonusInitialCandidates, final: bonusFinalCandidates, radical: bonusRadicalCandidates};
export const bonusLabels = {initial: '声母', final: '韵母', radical: '部首'};
export const bonusPriority = ['final', 'radical', 'initial'] as const;
