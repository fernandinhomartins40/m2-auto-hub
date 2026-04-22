export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrength {
  score: number; // 0-5
  label: 'muito fraca' | 'fraca' | 'média' | 'forte' | 'muito forte';
  requirements: PasswordRequirements;
  color: string;
  percentage: number;
}

const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/;

export function validatePassword(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: SPECIAL_CHARS_REGEX.test(password),
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const requirements = validatePassword(password);

  // Calculate score based on requirements met
  let score = 0;
  if (requirements.minLength) score++;
  if (requirements.hasUppercase) score++;
  if (requirements.hasLowercase) score++;
  if (requirements.hasNumber) score++;
  if (requirements.hasSpecial) score++;

  // Determine label and color
  let label: PasswordStrength['label'];
  let color: string;
  let percentage: number;

  if (score === 0) {
    label = 'muito fraca';
    color = 'bg-red-500';
    percentage = 0;
  } else if (score <= 2) {
    label = 'fraca';
    color = 'bg-red-500';
    percentage = 20;
  } else if (score === 3) {
    label = 'média';
    color = 'bg-yellow-500';
    percentage = 50;
  } else if (score === 4) {
    label = 'forte';
    color = 'bg-blue-500';
    percentage = 75;
  } else {
    label = 'muito forte';
    color = 'bg-green-500';
    percentage = 100;
  }

  return {
    score,
    label,
    requirements,
    color,
    percentage,
  };
}

export function isPasswordStrong(password: string): boolean {
  const requirements = validatePassword(password);
  return Object.values(requirements).every(req => req === true);
}

export function getPasswordErrorMessage(password: string): string | null {
  const requirements = validatePassword(password);

  if (!requirements.minLength) {
    return 'A senha deve ter pelo menos 8 caracteres';
  }
  if (!requirements.hasUppercase) {
    return 'A senha deve conter pelo menos uma letra maiúscula';
  }
  if (!requirements.hasLowercase) {
    return 'A senha deve conter pelo menos uma letra minúscula';
  }
  if (!requirements.hasNumber) {
    return 'A senha deve conter pelo menos um número';
  }
  if (!requirements.hasSpecial) {
    return 'A senha deve conter pelo menos um caractere especial (!@#$%^&*...)';
  }

  return null;
}
