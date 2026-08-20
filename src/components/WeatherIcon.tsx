import type { IconKey } from "@/lib/weather/wmo";

export function WeatherIcon({ icon, className = "" }: { icon: IconKey; className?: string }) {
  const common = { className, viewBox: "0 0 64 64", xmlns: "http://www.w3.org/2000/svg" };

  switch (icon) {
    case "clear-day":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="13" fill="var(--warn)" />
          <g stroke="var(--warn)" strokeWidth="3" strokeLinecap="round">
            <line x1="32" y1="6" x2="32" y2="13" />
            <line x1="32" y1="51" x2="32" y2="58" />
            <line x1="6" y1="32" x2="13" y2="32" />
            <line x1="51" y1="32" x2="58" y2="32" />
            <line x1="13.5" y1="13.5" x2="18.5" y2="18.5" />
            <line x1="45.5" y1="45.5" x2="50.5" y2="50.5" />
            <line x1="13.5" y1="50.5" x2="18.5" y2="45.5" />
            <line x1="45.5" y1="18.5" x2="50.5" y2="13.5" />
          </g>
        </svg>
      );
    case "clear-night":
      return (
        <svg {...common}>
          <path
            d="M40 12a20 20 0 1 0 12 36 16 16 0 0 1-12-36Z"
            fill="var(--accent-2)"
          />
          <circle cx="47" cy="18" r="1.6" fill="var(--accent-2)" />
          <circle cx="52" cy="26" r="1" fill="var(--accent-2)" />
        </svg>
      );
    case "partly-cloudy-day":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="10" fill="var(--warn)" />
          <g stroke="var(--warn)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="24" y1="6" x2="24" y2="11" />
            <line x1="8" y1="24" x2="13" y2="24" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" />
          </g>
          <path
            d="M22 46a11 11 0 0 1 21.6-2.8A9 9 0 0 1 42 61H24a9 9 0 0 1-2-17.8Z"
            fill="var(--muted)"
            opacity="0.85"
          />
        </svg>
      );
    case "partly-cloudy-night":
      return (
        <svg {...common}>
          <path d="M40 10a14 14 0 1 0 8 25.4A11 11 0 0 1 40 10Z" fill="var(--accent-2)" opacity="0.9" />
          <path
            d="M18 44a11 11 0 0 1 21.6-2.8A9 9 0 0 1 38 59H20a9 9 0 0 1-2-15Z"
            fill="var(--muted)"
            opacity="0.85"
          />
        </svg>
      );
    case "cloudy":
      return (
        <svg {...common}>
          <path
            d="M16 40a13 13 0 0 1 25.4-4A10.5 10.5 0 0 1 39 56H18a10 10 0 0 1-2-16Z"
            fill="var(--muted)"
          />
          <path
            d="M26 26a11 11 0 0 1 21 3.6"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="0"
          />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path
            d="M16 26a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18A9 9 0 0 1 16 26Z"
            fill="var(--muted)"
            opacity="0.85"
          />
          <g stroke="var(--muted)" strokeWidth="3" strokeLinecap="round">
            <line x1="10" y1="46" x2="54" y2="46" />
            <line x1="16" y1="53" x2="48" y2="53" />
          </g>
        </svg>
      );
    case "drizzle":
      return (
        <svg {...common}>
          <path
            d="M16 30a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18a9 9 0 0 1-2-16.9Z"
            fill="var(--muted)"
          />
          <g stroke="var(--accent-2)" strokeWidth="3" strokeLinecap="round">
            <line x1="22" y1="52" x2="19" y2="59" />
            <line x1="32" y1="52" x2="29" y2="59" />
            <line x1="42" y1="52" x2="39" y2="59" />
          </g>
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path
            d="M16 28a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18a9 9 0 0 1-2-16.9Z"
            fill="var(--muted)"
          />
          <g stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round">
            <line x1="20" y1="50" x2="16" y2="60" />
            <line x1="32" y1="50" x2="28" y2="60" />
            <line x1="44" y1="50" x2="40" y2="60" />
          </g>
        </svg>
      );
    case "freezing-rain":
      return (
        <svg {...common}>
          <path
            d="M16 28a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18a9 9 0 0 1-2-16.9Z"
            fill="var(--muted)"
          />
          <g stroke="var(--accent-2)" strokeWidth="3" strokeLinecap="round">
            <line x1="20" y1="50" x2="17" y2="58" />
            <line x1="44" y1="50" x2="41" y2="58" />
          </g>
          <circle cx="32" cy="55" r="3" fill="var(--accent-2)" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path
            d="M16 28a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18a9 9 0 0 1-2-16.9Z"
            fill="var(--muted)"
          />
          <g stroke="#dbeafe" strokeWidth="2.4" strokeLinecap="round">
            <line x1="21" y1="49" x2="21" y2="59" />
            <line x1="16.5" y1="51.5" x2="25.5" y2="56.5" />
            <line x1="25.5" y1="51.5" x2="16.5" y2="56.5" />
            <line x1="43" y1="49" x2="43" y2="59" />
            <line x1="38.5" y1="51.5" x2="47.5" y2="56.5" />
            <line x1="47.5" y1="51.5" x2="38.5" y2="56.5" />
          </g>
        </svg>
      );
    case "thunderstorm":
      return (
        <svg {...common}>
          <path
            d="M16 26a13 13 0 0 1 25.4-4 10.5 10.5 0 0 1 -1 20.9H18a9 9 0 0 1-2-16.9Z"
            fill="var(--muted)"
          />
          <path d="M30 44 22 58h9l-4 10 16-18h-9l5-6Z" fill="var(--warn)" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="18" fill="var(--muted)" />
        </svg>
      );
  }
}
