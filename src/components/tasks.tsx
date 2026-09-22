"use client";

import { useState } from "react";
import type { ExperimentTask } from "@/domain/types";
import { api, errorMessage } from "@/lib/api";
import { CheckIcon } from "./ui/icons";

export function TaskList({
  tasks,
  onToggle,
  showDescriptions = false,
}: {
  tasks: ExperimentTask[];
  onToggle: (task: ExperimentTask) => void;
  showDescriptions?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            role="checkbox"
            aria-checked={task.completed}
            onClick={() => onToggle(task)}
            className="group flex w-full items-start gap-3 text-left"
          >
            <span
              className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-all duration-200 group-hover:border-primary/40"
              style={{
                background: task.completed ? "rgba(0,168,255,0.15)" : "transparent",
                border: task.completed ? "1px solid rgba(0,168,255,0.3)" : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {task.completed && <CheckIcon />}
            </span>
            <span className="flex flex-col gap-1">
              <span
                className="text-sm transition-colors"
                style={{ color: task.completed ? "#5A5A72" : "#D0D0E0", textDecoration: task.completed ? "line-through" : "none" }}
              >
                {task.title}
              </span>
              {showDescriptions && task.description && (
                <span className="text-xs leading-relaxed text-ink-subtle">{task.description}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Optimistic task completion: updates the UI immediately, persists, and rolls
 * back with a user-safe error if saving fails.
 */
export function useTaskToggle(patchTask: (id: string, completed: boolean) => void) {
  const [error, setError] = useState<string | null>(null);

  const toggle = async (task: ExperimentTask) => {
    setError(null);
    patchTask(task.id, !task.completed);
    try {
      await api.setTask(task.id, !task.completed);
    } catch (e) {
      patchTask(task.id, task.completed);
      setError(errorMessage(e));
    }
  };

  return { toggle, error };
}
