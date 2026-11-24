// Shapes shared by several screens. Feature-specific shapes live with their service in src/services.

export interface MindMapNode {
  id: string;
  label: string;
  detail?: string;
  children: MindMapNode[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

/** A lesson plan's notes for students (server: superNotesAgent). Every list may be absent on short notes. */
export interface SuperNotes {
  title: string;
  summary: string;
  definitions?: { term: string; meaning: string }[];
  keyPoints?: string[];
  sequence?: { title: string; steps?: string[] };
  mindMap?: { center: string; branches?: { label: string; points?: string[] }[] };
  formulas?: { name: string; expression: string; note?: string | null }[];
  examples?: { title: string; steps?: string[]; answer?: string | null }[];
  importantPoints?: string[];
  commonMistakes?: string[];
  memoryTips?: string[];
  realLife?: string[];
  quickCheck?: { question: string; answer: string }[];
}

export interface SimulationVariable {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
  unit: string;
}

export interface SimulationDetail {
  id: string;
  title: string;
  subject: string;
  topic: string;
  code: string;
  /** "p5-shim" or "p5-full" (legacy library names resolve to the shim). */
  runtime: string;
  bioZoom: boolean;
  variables: SimulationVariable[];
  physicsNotes: string;
}

export interface StoryAct {
  actNumber: number;
  title: string;
  synopsis: string;
  script: string;
  conceptFocus: string;
  microExplanation: string;
  imageUrl: string | null;
}
