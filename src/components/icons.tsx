// Set de icones minimalistas (linha, 24x24, currentColor) — sem lib externa,
// pra dar uma cara mais "app profissional" que emoji na navegacao principal.
import type { CSSProperties, ReactNode } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export interface IconProps {
  size?: number;
  style?: CSSProperties;
}

function Svg({ children, size = 22, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={style}>
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4h3v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-9" /></Svg>
);

export const IconDumbbell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" />
    <rect x="3.2" y="9" width="3.3" height="6" rx="1" />
    <rect x="17.5" y="9" width="3.3" height="6" rx="1" />
    <path d="M6.5 12h11" />
  </Svg>
);

export const IconApple = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 8.2c-1.1-1.4-2.7-2-4.3-1.5-2 .6-3.4 2.7-3.4 5.2 0 3.6 2.6 8.1 5.6 8.1 1 0 1.5-.4 2.1-.4s1.1.4 2.1.4c2.6 0 4.8-3.4 5.4-6.2.1-.5-.1-1-.5-1.2-1.3-.7-2.1-2-2.1-3.5 0-1.2.6-2.3 1.5-3-1-.8-2.3-1.2-3.5-.9-1 .2-1.8.9-2.9 1z" />
    <path d="M12 8.2c0-1.8.7-3.2 1.8-4.2" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c.9-3.4 3.7-5.4 7.2-5.4s6.3 2 7.2 5.4" /></Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}><path d="M15 5.5 8 12l7 6.5" /></Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}><path d="M9 5.5 16 12l-7 6.5" /></Svg>
);

export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}><path d="M5.5 15 12 8l6.5 7" /></Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="M5.5 9 12 16l6.5-7" /></Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 7h15" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9L17.5 7" /><path d="M10 11v6" /><path d="M14 11v6" /></Svg>
);

export const IconEdit = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8L17 5.2a2 2 0 0 0-2.8 0L4 15.5z" /><path d="M13.5 6.5l4 4" /></Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 12.5l5 5 10-11" /></Svg>
);

export const IconDroplet = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5s6 6.6 6 10.9a6 6 0 1 1-12 0c0-4.3 6-10.9 6-10.9z" /></Svg>
);

export const IconFlame = (p: IconProps) => (
  <Svg {...p}><path d="M12 3s-5 4.6-5 9.2a5 5 0 0 0 10 0c0-1.4-.7-2.6-1.4-3.5.1 1-.3 1.8-1 2.2C15.2 9 15.5 6 12 3z" /></Svg>
);

export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v5.2c0 2.9-2.2 5.3-5 5.3s-5-2.4-5-5.3V4z" />
    <path d="M7 5H4.5a1 1 0 0 0-1 1.2c.4 2.2 1.8 3.8 3.7 4.3" />
    <path d="M17 5h2.5a1 1 0 0 1 1 1.2c-.4 2.2-1.8 3.8-3.7 4.3" />
    <path d="M12 14.5V17" /><path d="M8.5 20.5h7" /><path d="M9.5 17.5h5l.6 3H8.9z" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 11.8 19 4.5l-5 15-3.4-6.1-6.1-1.6z" /><path d="M10.6 13.4 19 4.5" /></Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>
);

export const IconGrip = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10h16" /><path d="M8.5 3.5v3.5" /><path d="M15.5 3.5v3.5" /></Svg>
);

export const IconShoppingBag = (p: IconProps) => (
  <Svg {...p}><path d="M6.5 8h11l1 12.5H5.5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}><path d="M5 5.5h6a2 2 0 0 1 2 2V19a2 2 0 0 0-2-1.5H5z" /><path d="M19 5.5h-6a2 2 0 0 0-2 2V19a2 2 0 0 1 2-1.5h6z" /></Svg>
);

export const IconActivity = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 12h4l2-6 4 12 2-6h5" /></Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.6" /></Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 3.5l17 17" /><path d="M10.6 5.7A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.6 15.6 0 0 1-3.2 4" /><path d="M6.8 7.3C4.3 8.9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.3 0 2.5-.3 3.6-.8" /><path d="M9.9 10a2.6 2.6 0 0 0 3.7 3.7" /></Svg>
);

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}><circle cx="9.5" cy="8.2" r="3.4" /><path d="M2.8 20c.9-3.4 3.4-5.4 6.7-5.4s5.8 2 6.7 5.4" /><path d="M18.5 8v6" /><path d="M15.5 11h6" /></Svg>
);

export const IconLogOut = (p: IconProps) => (
  <Svg {...p}><path d="M9 20H5.5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5.5 4H9" /><path d="M16 16l4-4-4-4" /><path d="M20 12H9" /></Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>
);

export const IconStar = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" /></Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);

export const IconScale = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5v17" /><path d="M7 6.5h10" /><path d="M4 6.5l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M20 6.5l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M8.5 20.5h7" /></Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 12h4.5l1.5 2.5h5L16 12h4.5" /><path d="M5.5 6h13L20.5 12v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-5z" /></Svg>
);

// --- "O Sistema" (camada RPG) --------------------------------------------

export const IconShield = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5 19 6.2v5.3c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6.2z" /><path d="M9 12l2 2 4-4.5" /></Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></Svg>
);

export const IconCrown = (p: IconProps) => (
  <Svg {...p}><path d="M4 17h16l-1.3-8-4.2 3.3L12 6l-2.5 6.3L5.3 9z" /><path d="M5.5 20h13" /></Svg>
);

export const IconAward = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8.5" r="5" /><path d="M9 12.8 7.5 20l4.5-2.5 4.5 2.5-1.5-7.2" /></Svg>
);

export const IconZap = (p: IconProps) => (
  <Svg {...p}><path d="M12.5 3 5.5 13h5.2L11 21l7-10.5h-5.2z" /></Svg>
);
