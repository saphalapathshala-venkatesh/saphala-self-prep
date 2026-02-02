"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const data = await response.json();
      router.push(data.redirectTo || "/");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="btn-glossy-secondary px-6 py-2 disabled:opacity-50"
    >
      {isLoggingOut ? "Logging out..." : "Log Out"}
    </button>
  );
}
