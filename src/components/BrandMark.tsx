export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2.5V7M12 17V21.5M2.5 12H7M17 12H21.5" />
      <path d="M5.3 5.3L8.45 8.45M15.55 15.55L18.7 18.7M18.7 5.3L15.55 8.45M8.45 15.55L5.3 18.7" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    </svg>
  )
}
