export type SafetyCategory =
  | 'ALL'
  | 'HELPLINES'
  | 'TRAVEL'
  | 'COMMUTE'
  | 'NIGHT_SAFETY'
  | 'DIGITAL';

export interface SafetyTipItem {
  id: number;
  category: SafetyCategory | string;
  title: string;
  content: string;
  emergencyNumber?: string | null;
  helpline: boolean;
  displayOrder: number;
}
