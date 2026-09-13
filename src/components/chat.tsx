import { AIDot } from "./ui/primitives";
import { TypingDots } from "./ui/states";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex animate-fade-in-up gap-3">
      <div className="mt-0.5">
        <AIDot />
      </div>
      <div className="max-w-lg rounded-2xl rounded-tl-sm border border-white/6 bg-surface px-5 py-4">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className={`text-sm leading-relaxed whitespace-pre-line text-ink-soft ${i > 0 ? "mt-2" : ""}`}>
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex animate-fade-in-up justify-end">
      <div className="max-w-sm rounded-2xl rounded-tr-sm border border-white/7 bg-card px-5 py-4">
        <p className="text-sm leading-relaxed whitespace-pre-line text-white">{content}</p>
      </div>
    </div>
  );
}

export function AssistantTyping() {
  return (
    <div className="flex gap-3">
      <AIDot />
      <div className="rounded-2xl rounded-tl-sm border border-white/6 bg-surface">
        <TypingDots />
      </div>
    </div>
  );
}
