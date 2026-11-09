import { LoginForm } from "./login-form";

export const metadata = { title: "Accedi" };

const ERRORI: Record<string, string> = {
  link: "Il link non è valido o è scaduto (dura 1 ora e si usa una volta sola). Chiedine uno nuovo qui sotto.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  const { errore } = await searchParams;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Accedi</h1>
      <p className="mt-2 text-sm text-slate-600">Niente password: ti mandiamo un link via email. Aprilo da qualsiasi dispositivo.</p>
      {errore && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{ERRORI[errore] ?? "Accesso non riuscito. Riprova."}</p>}
      <LoginForm />
    </main>
  );
}
