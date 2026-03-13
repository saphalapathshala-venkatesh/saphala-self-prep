import { footerConfig } from '../config/footer';
import Link from 'next/link';
import Image from 'next/image';

export const Footer = () => {
  return (
    <footer className="bg-[#1a0f3c] text-gray-300 pt-14 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/images/saphala-logo.png"
                alt="Saphala Logo"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="font-bold text-white text-lg">Saphala Pathshala</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-4">
              {footerConfig.about}
            </p>
            <p className="text-sm text-gray-400">
              <span className="text-gray-500">Support: </span>
              <a
                href={`mailto:${footerConfig.contact.email}`}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                {footerConfig.contact.email}
              </a>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white mb-5">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white mb-5">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {footerConfig.legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Socials */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white mb-5">
              Contact
            </h4>
            <address className="not-italic text-sm text-gray-400 space-y-2 mb-6">
              <p>{footerConfig.contact.phone}</p>
              <p>{footerConfig.contact.address}</p>
            </address>
            <h5 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Follow Us
            </h5>
            <div className="flex flex-wrap gap-3">
              {footerConfig.socials.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="text-xs text-gray-400 hover:text-purple-400 transition-colors border border-gray-700 hover:border-purple-500 rounded px-2 py-1"
                >
                  {social.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Saphala Pathshala. All rights reserved.</p>
          <p>Made with dedication for students across India.</p>
        </div>
      </div>
    </footer>
  );
};
