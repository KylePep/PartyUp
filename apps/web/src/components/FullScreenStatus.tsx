type Props =
  | { type: "loading" }
  | { type: "unreachable"; onRetry: () => void; onSignOut: () => void };

export function FullScreenStatus(props: Props) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6">
      {props.type === "loading" ? (
        <p className="font-display text-brand-muted text-sm tracking-[0.3em] uppercase">
          Verifying your session...
        </p>
      ) : (
        <div className="text-center max-w-sm">
          <div className="h-px w-16 bg-brand-gold/40 mx-auto mb-8" />
          <p className="font-display text-brand-gold text-lg tracking-wide mb-3">
            Server Unreachable
          </p>
          <p className="text-brand-muted text-sm leading-relaxed mb-8">
            The API could not be reached. Check that the backend is running, then try again.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={props.onRetry}
              className="border border-brand-border text-brand-muted text-sm px-6 py-2.5 hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 font-display tracking-wider"
            >
              Retry
            </button>
            <button
              onClick={props.onSignOut}
              className="border border-brand-border text-brand-muted text-sm px-6 py-2.5 hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 font-display tracking-wider"
            >
              Sign Out
            </button>
          </div>
          <div className="h-px w-16 bg-brand-gold/40 mx-auto mt-8" />
        </div>
      )}
    </div>
  );
}
