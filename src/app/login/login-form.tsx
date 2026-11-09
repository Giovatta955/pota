"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setState("error");
      setMsg("Non riesco a inviare il link. Riprova tra poco.");
    } else setState("sent");
  }
  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }

  if (state === "sent")
    return <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Controlla la posta: ti abbiamo inviato il link di accesso a <b>{email}</b>.</p>;

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={magicLink} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:outline-2 focus:outline-indigo-600" />
        <button disabled={state === "sending"} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
          {state === "sending" ? "Invio…" : "Inviami il link"}
        </button>
        {state === "error" && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      </form>
      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1" && (
        <>
          <div className="text-center text-xs text-slate-500">oppure</div>
          <button onClick={google} className="w-full rounded-lg border border-slate-300 px-4 py-3 font-medium">Continua con Google</button>
        </>
      )}
    </div>
  );
}
