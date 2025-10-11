export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Nimu</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your AI-powered video and audio generation platform
        </p>
        <div className="space-x-4">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Dashboard
          </a>
          <a
            href="/auth"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
