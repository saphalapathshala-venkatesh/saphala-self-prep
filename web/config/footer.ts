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
    { label: "Exams", href: "/exams" },
    { label: "Free Demo Content", href: "/courses?type=free" },
    { label: "Complete Prep Packs", href: "/courses?type=complete-pack" },
    { label: "Video Courses", href: "/courses?type=video" },
    { label: "Self Prep Courses", href: "/courses?type=self-prep" },
    { label: "PDF Courses", href: "/courses?type=pdf" },
    { label: "Test Series", href: "/testhub" },
    { label: "Flash Cards", href: "/courses?type=flashcards" },
    { label: "Current Affairs", href: "/courses?type=current-affairs" },
  ],
  studentLinks: [
    { label: "Login", href: "/login" },
    { label: "Sign Up", href: "/register" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Practice Tests", href: "/testhub" },
  ],
  supportLinks: [
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faq" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms" },
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
