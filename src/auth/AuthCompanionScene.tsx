export function AuthCompanionScene() {
  return (
    <div
      data-auth-scene="illustrated"
      data-auth-background="learning-space"
      className="absolute inset-0 overflow-hidden bg-[#ddd7f8]"
      aria-hidden="true"
    >
      <img
        src="/brand/learning-space-background.png"
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(54,45,100,0.16)_0%,rgba(255,248,255,0.05)_48%,rgba(38,29,76,0.2)_100%)]" />
      <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(24,18,54,0.26)_0%,rgba(255,255,255,0)_55%,rgba(255,255,255,0.12)_100%)]" />
    </div>
  );
}
