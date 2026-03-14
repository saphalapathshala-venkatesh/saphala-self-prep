import { footerConfig } from '../config/footer';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-[#1a0f3c] text-gray-300 pt-14 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-3">
              <p className="font-bold text-white text-lg leading-tight">{footerConfig.brand.name}</p>
              <p className="text-purple-300 text-xs font-medium mt-0.5">{footerConfig.brand.tagline}</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-5">
              {footerConfig.brand.desc}
            </p>
            <div className="text-sm space-y-1.5">
              <a
                href={`mailto:${footerConfig.contact.email}`}
                className="block text-gray-400 hover:text-purple-300 transition-colors"
              >
                {footerConfig.contact.email}
              </a>
              <p className="text-gray-400">{footerConfig.contact.phone}</p>
              <p className="text-gray-500 text-xs">{footerConfig.contact.address}</p>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.exploreLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Student */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Student
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.studentLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Support
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.supportLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Community
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.communityLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 text-sm text-gray-400 hover:text-purple-300 transition-colors"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Saphala Pathshala. All rights reserved.</p>
          <p>Made with dedication for students across India.</p>
        </div>
      </div>
    </footer>
  );
};
