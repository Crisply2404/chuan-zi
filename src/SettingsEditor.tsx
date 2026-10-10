import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, Check, ChevronRight, Component, Download, Eye, Music2, Save, SlidersHorizontal, Speech, Type } from 'lucide-react';
import { conditionTypes, modeIds, type Appearance, type ConditionType, type ModeId, type Prompt, type RelationMode, type Settings } from '../shared/types';
import { settingsSchema } from '../shared/settings';
import { getModeSettings, modeColors, modeDescriptions, modeLabels } from '../shared/presets';
import { PromptView } from './PromptView';

export const conditionLabels: Record<ConditionType, string> = {
  initial: '声母', final: '韵母', tone: '声调', radical: '部首', component: '字形部件', contains: '连续汉字',
};
const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
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
  useEffect(() => setMode(value.mode), [value.mode]);
  const update = <K extends keyof Settings>(key: K, next: Settings[K]) => onChange({ ...value, [key]: next });
  const updateDictionary = (next: Settings['dictionary']) => onChange({
    ...value,
    dictionary: next,
    minLength: next === 'idioms' ? Math.max(4, value.minLength) : value.minLength,
  });
  const validate = settingsSchema.safeParse(value);
  const problems = validate.success ? [] : [...new Set(validate.error.issues.map(issue => issue.message))];
  const relation = (first: ConditionType, second: ConditionType): RelationMode => value.relations.find(item =>
    (item.first === first && item.second === second) || (item.first === second && item.second === first))?.mode || 'free';
  const setRelation = (first: ConditionType, second: ConditionType, relationMode: RelationMode) => update('relations', [
    ...value.relations.filter(item => !((item.first === first && item.second === second) || (item.first === second && item.second === first))),
    ...(relationMode === 'free' ? [] : [{ first, second, mode: relationMode }]),
  ]);
  const active = conditionTypes.filter(type => value.appearance[type] !== 'off');
  const custom = editingCustom;
  const selectMode = (next: ModeId) => {
    setMode(next);
    setEditingCustom(next === 'custom');
    const settings = next === 'custom' ? { ...value, mode: 'custom' as const } : {
      ...getModeSettings(next), bestOf: value.bestOf, maxPlayers: value.maxPlayers,
    };
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
    <fieldset disabled={disabled || busy}>
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
        {custom ? <><div className="condition-controls">{conditionTypes.map(type => <div className="condition-row" key={type}>
          <span>{conditionLabels[type]}</span><div className="segments" role="group" aria-label={conditionLabels[type]}>{([
            ['off', '关闭'], ['random', '随机'], ['required', '必选'],
          ] as [Appearance, string][]).map(([appearance, label]) => <button type="button" key={appearance} aria-pressed={value.appearance[type] === appearance}
            onClick={() => update('appearance', { ...value.appearance, [type]: appearance })}>{label}</button>)}</div>
        </div>)}</div>{value.appearance.tone !== 'off' && <label className="select-field"><span>声调位置</span><select value={value.toneScope} onChange={event => update('toneScope', event.target.value as Settings['toneScope'])}>
          <option value="one">一个汉字</option><option value="some">部分汉字</option><option value="all">全部汉字</option>
        </select></label>}</> : null}
      </section>
      {custom && <>
        <section className="settings-section">
          <h3>条件关系</h3>
          <div className="relation-list">{active.length < 2 ? <span className="muted">独立条件</span> : active.flatMap((first, index) => active.slice(index + 1).map(second =>
            <label className="relation-row" key={`${first}:${second}`}><span>{conditionLabels[first]} <span className="relation-plus">＋</span> {conditionLabels[second]}</span>
              <select aria-label={`${conditionLabels[first]}与${conditionLabels[second]}关系`} value={relation(first, second)} onChange={event => setRelation(first, second, event.target.value as RelationMode)}>
                <option value="free">自由位置</option><option value="same">同一汉字</option><option value="different">不同汉字</option>
              </select></label>))}</div>
        </section>
        <section className="settings-section">
          <h3>词库与难度</h3>
          <label className="select-field"><span>答案词库</span><select value={value.dictionary} onChange={event => updateDictionary(event.target.value as Settings['dictionary'])}>
            <option value="idioms">成语</option><option value="words">普通词语</option><option value="all">全部词语</option>
          </select></label>
          <div className="number-grid">
            <NumberField label="答案最短字数" value={value.minLength} min={2} max={9} onChange={next => update('minLength', next)} />
            <NumberField label="答案最长字数" value={value.maxLength} min={2} max={9} onChange={next => update('maxLength', next)} />
            <NumberField label="提示位置数量" value={value.promptLength} min={1} max={8} onChange={next => update('promptLength', next)} />
            <NumberField label="隐藏位置数量" value={value.hiddenCount} min={0} max={7} onChange={next => update('hiddenCount', next)} />
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
          <div className="bonus-setting"><span>奖励声母</span><div className="initial-grid">{initials.map(initial => <label key={initial} className="initial-choice">
            <input type="checkbox" checked={value.bonusInitials.includes(initial)} onChange={event => update('bonusInitials', event.target.checked
              ? [...value.bonusInitials, initial] : value.bonusInitials.filter(item => item !== initial))} /><span>{initial}</span>
          </label>)}</div></div>
        </section>
        <section className="settings-section">
          <h3>计时</h3><div className="segments timer-segments" role="group" aria-label="计时方式">
            <button type="button" aria-pressed={value.timerMode === 'fixed'} onClick={() => update('timerMode', 'fixed')}>固定</button>
            <button type="button" aria-pressed={value.timerMode === 'random'} onClick={() => update('timerMode', 'random')}>随机</button>
          </div>
          <div className="number-grid">{value.timerMode === 'fixed'
            ? <NumberField label="初始秒数" value={value.initialSeconds} min={1} max={120} onChange={next => update('initialSeconds', next)} />
            : <><NumberField label="随机秒数下限" value={value.randomMinSeconds} min={1} max={120} onChange={next => update('randomMinSeconds', next)} />
              <NumberField label="随机秒数上限" value={value.randomMaxSeconds} min={1} max={120} onChange={next => update('randomMaxSeconds', next)} /></>}
            <NumberField label="回合最短秒数" value={value.minimumSeconds} min={1} max={60} onChange={next => update('minimumSeconds', next)} />
          </div>
        </section>
      </>}
    </fieldset>
    {problems.length > 0 && <div className="field-errors" role="alert">{problems.map(problem => <p key={problem}>{problem}</p>)}</div>}
    {custom && <><div className="settings-actions"><button type="button" className="secondary-button" disabled={!validate.success || busy} onClick={onPreview}><Eye size={16} />预览提示</button>
        <button type="button" className="secondary-button" disabled={!validate.success || busy} onClick={exportRules}><Download size={16} />导出规则</button>
        {onSave && <button type="button" className="primary-button" disabled={disabled || !validate.success || busy} onClick={() => onSave(value, () => setEditingCustom(false))}><Save size={16} />保存规则</button>}
      </div>
      {preview && <div className="preview-area"><PromptView prompt={preview} compact /></div>}</>}
  </div>;
}
