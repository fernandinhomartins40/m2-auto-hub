import { useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  PlugZap,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import settingsService from '@/api/settingsService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export interface PlateLookupSectionProps {
  enabled: boolean;
  bearerToken: string;
  deviceToken: string;
  /** Indica que já existe um token salvo, mesmo sem conhecê-lo. */
  bearerTokenSet: boolean;
  deviceTokenSet: boolean;
  onChange: (
    field: 'plateLookupEnabled' | 'plateLookupBearerToken' | 'plateLookupDeviceToken',
    value: string | boolean
  ) => void;
}

const STEPS = [
  {
    title: 'Crie uma conta',
    body: (
      <>
        Acesse{' '}
        <a
          href="https://app.apibrasil.io"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-moria-orange underline underline-offset-2"
        >
          app.apibrasil.io
          <ExternalLink className="ml-1 inline h-3 w-3" />
        </a>{' '}
        e cadastre-se.
      </>
    ),
  },
  {
    title: 'Contrate um plano com consulta de placa',
    body: (
      <>
        A consulta por placa exige plano pago — em agosto de 2026, o{' '}
        <strong>Data Plus</strong> a R$ 384/mês. Confirme os valores no site antes de
        contratar.
      </>
    ),
  },
  {
    title: 'Copie os dois tokens',
    body: (
      <>
        Em <strong>Minhas APIs</strong>, copie o <strong>Bearer Token</strong> e o{' '}
        <strong>Device Token</strong> e cole nos campos abaixo.
      </>
    ),
  },
];

export function PlateLookupSection({
  enabled,
  bearerToken,
  deviceToken,
  bearerTokenSet,
  deviceTokenSet,
  onChange,
}: PlateLookupSectionProps) {
  const [testPlate, setTestPlate] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
    sample?: { brand: string | null; model: string | null; year: number | null; color: string | null };
  } | null>(null);

  const hasCredentials = Boolean((bearerToken || bearerTokenSet) && (deviceToken || deviceTokenSet));

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await settingsService.testPlateLookup({
        bearerToken: bearerToken || undefined,
        deviceToken: deviceToken || undefined,
        plate: testPlate.trim() || undefined,
      });

      setTestResult(result);

      if (result.connected) {
        toast.success('Conexão bem-sucedida');
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Não foi possível testar a conexão';
      setTestResult({ connected: false, message });
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Consulta de Placa
            </CardTitle>
            <CardDescription>
              Preenche marca, modelo e ano do veículo automaticamente a partir da placa.
            </CardDescription>
          </div>
          {hasCredentials ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Tokens configurados
            </Badge>
          ) : (
            <Badge variant="outline">Não configurado</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Como funciona */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              A consulta acontece em camadas, e as duas primeiras são{' '}
              <strong>gratuitas</strong>:
            </p>
            <ol className="ml-4 list-decimal space-y-0.5 text-sm">
              <li>
                <strong>Base própria da oficina</strong> — placa já conhecida responde na
                hora, sem custo.
              </li>
              <li>
                <strong>Consulta assistida</strong> — o atendente abre a consulta no próprio
                navegador e o sistema guarda o resultado.
              </li>
              <li>
                <strong>Consulta automática no servidor</strong> — tentada quando a assistida
                não resolve.
              </li>
              <li>
                <strong>API paga</strong> (abaixo) — último recurso, opcional.
              </li>
            </ol>
            <p className="text-muted-foreground">
              Cada placa consultada fica salva: da segunda vez em diante ela não consome
              nenhuma consulta. Sem configurar nada aqui, o sistema já funciona pelas
              camadas gratuitas.
            </p>
          </AlertDescription>
        </Alert>

        {/* Passo a passo */}
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-1 text-sm font-semibold">
            API paga (opcional) — como obter os tokens
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Só é necessária se você quiser um quarto nível de garantia. As camadas
            gratuitas atendem a maioria dos casos.
          </p>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moria-orange text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Separator />

        {/* Ativação */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="plate-lookup-enabled">Ativar consultas externas</Label>
            <p className="text-sm text-muted-foreground">
              Liga as camadas 2 a 4. Quando desligado, apenas a base própria da oficina
              é usada.
            </p>
          </div>
          <Switch
            id="plate-lookup-enabled"
            checked={enabled}
            onCheckedChange={(checked) => onChange('plateLookupEnabled', checked)}
          />
        </div>

        {/* Tokens */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="plate-bearer-token">Bearer Token</Label>
            <PasswordInput
              id="plate-bearer-token"
              value={bearerToken}
              onChange={(e) => onChange('plateLookupBearerToken', e.target.value)}
              placeholder={bearerTokenSet ? '•••••• (salvo)' : 'Cole o Bearer Token aqui'}
              autoComplete="off"
            />
            {bearerTokenSet && !bearerToken && (
              <p className="text-xs text-muted-foreground">
                Já existe um token salvo. Preencha apenas para substituí-lo.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate-device-token">Device Token</Label>
            <PasswordInput
              id="plate-device-token"
              value={deviceToken}
              onChange={(e) => onChange('plateLookupDeviceToken', e.target.value)}
              placeholder={deviceTokenSet ? '•••••• (salvo)' : 'Cole o Device Token aqui'}
              autoComplete="off"
            />
            {deviceTokenSet && !deviceToken && (
              <p className="text-xs text-muted-foreground">
                Já existe um token salvo. Preencha apenas para substituí-lo.
              </p>
            )}
          </div>
        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Os tokens são gravados criptografados e nunca são exibidos de volta nesta tela.
            Lembre-se de clicar em <strong>Salvar Configurações</strong> no fim da página.
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Teste */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="plate-test">Testar conexão</Label>
            <p className="text-sm text-muted-foreground">
              Informe uma placa real para conferir se os tokens funcionam. O teste não
              salva nada.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="plate-test"
              className="uppercase sm:max-w-[200px]"
              placeholder="ABC1D23"
              value={testPlate}
              onChange={(e) => setTestPlate(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !hasCredentials}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <PlugZap className="mr-2 h-4 w-4" />
                  Testar conexão
                </>
              )}
            </Button>
          </div>

          {!hasCredentials && (
            <p className="text-xs text-muted-foreground">
              Preencha os dois tokens para habilitar o teste.
            </p>
          )}

          {testResult && (
            <Alert variant={testResult.connected ? 'default' : 'destructive'}>
              {testResult.connected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p>{testResult.message}</p>
                {testResult.sample && (
                  <p className="mt-1 font-medium">
                    {[
                      testResult.sample.brand,
                      testResult.sample.model,
                      testResult.sample.year,
                      testResult.sample.color,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
