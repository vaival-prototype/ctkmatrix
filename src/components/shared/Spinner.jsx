export default function Spinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-muted border-t-accent" />
    </div>
  );
}
