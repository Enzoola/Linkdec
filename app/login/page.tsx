import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in · Linkdeck" };

export default function LoginPage() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <main className="card">
      <h1>Log in or sign up</h1>
      {configured ? (
        <>
          <p>Enter your email and we will send you a one-time link. New here? That link creates your account.</p>
          <LoginForm />
        </>
      ) : (
        <p className="note" role="alert">
          This site is not connected to its database yet. The site owner needs to set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel and redeploy.
        </p>
      )}
    </main>
  );
}
