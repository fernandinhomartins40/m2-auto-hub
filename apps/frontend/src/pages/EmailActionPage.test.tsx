import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import authService from '@/api/authService';
import EmailActionPage from './EmailActionPage';

vi.mock('@/api/authService', () => ({ default: { forgotPassword: vi.fn(), resetPassword: vi.fn(), verifyEmail: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
const show = (route: string) => render(<HelmetProvider><MemoryRouter initialEntries={[route]}><EmailActionPage /></MemoryRouter></HelmetProvider>);

it.each([['/recuperar-senha', false, '/customer-login'], ['/recuperar-senha-admin', true, '/admin-login']] as const)(
  'requests recovery for the correct account type from %s', async (route, admin, login) => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(undefined);
    show(route);
    fireEvent.change(screen.getByLabelText('E-mail da conta'), { target: { value: 'pessoa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith('pessoa@example.com', admin));
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute('href', login);
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta ativa');
  });

it.each([['/redefinir-senha', false], ['/redefinir-senha-admin', true]] as const)(
  'resets the correct account type from %s', async (route, admin) => {
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined);
    const token = 'a'.repeat(64);
    show(`${route}#token=${token}`);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'NovaSenha123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith(token, 'NovaSenha123!', 'NovaSenha123!', admin));
    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada');
  });

it('rejects a reset without a token before sending a request', async () => {
  show('/redefinir-senha-admin');
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha123!' } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'NovaSenha123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido');
  expect(authService.resetPassword).not.toHaveBeenCalled();
});
