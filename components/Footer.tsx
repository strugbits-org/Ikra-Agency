export default function Footer() {
  return (
    <footer className="relative flex min-h-[440px] w-full flex-col justify-between overflow-hidden bg-[#484848] text-white md:min-h-[510px] lg:min-h-[560px]">
      {/* Background giant "ikra." logo watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-8 opacity-[0.05] select-none md:px-16"
      >
        <img
          src="/img/logo-white.png"
          alt=""
          className="h-auto w-full object-contain translate-y-4 md:translate-y-6 mt-20"
        />
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-between px-8 pt-16 pb-4 md:px-16 md:pt-20 md:pb-4 lg:pt-20">
        {/* Top 3-column row */}
        <div className="flex flex-col items-center justify-between gap-10 md:flex-row md:items-start">
          {/* Left Column: Contacts */}
          <div className="w-full text-left md:w-1/3">
            <h3 className="mb-4 text-xl font-medium tracking-tight text-white md:mb-5 md:text-[26px] lg:mb-6 lg:text-[31px]">
              Contacts
            </h3>
            <div className="space-y-1 text-[15px] font-normal text-white md:text-base lg:text-[21px]">
              <p className="leading-snug">
                Rue de Charonne 89, Paris, France
              </p>
              <p>
                <a
                  href="mailto:info@ikra.agency"
                  className="transition-opacity hover:opacity-75"
                >
                  info@ikra.agency
                </a>
              </p>
            </div>
          </div>

          {/* Center Column: MAKE THE LEAP™ Badge with Constellation Pixels */}
          <div className="flex w-full items-center justify-center -translate-y-2 md:w-1/3 md:-translate-y-4 lg:-translate-y-5">
            <div className="relative flex items-center justify-center">
              <svg
                width="300"
                height="96"
                viewBox="0 0 300 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-auto w-[205px] sm:w-[240px] md:w-[275px] lg:w-[320px]"
              >
                {/* Left vertical border */}
                <line
                  x1="18"
                  y1="24"
                  x2="18"
                  y2="72"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Right vertical border */}
                <line
                  x1="282"
                  y1="24"
                  x2="282"
                  y2="72"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Top horizontal border: Left segment */}
                <line
                  x1="18"
                  y1="24"
                  x2="198"
                  y2="24"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Top horizontal border: Right segment */}
                <line
                  x1="234"
                  y1="24"
                  x2="282"
                  y2="24"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Bottom horizontal border: Left segment */}
                <line
                  x1="18"
                  y1="72"
                  x2="170"
                  y2="72"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Bottom horizontal border: Right segment */}
                <line
                  x1="206"
                  y1="72"
                  x2="282"
                  y2="72"
                  stroke="white"
                  strokeWidth="1.8"
                />

                {/* Top-Right Pixel Trail */}
                <rect x="201" y="30" width="3.5" height="3.5" fill="white" />
                <rect x="201" y="23" width="3.5" height="3.5" fill="white" />
                <rect x="208" y="18" width="3.5" height="3.5" fill="white" />
                <rect x="215" y="18" width="3.5" height="3.5" fill="white" />
                <rect x="208" y="11" width="3.5" height="3.5" fill="white" />
                <rect x="220" y="7" width="3.5" height="3.5" fill="white" />
                <rect x="227" y="2" width="3.5" height="3.5" fill="white" />
                <rect x="234" y="-3" width="3.5" height="3.5" fill="white" />

                {/* Bottom-Left Pixel Trail */}
                <rect x="198" y="62" width="3.5" height="3.5" fill="white" />
                <rect x="191" y="67" width="3.5" height="3.5" fill="white" />
                <rect x="191" y="74" width="3.5" height="3.5" fill="white" />
                <rect x="184" y="79" width="3.5" height="3.5" fill="white" />
                <rect x="177" y="84" width="3.5" height="3.5" fill="white" />
                <rect x="177" y="91" width="3.5" height="3.5" fill="white" />

                {/* Centered MAKE THE LEAP text */}
                <text
                  x="150"
                  y="49"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="19"
                  fontWeight="400"
                  letterSpacing="0.08em"
                  className="font-sans"
                >
                  MAKE THE LEAP
                  <tspan dx="3" dy="-1" fontSize="7.5" fontWeight="400" opacity="0.9">
                    TM
                  </tspan>
                </text>
              </svg>
            </div>
          </div>

          {/* Right Column: Follow us */}
          <div className="w-full text-right md:w-1/3">
            <h3 className="mb-4 text-xl font-medium tracking-tight text-white md:mb-5 md:text-[26px] lg:mb-6 lg:text-[31px]">
              Follow us
            </h3>
            <div className="flex flex-col items-end space-y-1 text-[15px] font-normal text-white md:text-base lg:text-[21px]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-75"
              >
                Instagram
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-75"
              >
                Linkedin
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row: Copyright Notice */}
        <div className="mt-20 text-center md:mt-24 lg:mt-28">
          <p className="text-[11px] font-normal tracking-wide text-white/90 md:text-xs">
            © 2026. All rights Reserved by ikra.agency
          </p>
        </div>
      </div>

      {/* Bottom accent stripe */}
      <div className="h-1.5 w-full bg-[#fa5e3c] md:h-[7px]" />
    </footer>
  );
}



