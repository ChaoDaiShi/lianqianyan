const PARTICLES = [
  ['left-[8%] top-[18%]', 'h-2 w-2'],
  ['left-[22%] top-[72%]', 'h-1.5 w-1.5'],
  ['left-[48%] top-[12%]', 'h-1 w-1'],
  ['right-[32%] top-[56%]', 'h-2.5 w-2.5'],
  ['right-[9%] top-[28%]', 'h-1.5 w-1.5'],
  ['right-[18%] bottom-[12%]', 'h-1 w-1'],
] as const;

export type NebulaScene = 'default' | 'companion' | 'galaxy' | 'storybook';

export function NebulaBackground({ scene = 'default' }: { scene?: NebulaScene }) {
  return (
    <div className="em-nebula pointer-events-none fixed inset-0 overflow-hidden" data-background="learning-space" data-nebula-scene={scene} aria-hidden="true">
      <img
        src="/brand/learning-space-background.png"
        alt=""
        className="em-learning-background absolute inset-0 h-full w-full object-cover"
      />
      <span className="em-learning-background-wash absolute inset-0" />
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-pink-200/20 blur-3xl" />
      <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-sky-200/25 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />
      {PARTICLES.map(([position, size]) => (
        <span
          key={position}
          className={`absolute ${position} ${size} rounded-full bg-white shadow-[0_0_16px_rgba(139,124,246,0.7)]`}
        />
      ))}
    </div>
  );
}
