
import Link from "next/link";
import { auth } from "@/auth";

const Homepage = async () => {
  const session = await auth();

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto mt-16 w-full max-w-4xl rounded-2xl bg-white p-10 shadow-md">
        <h1 className="text-4xl font-bold text-slate-900">Welcome to BIDBZAR</h1>
        <p className="mt-3 text-slate-600">
          Online auction bidding platform powered by Next.js + MongoDB.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-700"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default Homepage;
