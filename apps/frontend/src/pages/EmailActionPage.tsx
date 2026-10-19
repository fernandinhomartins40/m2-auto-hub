import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authService from '@/api/authService';
import { isPasswordStrong } from '@/lib/passwordUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailActionPage() {
  const { pathname, hash } = useLocation();
  const verify = pathname === '/confirmar-email';
  const admin = pathname.endsWith('-admin');
  const reset = pathname.startsWith('/redefinir-senha');
  const [token] = useState(() => new URLSearchParams(hash.slice(1)).get('token') || '');
  useEffect(() => { window.history.replaceState(null, '', window.location.pathname); }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const title = verify ? 'Confirmar e-mail' : reset ? 'Redefinir senha' : 'Recuperar senha';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if ((reset || verify) && !token) { setError('Link inválido. Solicite um novo e-mail.'); return; }
    if (reset && (!isPasswordStrong(password) || password !== confirmation)) {
      setError('Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo. As senhas devem ser iguais.'); return;
    }
    setBusy(true);
    try {
      if (verify) await authService.verifyEmail(token);
      else if (reset) await authService.resetPassword(token, password, confirmation, admin);
      else await authService.forgotPassword(email, admin);
      setDone(true);
    } catch {
      setError(reset || verify ? 'Não foi possível concluir. O link pode ter expirado ou já ter sido usado. Solicite um novo e-mail.' : 'Não foi possível solicitar o e-mail. Tente novamente em alguns minutos.');
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <Helmet><title>{title} | M2 Auto Center</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <Card className="w-full max-w-md"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>
      {!verify && <p className="mb-4 text-sm text-muted-foreground">{admin ? 'Acesso da loja, oficina e equipe. Informe o e-mail cadastrado na sua conta de trabalho.' : 'Acesso do cliente. Use o e-mail informado no cadastro.'}</p>}
      {done ? <p role="status">{verify ? 'E-mail confirmado com sucesso.' : reset ? 'Senha alterada. Entre com sua nova senha.' : 'Se houver uma conta ativa com este e-mail, enviaremos um link de recuperação. Verifique também a pasta de spam.'}</p> :
        <form onSubmit={submit} className="space-y-4">
          {verify ? <p>Confirme que este endereço de e-mail pertence a você.</p> : reset ? <>
            <Label htmlFor="new-password">Nova senha</Label><PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} />
            <p className="text-sm text-muted-foreground">Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.</p>
            <Label htmlFor="confirm-password">Confirmar senha</Label><PasswordInput id="confirm-password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required maxLength={128} />
          </> : <><Label htmlFor="recovery-email">E-mail da conta</Label><Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></>}
          {error && <p role="alert" className="text-red-600">{error}</p>}
          <Button className="w-full" disabled={busy} type="submit">{busy ? 'Aguarde...' : verify ? 'Confirmar meu e-mail' : reset ? 'Salvar nova senha' : 'Enviar link de recuperação'}</Button>
        </form>}
      <Link className="block mt-6 text-center underline" to={admin ? '/admin-login' : '/customer-login'}>Voltar para entrar</Link>
      {reset && !done && <Link className="block mt-3 text-center underline" to={admin ? '/recuperar-senha-admin' : '/recuperar-senha'}>Solicitar novo link</Link>}
    </CardContent></Card>
  </main>;
}
