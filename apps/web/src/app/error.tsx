"use client"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Xatolik yuz berdi</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "Noma'lum xatolik yuz berdi."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Qayta urinish
        </button>
      </div>
    </main>
  )
}
