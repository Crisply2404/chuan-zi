export const conditionTypes = ['initial', 'final', 'tone', 'radical', 'component', 'contains'] as const;
export type ConditionType = typeof conditionTypes[number];
export type Appearance = 'off' | 'random' | 'required';
export type RelationMode = 'free' | 'same' | 'different';
export type ToneScope = 'one' | 'some' | 'all';
export const modeIds = ['initial-tone', 'radical', 'character', 'tone-only', 'custom'] as const;
export type ModeId = typeof modeIds[number];
export type RulePresetId = 'simple' | 'hard' | 'featured' | 'custom';

export interface Relation {
  first: ConditionType;
  second: ConditionType;
  mode: RelationMode;
}

export interface Settings {
  mode: ModeId;
  dictionary: 'idioms' | 'words' | 'all';
  minLength: number;
  maxLength: number;
  promptLength: number;
  hiddenCount: number;
  appearance: Record<ConditionType, Appearance>;
  relations: Relation[];
  toneScope: ToneScope;
  minAnswers: number;
  maxAnswers: number;
  startingLives: number;
  maxLives: number;
  timerMode: 'fixed' | 'random';
  initialSeconds: number;
  randomMinSeconds: number;
  randomMaxSeconds: number;
  minimumSeconds: number;
  bestOf: number;
  maxPlayers: number;
  bonusInitials: string[];
}

export const defaultSettings: Settings = {
  mode: 'initial-tone',
  dictionary: 'all', minLength: 2, maxLength: 9, promptLength: 2, hiddenCount: 0,
  appearance: { initial: 'required', final: 'off', tone: 'random', radical: 'off', component: 'off', contains: 'off' },
  relations: [], toneScope: 'one', minAnswers: 2, maxAnswers: 20000,
  startingLives: 3, maxLives: 5, timerMode: 'fixed', initialSeconds: 20,
  randomMinSeconds: 10, randomMaxSeconds: 30, minimumSeconds: 5,
  bestOf: 3, maxPlayers: 8, bonusInitials: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l'],
};

export interface CharacterData { radicals: string[]; components: string[] }
export interface Reading { syllables: string[]; initials: string[]; finals: string[]; tones: number[] }
export interface WordEntry { word: string; readings: Reading[]; idiom: boolean; df: number; source: string[] }
export interface DictionaryData {
  words: WordEntry[];
  characters: Record<string, CharacterData>;
  metadata: { version: string; wordCount: number; idiomCount: number; sources: {name: string; license: string; url: string}[] };
}
export interface PromptCell {
  initial?: string;
  final?: string;
  tone?: number;
  radical?: string;
  component?: string;
  contains?: string;
}
export interface Prompt { cells: PromptCell[]; answerCount: number; id: string }
export interface MatchResult { valid: boolean; reason?: string; reading?: Reading; offset?: number }
export interface DraftMatch { word: string; promptId: string | null; offset: number | null; reading?: Reading }
export interface AnswerResult { accepted: boolean }

export interface PlayerView {
  id: string; nickname: string; online: boolean; ready: boolean;
  role: 'player' | 'spectator'; lives: number; wins: number;
  collected: string[]; draft: string; cpu: boolean;
}
export interface HistoryItem { playerId: string; nickname: string; word: string; at: number }
export interface ChatMessage { id: string; nickname: string; text: string; at: number }
export interface RoomView {
  id: string; roomKey: string; roomPinyin: string; name: string; createdAt: number; creator: string;
  hostId: string; protected: boolean; listed: boolean;
  phase: 'waiting' | 'playing' | 'between' | 'finished';
  settings: Settings; players: PlayerView[];
  round: number; suddenDeath: boolean; currentPlayerId: string | null;
  prompt: Prompt | null; deadline: number | null; serverTime: number;
  history: HistoryItem[]; chat: ChatMessage[];
  lastWinnerId: string | null; winnerIds: string[];
}
export interface LobbyRoom {
  id: string; roomKey: string; roomPinyin: string; name: string; createdAt: number; creator: string; mode: ModeId;
  playerCount: number; maxPlayers: number; protected: boolean; listed: boolean;
  phase: RoomView['phase']; conditions: ConditionType[];
}
export type ClientCommand =
  | {type: 'hello'; data: {nickname: string; token?: string}}
  | {type: 'create'; data: {name: string; password: string; listed?: boolean; settings: Settings}}
  | {type: 'join'; data: {roomId: string; password: string}}
  | {type: 'joinByCode'; data: {code: string; password: string}}
  | {type: 'leave'; data: Record<string, never>}
  | {type: 'ready'; data: {ready: boolean}}
  | {type: 'settings'; data: {settings: Settings}}
  | {type: 'rename'; data: {name: string}}
  | {type: 'visibility'; data: {listed: boolean}}
  | {type: 'metadata'; data: {name: string; listed: boolean; password?: string}}
  | {type: 'addCpu'; data: Record<string, never>}
  | {type: 'removeCpu'; data: Record<string, never>}
  | {type: 'start'; data: Record<string, never>}
  | {type: 'submit'; data: {word: string; promptId: string}}
  | {type: 'draft'; data: {word: string}}
  | {type: 'chat'; data: {text: string}}
  | {type: 'transfer'; data: {playerId: string}}
  | {type: 'kick'; data: {playerId: string}}
  | {type: 'preview'; data: {settings: Settings}}
  | {type: 'ping'; data: Record<string, never>};
export type Request = ClientCommand & {id: string};
export type ServerMessage =
  | {type: 'reply'; id: string; ok: true; result: unknown}
  | {type: 'reply'; id: string; ok: false; error: string}
  | {type: 'session'; playerId: string; token: string}
  | {type: 'lobby'; rooms: LobbyRoom[]}
  | {type: 'state'; room: RoomView | null}
  | {type: 'draft'; result: DraftMatch}
  | {type: 'notice'; text: string};
