import Image from "next/image";

/**
 * KalamTributeCard — compact horizontal layout: portrait left, text right.
 * White card with brand purple top-accent border.
 */
export default function KalamTributeCard() {
  return (
    <div
      className="bg-white rounded-xl shadow-sm flex flex-row items-center gap-4 h-full px-5 py-4"
      style={{ border: "1px solid #E5E7EB", borderTop: "4px solid #8050C0" }}
    >
      {/* Portrait */}
      <div className="shrink-0 w-[64px] h-[64px] rounded-full overflow-hidden ring-2 ring-[#8050C0]/25 shadow-md bg-purple-100">
        <Image
          src="/images/kalam-portrait.png"
          alt="Dr. A.P.J. Abdul Kalam"
          width={64}
          height={64}
          className="w-full h-full object-cover object-top"
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8050C0] mb-0.5">
          Dedicated to
        </p>
        <p className="text-[13px] font-bold text-[#2D1B69] leading-snug mb-1.5">
          Dr. A.P.J. Abdul Kalam
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          All Saphala learning products are dedicated to his vision, values, and
          educational spirit — inspiring millions of students to dream, learn,
          and achieve.
        </p>
      </div>
    </div>
  );
}
