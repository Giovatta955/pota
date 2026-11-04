import { LoginForm } from "./login-form";

export const metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Accedi</h1>
      <p className="mt-2 text-sm text-slate-600">Niente password: ti mandiamo un link via email.</p>
      <LoginForm />
    </main>
  );
}
