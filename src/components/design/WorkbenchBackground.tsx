/** Static canvas shared by the learning workspace. */
export function WorkbenchBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[var(--em-canvas)]"
      data-background="workbench"
      style={{
        backgroundImage:
          'linear-gradient(var(--em-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--em-grid-line) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    />
  );
}
