'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart2, Timer, Settings } from 'lucide-react';

const tabs = [
  { href: '/',         icon: Home      },
  { href: '/plan',     icon: Calendar  },
  { href: '/log',      icon: BarChart2 },
  { href: '/pace',     icon: Timer     },
  { href: '/settings', icon: Settings  },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-7 z-50 pointer-events-none">
      <nav
        className="pointer-events-auto flex items-center gap-0.5 px-2.5 py-2.5 rounded-full"
        style={{
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
        }}
      >
        {tabs.map(({ href, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center w-14 h-12 rounded-full transition-all"
              style={{ background: active ? 'rgba(255,107,53,0.14)' : 'transparent' }}
            >
              <Icon
                size={23}
                strokeWidth={active ? 2.2 : 1.6}
                style={{ color: active ? '#FF6B35' : '#48484a' }}
              />
              {active && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full" style={{ background: '#FF6B35' }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
