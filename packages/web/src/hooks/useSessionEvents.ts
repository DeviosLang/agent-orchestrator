"use client";

import { useEffect, useReducer } from "react";
import type { DashboardSession, GlobalPauseState, SSESnapshotEvent } from "@/lib/types";

interface State {
  sessions: DashboardSession[];
  globalPause: GlobalPauseState | null;
}

type Action =
  | { type: "reset"; sessions: DashboardSession[]; globalPause: GlobalPauseState | null }
  | { type: "snapshot"; patches: SSESnapshotEvent["sessions"] }
  | { type: "updatePause"; globalPause: GlobalPauseState | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { sessions: action.sessions, globalPause: action.globalPause };
    case "snapshot": {
      const patchMap = new Map(action.patches.map((p) => [p.id, p]));
      let changed = false;
      const next = state.sessions.map((s) => {
        const patch = patchMap.get(s.id);
        if (!patch) return s;
        if (
          s.status === patch.status &&
          s.activity === patch.activity &&
          s.lastActivityAt === patch.lastActivityAt
        ) {
          return s;
        }
        changed = true;
        return {
          ...s,
          status: patch.status,
          activity: patch.activity,
          lastActivityAt: patch.lastActivityAt,
        };
      });
      return changed ? { ...state, sessions: next } : state;
    }
    case "updatePause":
      return { ...state, globalPause: action.globalPause };
  }
}

export function useSessionEvents(
  initialSessions: DashboardSession[],
  initialGlobalPause?: GlobalPauseState | null,
  project?: string,
): State {
  const [state, dispatch] = useReducer(reducer, {
    sessions: initialSessions,
    globalPause: initialGlobalPause ?? null,
  });

  useEffect(() => {
    dispatch({ type: "reset", sessions: initialSessions, globalPause: initialGlobalPause ?? null });
  }, [initialSessions, initialGlobalPause]);

  useEffect(() => {
    const url = project ? `/api/events?project=${encodeURIComponent(project)}` : "/api/events";
    const es = new EventSource(url);

    es.onmessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { type: string };
        if (data.type === "snapshot") {
          const snapshot = data as SSESnapshotEvent;
          dispatch({ type: "snapshot", patches: snapshot.sessions });

          // Fetch updated globalPause state when membership changes
          const sessionsUrl = project
            ? `/api/sessions?project=${encodeURIComponent(project)}`
            : "/api/sessions";
          const res = await fetch(sessionsUrl);
          if (res.ok) {
            const updated = await res.json();
            dispatch({ type: "updatePause", globalPause: updated.globalPause ?? null });
          }
        }
      } catch {
        return;
      }
    };

    es.onerror = () => undefined;

    return () => {
      es.close();
    };
  }, [project]);

  return state;
}
