import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Video, Image as ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Coach Chat — Body Forge" }] }),
  component: Chat,
});

type Msg = { role: "user" | "coach"; text: string };

const seed: Msg[] = [
  { role: "coach", text: "Hey — ready for today's push session? Quick check: how did your shoulders feel after Tuesday's pull day?" },
  { role: "user", text: "Pretty good actually, no soreness." },
  { role: "coach", text: "Love that. We'll push the bench a little — try 82.5kg for your top set. Send me a video of set 2 and I'll review your bar path. 💪" },
];

const suggestions = [
  "Modify today's workout",
  "Form check my squat",
  "What should I eat post-workout?",
  "I'm feeling tired — should I train?",
];

function Chat() {
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "coach",
          text: "Great question — once your AI Coach is connected, I'll give you a fully personalized response based on your full history, current program, and recovery data.",
        },
      ]);
    }, 700);
  };

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />
            </div>
            <div>
              <div className="font-semibold leading-tight">Coach Forge</div>
              <div className="text-xs text-muted-foreground">Online · Replies instantly</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 px-5 py-6">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-gradient-primary text-primary-foreground shadow-glow"
                    : "rounded-bl-md border border-border/60 bg-gradient-card shadow-card"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 3 && (
          <div className="mb-2 -mx-1 flex gap-2 overflow-x-auto px-5 pb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-1.5"
          >
            <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:text-primary">
              <Video className="h-4 w-4" />
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:text-primary">
              <ImageIcon className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your coach anything..."
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
