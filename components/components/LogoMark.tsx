type LogoMarkProps = {
  size?: number;
};

export default function LogoMark({ size = 34 }: LogoMarkProps) {
  return (
    <span
      className="logo-mark"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" role="img">
        <defs>
          <linearGradient id="logoGradient" x1="4" y1="4" x2="36" y2="36">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="0.55" stopColor="#6d5dfc" />
            <stop offset="1" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#logoGradient)" />
        <path
          d="M10.5 26V14.2c0-1.1.9-2 2-2h2.2l5.3 7.2 5.3-7.2h2.2c1.1 0 2 .9 2 2V26h-4.2v-7.2L20 25.7l-5.3-6.9V26h-4.2Z"
          fill="white"
        />
      </svg>
    </span>
  );
}
