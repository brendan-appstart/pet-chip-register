/**
 * Translation (for multi-language lost-pet posters/pages) is out of scope for
 * the MVP. The identity translator returns text unchanged so downstream code can
 * already call `translate()` and a real provider can drop in later.
 */
export interface Translator {
  readonly name: string;
  translate(text: string, targetLang: string, sourceLang?: string): Promise<string>;
}

export function createIdentityTranslator(): Translator {
  return {
    name: 'identity',
    async translate(text) {
      return text;
    },
  };
}
