"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; sources?: { title: string; url: string }[] };

const starters = [
  "¿Pueden hacer un agente de WhatsApp para mi negocio?",
  "¿Qué incluye una tienda en línea con ustedes?",
  "¿Cómo funciona la simulación energética?",
];

/** Reads the API's SSE stream: `sources`, then `delta` chunks, then `done` | `error`. */
async function* readEvents(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const event = /^event: (.+)$/m.exec(raw)?.[1];
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (event && data) yield { event, data: JSON.parse(data) };
    }
  }
}

export function ChatConsole({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);

  const scrollDown = () => requestAnimationFrame(() => log.current?.scrollTo({ top: log.current.scrollHeight }));

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    scrollDown();

    const patch = (fn: (m: Msg) => Msg) =>
      setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10).map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        patch((m) => ({ ...m, content: err.detail ?? "El asistente no está disponible. Escríbenos por WhatsApp." }));
        return;
      }
      for await (const { event, data } of readEvents(res)) {
        if (event === "sources") patch((m) => ({ ...m, sources: data }));
        if (event === "delta") patch((m) => ({ ...m, content: m.content + data.text }));
        if (event === "error") patch((m) => ({ ...m, content: m.content || data.message }));
        scrollDown();
      }
    } catch {
      patch((m) => ({ ...m, content: "Se perdió la conexión. Intenta de nuevo." }));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-graphite/70">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="flex items-center gap-2.5 text-[0.9rem]">
          <span className="size-2 rounded-full bg-gold [animation:pulse-dot_2.4s_ease-in-out_infinite]" />
          Asistente CODEX
        </p>
        <p className="text-[0.8rem] text-ash">Responde con nuestros proyectos reales</p>
      </div>

      <div ref={log} className={`flex-1 space-y-5 overflow-y-auto px-5 py-5 ${compact ? "min-h-64" : "min-h-80"}`} aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <p className="mb-4 text-ash">Pregunta lo que quieras sobre lo que construimos.</p>
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="block w-full rounded-xl border border-line px-4 py-3 text-left text-[0.92rem] text-ivory/85 transition-colors hover:border-gold hover:text-ivory"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-gold/12 px-4 py-2.5 text-[0.95rem] text-champagne">
              {m.content}
            </p>
          ) : (
            <div key={i} className="max-w-[92%]">
              {m.content ? (
                <p className="whitespace-pre-wrap text-[0.96rem] leading-relaxed text-ivory/90">{m.content}</p>
              ) : (
                <LoaderCircle className="size-4 animate-spin text-gold" aria-label="Escribiendo" />
              )}
              {m.sources && m.content && m.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.sources.slice(0, 4).map((s) => (
                    <Link
                      key={s.url + s.title}
                      href={s.url}
                      className="rounded-full border border-line px-3 py-1 text-[0.78rem] text-ash transition-colors hover:border-gold hover:text-champagne"
                    >
                      {s.title.replace(/^(Servicio|Proyecto|Caso|Curso) — /, "")}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3">
        <label htmlFor="chat-input" className="sr-only">Tu pregunta</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta"
          maxLength={1000}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[0.98rem] placeholder:text-ash focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Enviar pregunta"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-obsidian transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-4.5" />
        </button>
      </form>
    </div>
  );
}
