export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  return { valid: true };
}

export function validateMobile(mobile: string): ValidationResult {
  const digitsOnly = mobile.replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    return { valid: false, error: "Please enter a valid 10-digit Indian mobile number." };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  return { valid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match." };
  }
  return { valid: true };
}

export function normalizeIdentifier(identifier: string): { type: "email" | "mobile"; value: string } {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes("@")) {
    return { type: "email", value: trimmed };
  }
  return { type: "mobile", value: trimmed.replace(/\D/g, "") };
}
