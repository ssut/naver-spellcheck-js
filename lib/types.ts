export enum SpellcheckErrorType {
  /** 맞춤법 */
  Grammar,
  /** 띄어쓰기 */
  Spacing,
  /** 표준어 의심 */
  Nonstandard,
  /** 통계적 교정 */
  Statistical,
  Unknown,
}

export type SpellcheckResultPart =
  | { text: string }
  | { text: string; fixed: string; type: SpellcheckErrorType };

export interface SpellcheckResult {
  errtaCount: number;
  text: string;
  parts: SpellcheckResultPart[];
}
