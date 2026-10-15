/**
 * Voz en el iPhone: dictado del sistema + Apple Intelligence (plugin KvarVoice).
 * Si Apple Intelligence no está, se interpreta con reglas en el teléfono (src/domain/voice.ts).
 */
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { kindFromModel, parseVoice, type VoiceAction } from '../domain/voice';
import { locale, m } from '../i18n';
import { isNative } from './platform';

export type AIStatus = 'available' | 'notEnabled' | 'notEligible' | 'notReady' | 'unsupported';

interface KvarVoicePlugin {
  availability(): Promise<{ speech: boolean; appleIntelligence: AIStatus }>;
  /** locale: idioma del dictado (p. ej. «en-US»); el plugin puede ignorarlo y usar español */
  start(options?: { locale: string }): Promise<void>;
  stop(): Promise<{ text: string }>;
  interpret(options: { text: string }): Promise<{ actions: { kind: string; product: string; quantity: number }[] }>;
  recipeIdeas(options: { have: string[]; expiring: string[]; avoid: string[]; servings: number; language: string }): Promise<{
    recipes: { title: string; minutes: number; ingredients: { name: string; quantity: number; unit: string }[]; steps: string[] }[];
  }>;
  addListener(event: 'partial', cb: (data: { text: string; final: boolean }) => void): Promise<PluginListenerHandle>;
}

export const KvarVoice = registerPlugin<KvarVoicePlugin>('KvarVoice');

export const canDictate = isNative;

export async function voiceAvailability(): Promise<{ speech: boolean; ai: AIStatus }> {
  if (!isNative) return { speech: false, ai: 'unsupported' };
  try {
    const r = await KvarVoice.availability();
    return { speech: r.speech, ai: r.appleIntelligence };
  } catch {
    return { speech: false, ai: 'unsupported' };
  }
}

export async function startDictation(onPartial: (text: string) => void): Promise<() => Promise<string>> {
  const handle = await KvarVoice.addListener('partial', (d) => onPartial(d.text));
  await KvarVoice.start({ locale });
  return async () => {
    const { text } = await KvarVoice.stop();
    await handle.remove();
    return text;
  };
}

/** Frase → acciones. Apple Intelligence si está disponible; si no, reglas en el teléfono. */
export async function interpret(text: string, ai: AIStatus): Promise<{ actions: VoiceAction[]; by: 'ai' | 'rules' }> {
  if (isNative && ai === 'available') {
    try {
      const r = await KvarVoice.interpret({ text });
      const actions = r.actions
        .map((a) => ({ kind: kindFromModel(a.kind), product: a.product.trim(), quantity: Math.max(1, Math.round(a.quantity || 1)) }))
        .filter((a): a is VoiceAction => a.kind !== null && a.product.length > 1);
      if (actions.length) return { actions, by: 'ai' };
    } catch {
      /* si el modelo falla, se usan las reglas */
    }
  }
  return { actions: parseVoice(text), by: 'rules' };
}

/** Aviso según el estado de Apple Intelligence (null si no hay nada que decir). */
export function aiHint(status: AIStatus): string | null {
  return status === 'notEnabled' || status === 'notEligible' || status === 'notReady' ? m.capture.voice.aiHints[status] : null;
}
