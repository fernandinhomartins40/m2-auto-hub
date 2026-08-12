/**
 * Mensagens do backend (em inglês) traduzidas para o texto exibido ao usuário.
 */
const messageTranslations: Record<string, string> = {
  'Current password is incorrect': 'Senha atual incorreta',
  'Current password is required to change the email':
    'Informe a senha atual para alterar o email',
  'Email already in use': 'Este email já está em uso',
  'Email already registered': 'Este email já está cadastrado',
  'Phone already in use': 'Este telefone já está em uso',
  'CPF already in use': 'Este CPF já está em uso',
  'Invalid email format': 'Formato de email inválido',
  'Validation failed': 'Verifique os dados informados',
  'Name must be at least 3 characters': 'O nome deve ter pelo menos 3 caracteres',
  'Phone must be 10 or 11 digits': 'O telefone deve ter 10 ou 11 dígitos',
  'CPF must be 11 digits': 'O CPF deve ter 11 dígitos',
  'Invalid birth date': 'Data de nascimento inválida',
  'Password must be at least 8 characters': 'A senha deve ter pelo menos 8 caracteres',
  'Passwords do not match': 'As senhas não coincidem',
};

/** Traduz uma mensagem conhecida do backend; devolve a original se não houver tradução. */
export function translateApiMessage(message: string): string {
  return messageTranslations[message] || message;
}

const translate = translateApiMessage;

/**
 * Extrai a mensagem de erro de uma resposta `fetch` da API.
 *
 * O middleware de erro responde com `{ success: false, error: string }`, e nos
 * erros de validação do Zod a mensagem útil fica em `details[].message` —
 * `error` traz apenas "Validation failed".
 */
export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.details?.[0]?.message;

    if (typeof detail === 'string' && detail) {
      return translate(detail);
    }

    if (typeof body?.error === 'string' && body.error) {
      return translate(body.error);
    }

    if (typeof body?.message === 'string' && body.message) {
      return translate(body.message);
    }

    return fallback;
  } catch {
    return fallback;
  }
}
