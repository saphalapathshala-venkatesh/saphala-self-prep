import { footerConfig } from '../config/footer';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div>
          <h4 className="text-lg font-bold text-[#2D1B69] mb-4">About Us</h4>
          <p className="text-gray-600 leading-relaxed">{footerConfig.about}</p>
        </div>
        <div>
          <h4 className="text-lg font-bold text-[#2D1B69] mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><Link href="/" className="text-gray-600 hover:text-[#2D1B69]">Home</Link></li>
            <li><Link href="/courses" className="text-gray-600 hover:text-[#2D1B69]">Courses</Link></li>
            <li><Link href="/products" className="text-gray-600 hover:text-[#2D1B69]">Products</Link></li>
            <li><Link href="/contact" className="text-gray-600 hover:text-[#2D1B69]">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-[#2D1B69] mb-4">Follow Us</h4>
          <div className="flex flex-wrap gap-4">
            {footerConfig.socials.map((social) => (
              <Link key={social.name} href={social.href} className="text-gray-600 hover:text-[#2D1B69]">
                {social.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-lg font-bold text-[#2D1B69] mb-4">Contact Details</h4>
          <address className="not-italic text-gray-600 space-y-2">
            <p>{footerConfig.contact.email}</p>
            <p>{footerConfig.contact.phone}</p>
            <p>{footerConfig.contact.address}</p>
          </address>
        </div>
      </div>
      <div className="container mx-auto px-4 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Saphala Self Prep. All rights reserved.
      </div>
    </footer>
  );
};
