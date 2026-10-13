import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, Check, ChevronRight, Component, Download, Eye, Music2, Plus, Save, SlidersHorizontal, Speech, Type, X } from 'lucide-react';
import { conditionTypes, modeIds, type ConditionType, type ModeId, type Prompt, type PromptSlot, type Settings } from '../shared/types';
import { settingsSchema } from '../shared/settings';
import { getModeSettings, modeColors, modeDescriptions, modeLabels } from '../shared/presets';
import { PromptView } from './PromptView';
import {emptyPromptSlot, slotsFromSettings, slotHasCondition, withPromptSlots} from '../shared/prompt-slots';
import {availableBonusTypes, bonusCandidates, resolveBonusType} from '../shared/bonuses';
import {bonusCandidateSets, bonusLabels} from '../shared/bonus-candidates';

export const conditionLabels: Record<ConditionType, string> = {
  initial: '声母', final: '韵母', tone: '声调', radical: '部首', component: '字形部件', contains: '汉字',
};
const modeIcons = { 'initial-tone': Speech, radical: Component, character: Type, 'tone-only': Music2, custom: SlidersHorizontal };

function NumberField({ label, value, min, max, step = 1, onChange, disabled = false }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; disabled?: boolean;
}) {
  return <label className="number-field"><span>{label}</span><input type="number" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} disabled={disabled}
    onChange={event => onChange(event.target.valueAsNumber)} /></label>;
}

export function SettingsEditor({ value, onChange, disabled, preview, onPreview, onSave, busy, fixedBestOf = false }: {
  value: Settings; onChange: (settings: Settings) => void; disabled: boolean; preview: Prompt | null;
  onPreview: () => void; onSave?: (settings: Settings, onSaved?: () => void) => void; busy: boolean; fixedBestOf?: boolean;
}) {
  const [mode, setMode] = useState<ModeId>(value.mode);
  const [editingCustom, setEditingCustom] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  useEffect(() => setMode(value.mode), [value.mode]);
  const update = <K extends keyof Settings>(key: K, next: Settings[K]) => onChange({ ...value, [key]: next });
  const updateDictionary = (next: Settings['dictionary']) => {
    const length = next === 'idioms' ? 4 : Math.min(value.promptLength, 2);
    const settings = { ...value, dictionary: next, minLength: next === 'idioms' ? 4 : 2, maxLength: Math.max(value.maxLength, next === 'idioms' ? 4 : 2), promptLength: length,
      hiddenCount: Math.max(0, Math.min(length - 1, value.hiddenCount + length - value.promptLength)) };
    const nextSettings = settings.promptSlots ? withPromptSlots(settings, [...settings.promptSlots.slice(0, length), ...Array.from({length: Math.max(0, length - settings.promptSlots.length)}, emptyPromptSlot)]) : settings;
    onChange(nextSettings);
    if (!editingCustom) onSave?.(nextSettings);
  };
  const validate = settingsSchema.safeParse(value);
  const problems = validate.success ? [] : [...new Set(validate.error.issues.map(issue => issue.message))];
  const slots = slotsFromSettings(value);
  const selectedIndex = Math.min(selectedSlot, slots.length - 1);
  const currentSlot = slots[selectedIndex];
  const bonusTypes = availableBonusTypes(value);
  const bonusType = resolveBonusType({...value, bonusEnabled: true});
  const selectedBonusCandidates = bonusCandidates({...value, bonusEnabled: true});
  const updateBonusCandidate = (candidate: string, selected: boolean) => {
    if (!bonusType) throw new Error('当前规则没有奖励类型');
    const next = selected ? [...selectedBonusCandidates, candidate] : selectedBonusCandidates.filter(item => item !== candidate);
    if (bonusType === 'initial') update('bonusInitials', next);
    else if (bonusType === 'final') update('bonusFinals', next);
    else update('bonusRadicals', next);
  };
  const updateSlot = <K extends keyof PromptSlot>(type: K, next: PromptSlot[K]) => {
    const nextSlots = slots.map((slot, index) => index === selectedIndex ? {...slot, [type]: next} : slot);
    onChange(withPromptSlots(value, nextSlots));
  };
  const applyTemplate = (template: Exclude<ModeId, 'custom'>) => {
    const next = getModeSettings(template);
    if (value.dictionary === 'idioms') {next.hiddenCount += 4 - next.promptLength; next.promptLength = 4;}
    const configured = {...next, dictionary: value.dictionary, minLength: value.dictionary === 'idioms' ? 4 : 2, bestOf: value.bestOf, maxPlayers: value.maxPlayers};
    onChange(withPromptSlots(configured, slotsFromSettings(configured)));
    setSelectedSlot(0);
  };
  const custom = editingCustom;
  const selectMode = (next: ModeId) => {
    setMode(next);
    setEditingCustom(next === 'custom');
    const settings = next === 'custom' ? withPromptSlots(value, slotsFromSettings(value)) : {
      ...getModeSettings(next), dictionary: value.dictionary, minLength: value.dictionary === 'idioms' ? 4 : 2, bestOf: value.bestOf, maxPlayers: value.maxPlayers,
    };
    if (next !== 'custom' && value.dictionary === 'idioms') {settings.hiddenCount += 4 - settings.promptLength; settings.promptLength = 4;}
    onChange(settings);
    if (next !== 'custom') onSave?.(settings);
  };
  const exportRules = () => {
    const file = new Blob([JSON.stringify({ version: 1, settings: value }, null, 2)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'chuan-zi-rule.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <div className="settings-editor">
    <div className="settings-heading"><h2>{custom ? '自定义规则' : '房间规则'}</h2>{custom && <button type="button" className="back-button" onClick={() => setEditingCustom(false)}><ArrowLeft size={15} />游戏模式</button>}{disabled && <span className="muted">本局规则已确定</span>}</div>
    <fieldset disabled={disabled || busy}><div className="settings-sections">
      <section className="settings-section dictionary-choice">
        <h3>答案词库</h3><div className="segments" role="group" aria-label="答案词库">
          {([['all', '全部词语'], ['words', '普通词语'], ['idioms', '成语']] as const).map(([id, label]) => <button type="button" aria-pressed={value.dictionary === id} key={id} onClick={() => updateDictionary(id)}>{label}</button>)}
        </div>
      </section>
      <section className="settings-section">
        <h3>{custom ? '提示条件' : '游戏模式'}</h3>
        {!custom && <div className="mode-grid" aria-label="游戏模式">{modeIds.map(id => {
          const Icon = modeIcons[id];
          return <button type="button" className="mode-card" aria-label={modeLabels[id]} style={{'--mode-color': modeColors[id]} as CSSProperties} aria-pressed={mode === id} key={id}
            onClick={() => selectMode(id)}><Icon className="mode-icon" size={25} strokeWidth={1.5} aria-hidden="true" />
            <span className="mode-copy"><span>{modeLabels[id]}</span><small>{modeDescriptions[id]}</small></span>
            <span className="mode-status">{id === 'custom' ? <ChevronRight size={18} aria-hidden="true" /> : mode === id ? <Check size={18} aria-hidden="true" /> : null}</span>
          </button>;
        })}</div>}
        {custom ? <><div className="custom-templates" aria-label="预设模板"><span>预设模板</span><div className="preset-row">{(['initial-tone', 'radical', 'character', 'tone-only'] as const).map(template => <button type="button" className="preset-button" key={template}
          onClick={() => applyTemplate(template)}>{modeLabels[template]}</button>)}</div></div>
          <div className="slot-grid" aria-label="提示格设置">{slots.map((slot, index) => <div className="slot-choice" key={index}>
            <button type="button" className="slot-card" aria-label={`提示格 ${index + 1}`} aria-pressed={index === selectedIndex} onClick={() => setSelectedSlot(index)}>
              <span className="slot-number">第 {index + 1} 格</span><span className="slot-content">{slotHasCondition(slot) ? conditionTypes.filter(type => type === 'initial' || type === 'final' ? slot[type] !== 'off' : slot[type]).map(type => <span key={type}>{(type === 'initial' || type === 'final') && slot[type] === 'absent' ? `无${conditionLabels[type]} ∅` : conditionLabels[type]}</span>) : <span className="slot-wildcard">*</span>}</span>
            </button><button type="button" className="slot-remove" aria-label={`删除提示格 ${index + 1}`} disabled={slots.length === 1} onClick={() => {onChange(withPromptSlots(value, slots.filter((_, position) => position !== index))); setSelectedSlot(Math.max(0, index - 1));}}><X size={12} /></button>
          </div>)}<button type="button" className="slot-add" aria-label="添加提示格" disabled={slots.length >= 9} onClick={() => {onChange(withPromptSlots(value, [...slots, emptyPromptSlot()])); setSelectedSlot(slots.length);}}><Plus size={22} /></button></div>
          <div className="slot-editor" aria-label={`第 ${selectedIndex + 1} 格条件`}>
            {(['initial', 'final'] as const).map(type => <div className="condition-row" key={type}><span>{conditionLabels[type]}</span><div className="segments" role="group" aria-label={conditionLabels[type]}>
              {([['off', '不限'], ['required', '提示'], ['absent', `无${conditionLabels[type]}`]] as const).map(([choice, label]) => <button type="button" key={choice} aria-pressed={currentSlot[type] === choice} onClick={() => updateSlot(type, choice)}>{label}</button>)}
            </div></div>)}
            <div className="slot-checks">{(['tone', 'radical', 'component', 'contains'] as const).map(type => <label className="checkbox-field" key={type}><input type="checkbox" checked={currentSlot[type]} onChange={event => updateSlot(type, event.target.checked)} />{conditionLabels[type]}</label>)}</div>
            <p className="settings-help">同格条件共同限制一个汉字。* 代表不限条件，∅ 代表对应发音部分为空。</p>
          </div></> : null}
      </section>
      {custom && <>
        <section className="settings-section">
          <h3>词库与难度</h3>
          <div className="number-grid">
            <NumberField label="答案最短字数" value={value.minLength} min={2} max={9} onChange={next => update('minLength', next)} />
            <NumberField label="答案最长字数" value={value.maxLength} min={2} max={9} onChange={next => update('maxLength', next)} />
            <NumberField label="可用答案下限" value={value.minAnswers} min={1} max={100000} onChange={next => update('minAnswers', next)} />
            <NumberField label="可用答案上限" value={value.maxAnswers} min={1} max={100000} onChange={next => update('maxAnswers', next)} />
          </div>
        </section>
        <section className="settings-section">
          <h3>比赛与生命</h3>
          <div className="number-grid">
            <NumberField label="比赛总局数" value={value.bestOf} min={1} max={21} step={2} disabled={fixedBestOf} onChange={next => update('bestOf', next)} />
            <NumberField label="人数上限" value={value.maxPlayers} min={2} max={16} onChange={next => update('maxPlayers', next)} />
            <NumberField label="初始生命" value={value.startingLives} min={1} max={10} onChange={next => update('startingLives', next)} />
            <NumberField label="生命上限" value={value.maxLives} min={1} max={10} onChange={next => update('maxLives', next)} />
          </div>
          <div className="bonus-setting"><label className="checkbox-field"><input type="checkbox" checked={value.bonusEnabled !== false && bonusType !== null} disabled={bonusType === null} onChange={event => update('bonusEnabled', event.target.checked)} />奖励生命</label>
            {bonusType === null ? <p className="settings-help">所有奖励类型已用于提示，奖励已关闭。</p> : value.bonusEnabled !== false && <>
              <div className="segments" role="group" aria-label="奖励类型">{bonusTypes.map(type => <button type="button" key={type} aria-pressed={bonusType === type} onClick={() => update('bonusType', type)}>奖励{bonusLabels[type]}</button>)}</div>
              <span className="settings-help">每人随机获得五个目标，集齐后增加一个生命；候选不足五个时使用全部。</span><div className="initial-grid">{bonusCandidateSets[bonusType].map(candidate => <label key={candidate} className="initial-choice">
                <input type="checkbox" checked={selectedBonusCandidates.includes(candidate)} onChange={event => updateBonusCandidate(candidate, event.target.checked)} /><span>{candidate}</span>
              </label>)}</div></>}
          </div>
        </section>
        <section className="settings-section">
          <h3>计时</h3><div className="segments timer-segments" role="group" aria-label="计时方式">
            <button type="button" aria-pressed={value.timerMode === 'fixed'} onClick={() => update('timerMode', 'fixed')}>固定</button>
            <button type="button" aria-pressed={value.timerMode === 'random'} onClick={() => update('timerMode', 'random')}>随机</button>
          </div>
          <div className="number-grid">{value.timerMode === 'fixed'
            ? <NumberField label="每回合秒数" value={value.initialSeconds} min={1} max={120} onChange={next => update('initialSeconds', next)} />
            : <><NumberField label="随机秒数下限" value={value.randomMinSeconds} min={1} max={120} onChange={next => update('randomMinSeconds', next)} />
              <NumberField label="随机秒数上限" value={value.randomMaxSeconds} min={1} max={120} onChange={next => update('randomMaxSeconds', next)} /></>}
          </div>
        </section>
      </>}
    </div></fieldset>
    {problems.length > 0 && <div className="field-errors" role="alert">{problems.map(problem => <p key={problem}>{problem}</p>)}</div>}
    {custom && <><div className="settings-actions"><button type="button" className="secondary-button" disabled={!validate.success || busy} onClick={onPreview}><Eye size={16} />预览提示</button>
        <button type="button" className="secondary-button" disabled={!validate.success || busy} onClick={exportRules}><Download size={16} />导出规则</button>
        {onSave && <button type="button" className="primary-button" disabled={disabled || !validate.success || busy} onClick={() => onSave(value, () => setEditingCustom(false))}><Save size={16} />保存规则</button>}
      </div>
      {preview && <div className="preview-area"><PromptView prompt={preview} compact /></div>}</>}
  </div>;
}
