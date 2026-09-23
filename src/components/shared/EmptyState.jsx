export default function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {body}
      </div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
