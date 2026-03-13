import Image from "next/image";

/**
 * KalamTributeCard — a respectful, premium card honouring Dr. A.P.J. Abdul Kalam.
 * Static content — no data fetching required.
 */
export default function KalamTributeCard() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-7 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-purple-50 flex flex-col items-center text-center h-full justify-center gap-5">
      {/* Portrait */}
      <div className="w-[88px] h-[88px] rounded-full overflow-hidden ring-4 ring-[#6D4BCB]/20 shadow-lg bg-purple-100 shrink-0">
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/A_P_J_Abdul_Kalam.jpg/400px-A_P_J_Abdul_Kalam.jpg"
          alt="Dr. A.P.J. Abdul Kalam"
          width={88}
          height={88}
          className="w-full h-full object-cover object-top"
          unoptimized
        />
      </div>

      {/* Text */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6D4BCB] mb-2">
          Dedicated to
        </p>
        <p className="text-base md:text-[17px] font-bold text-[#2D1B69] leading-snug mb-3">
          Dr. A.P.J. Abdul Kalam
        </p>
        <p className="text-[13px] text-gray-500 leading-relaxed max-w-[260px] mx-auto">
          All Saphala learning products are dedicated to his vision, values, and
          educational spirit — inspiring millions of students to dream, learn,
          and achieve.
        </p>
      </div>

      {/* Subtle purple accent line */}
      <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-[#6D4BCB] to-[#a78bfa]" />
    </div>
  );
}
