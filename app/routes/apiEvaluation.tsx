// apiEvaluation.tsx
import type { Route } from "./+types/apiEvaluation";
import { createApiLoader, defaultOptionsAction } from "./api";

export const loader = createApiLoader({
  table: "opinions",
  select: "id, created_at, value, question, userId",
  dateColumn: "created_at",
  dateColumnType: "timestamp",
  defaultOrder: [{ column: "created_at", ascending: false }],
  mapParams: {
    userId: "userId",
    question: "question",
    // Ex.: ?question_ilike=satisfacao
  },
  cacheControl: "public, max-age=300",
});

// Compatível com React Router v7 para preflight CORS
export const action = defaultOptionsAction;

// Tipagem opcional, se você usa os types gerados
export type { Route };
