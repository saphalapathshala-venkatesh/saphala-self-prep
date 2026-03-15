import { Youtube, Send, MessageCircle, Instagram, Facebook } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CommunityLink = { label: string; icon: LucideIcon; href: string };

export const footerConfig = {
  brand: {
    name: "Saphala Pathshala",
    tagline: "Your Success is Our Focus",
    desc: "Structured learning, smart revision, and exam practice for serious aspirants.",
  },
  contact: {
    email: "support@saphala.in",
    phone: "+91 98765 43210",
    address: "Vijayawada, Andhra Pradesh, India",
  },
  exploreLinks: [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: "Test Series", href: "/testhub" },
    { label: "Ebooks", href: "/learn/lessons" },
    { label: "Flashcards", href: "/learn/flashcards" },
    { label: "PDFs", href: "/learn/pdfs" },
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ],
  studentLinks: [
    { label: "Login", href: "/login" },
    { label: "Sign Up", href: "/register" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Attempts", href: "/dashboard/attempts" },
    { label: "My Profile", href: "/dashboard/profile" },
  ],
  supportLinks: [
    { label: "Contact Us", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
  communityLinks: [
    { label: "YouTube (English + Telugu)", icon: Youtube, href: "#" },
    { label: "YouTube (English + Kannada)", icon: Youtube, href: "#" },
    { label: "Telegram", icon: Send, href: "#" },
    { label: "WhatsApp", icon: MessageCircle, href: "#" },
    { label: "Instagram", icon: Instagram, href: "#" },
    { label: "Facebook", icon: Facebook, href: "#" },
  ] satisfies CommunityLink[],
};
