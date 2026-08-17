export default function GoogleIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 5.04c1.7 0 3.22.59 4.42 1.73l3.29-3.29C17.68 1.6 15.05.5 12 .5 7.7.5 3.99 2.97 2.18 6.34l3.82 2.97C6.9 6.7 9.21 5.04 12 5.04Z" />
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45c-.28 1.5-1.12 2.77-2.4 3.62l3.71 2.88c2.17-2 3.74-4.96 3.74-8.69Z" />
      <path fill="#FBBC05" d="M6 14.35a7.2 7.2 0 0 1 0-4.7L2.18 6.68a12 12 0 0 0 0 10.76L6 14.35Z" transform="translate(0 -.34)" />
      <path fill="#34A853" d="M12 23.5c3.05 0 5.61-1 7.48-2.72l-3.71-2.88c-1.03.69-2.35 1.1-3.77 1.1-2.79 0-5.1-1.66-6-4.31l-3.82 2.97C4.01 21.03 7.7 23.5 12 23.5Z" />
    </svg>
  );
}
