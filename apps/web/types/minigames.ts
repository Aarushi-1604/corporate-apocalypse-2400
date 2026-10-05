// Mini-Game Core Framework Types

export interface BusinessConcept {
  title: string;
  category: "Finance" | "Operations" | "HR & Ethics" | "Strategy" | "Governance";
  explanation: string;
  takeawayKey: string; // e.g. "DIMINISHING_RETURNS", "LTV_VS_CAC", "PR_DAMAGE_CONTROL"
}

export interface CharacterSpeaker {
  name: string;
  role: string;
  avatarIcon?: string;
  colorTheme?: "cyan" | "emerald" | "amber" | "rose" | "purple";
}

export interface NarrativeBriefing {
  speaker: CharacterSpeaker;
  dialogueText: string;
  concept: BusinessConcept;
  objectives: string[];
}

export interface GameDebriefImpact {
  metricLabel: string;
  changeValue: string | number;
  isPositive: boolean;
}

export interface MiniGameConfig<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  gameId: string;
  title: string;
  subtitle?: string;
  briefing: NarrativeBriefing;
  timeLimitSeconds?: number;
  initialData: TInput;
  onComplete: (output: TOutput) => Promise<void>;
  onCancel?: () => void;
}
