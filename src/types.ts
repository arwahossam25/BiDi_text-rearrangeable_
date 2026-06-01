export type TokenType = 'english' | 'arabic' | 'space' | 'punctuation' | 'numeric' | 'other';

export interface Token {
  id: string;
  text: string;
  type: TokenType;
}

export type RearrangeMode = 'english-start' | 'arabic-start';
export type GranularityMode = 'line' | 'paragraph' | 'all';

export interface RearrangeSettings {
  mode: RearrangeMode;
  reverseArabicWords: boolean;
  reverseArabicCharacters: boolean;
  reverseEnglishWords: boolean;
  granularity: GranularityMode;
  cleanDoubleSpaces: boolean;
  addBidiMarkers: boolean;
}

export interface ProcessingResult {
  originalText: string;
  rearrangedText: string;
  paragraphs: ParagraphAnalysis[];
}

export interface ParagraphAnalysis {
  id: string;
  originalText: string;
  rearrangedText: string;
  lines: LineAnalysis[];
}

export interface LineAnalysis {
  id: string;
  originalText: string;
  rearrangedText: string;
  tokens: Token[];
  rearrangedTokens: Token[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  originalText: string;
  rearrangedText: string;
  mode: RearrangeMode;
}

