/** Shown while the session and conversation history load. */
export function ChatSkeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true">
      <div className="h-16 border-b border-line" />
      <div className="flex w-full flex-1">
        <div className="hidden w-72 space-y-2 border-r border-line p-4 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-moss/60" />
          ))}
        </div>
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
          <div className="ml-auto h-12 w-2/3 animate-pulse rounded-3xl bg-moss/60" />
          <div className="h-24 w-5/6 animate-pulse rounded-3xl bg-moss/40" />
        </div>
      </div>
    </div>
  );
}
