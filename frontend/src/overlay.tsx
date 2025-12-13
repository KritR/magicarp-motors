import logo from "./logo.png";
import { useTelemetry } from "./use-telemetry";

export default function Overlay() {
  const { speed, rpm, throttle } = useTelemetry();

  return (
    <div className="min-h-screen w-full bg-transparent overflow-hidden relative font-mono">
      {/* Widget Container */}
      <div className="fixed bottom-12 right-12 w-[450px] flex flex-col gap-2">
        {/* Main Box - Industrial Style */}
        <div className="relative bg-black/90 border-2 border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
          {/* Industrial Corner Brackets */}
          <div className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-4 border-l-4 border-primary z-30"></div>
          <div className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-4 border-r-4 border-primary z-30"></div>
          <div className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-4 border-l-4 border-primary z-30"></div>
          <div className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-4 border-r-4 border-primary z-30"></div>
          {/* Side Accents (Rivets/Mounts) */}
          <div className="absolute top-1/2 -left-[4px] w-[2px] h-12 bg-primary/50 transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 -right-[4px] w-[2px] h-12 bg-primary/50 transform -translate-y-1/2"></div>

          {/* Combined Bars Section (Top) */}
          <div className="flex flex-col gap-4 mb-6 relative z-20">
            {/* RPM Bar */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-primary font-bold tracking-wider leading-none">
                  RPM
                </span>
                <span className="text-lg text-primary font-bold tracking-wider leading-none tabular-nums">
                  {rpm}
                </span>
              </div>
              <div className="flex items-end gap-[4px] h-8 w-full">
                {Array.from({ length: 15 }).map((_, i) => {
                  const active = (rpm / 9000) * 15 > i;
                  const isRedline = i >= 12;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full transition-all duration-75 skew-x-[-12deg] ${
                        active
                          ? isRedline
                            ? "bg-red-500 shadow-[0_0_12px_red]"
                            : "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                          : "bg-white/5"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            {/* Throttle Bar */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-accent font-bold tracking-wider leading-none">
                  THROTTLE
                </span>
                <span className="text-lg text-accent font-bold tracking-wider leading-none tabular-nums">
                  {throttle}%
                </span>
              </div>
              <div className="flex items-end gap-[4px] h-5 w-full">
                {Array.from({ length: 15 }).map((_, i) => {
                  const active = (throttle / 100) * 15 > i;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full transition-all duration-75 skew-x-[-12deg] ${
                        active
                          ? "bg-accent shadow-[0_0_8px_var(--color-accent)]"
                          : "bg-white/5"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {/* Data Grid (Numbers Below) */}
          <div className="grid grid-cols-2 gap-4 relative z-20 pt-4 border-t border-white/10">
            {/* Speed */}
            <div className="flex flex-col justify-end pl-2">
              <span className="text-xs text-primary/60 font-bold tracking-wider mb-1">
                SPEED_MPH
              </span>
              <span className="text-8xl font-bold text-white text-glow leading-[0.8] tracking-tighter">
                {speed}
              </span>
            </div>
            {/* Logo */}
            <div className="flex flex-col justify-end items-end h-full pb-2 pr-2">
              <img
                src={logo}
                alt="Magicarp Motos"
                className="h-14 object-contain invert opacity-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
