import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  marketplaceService,
  type MarketplaceConnection,
  type MarketplaceProviderSlug,
  type ProviderGuide,
  type ReadinessItem,
} from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  provider: MarketplaceProviderSlug;
  connection: MarketplaceConnection | null;
  onUpdated: () => void;
}

const STEPS = ["Pré-requisitos", "Criar app", "Autorizar conta", "Testar"] as const;

export function MarketplaceConnectWizard({ isOpen, onClose, provider, connection, onUpdated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [guide, setGuide] = useState<ProviderGuide | null>(null);
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setAppId(connection?.appId ?? "");
    setAppSecret("");
    void loadGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, provider]);

  const loadGuide = async () => {
    setLoading(true);
    try {
      const data = await marketplaceService.getGuide(provider);
      setGuide(data.guide);
      setReadiness(data.readiness);
    } catch {
      toast({ title: "Erro ao carregar o guia", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast({ title: "Copiado!", description: value });
  };

  const handleSaveCredentials = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      toast({ title: "Preencha App ID e Secret", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await marketplaceService.setCredentials(provider, appId.trim(), appSecret.trim());
      toast({ title: "Credenciais salvas" });
      onUpdated();
      setStep(2);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.response?.data?.error ?? err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorize = async () => {
    setAuthorizing(true);
    try {
      const url = await marketplaceService.authorize(provider);
      // Abre o consentimento OAuth do marketplace; ao voltar, o callback redireciona para o painel.
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Não foi possível iniciar a autorização",
        description: err?.response?.data?.error ?? err?.message,
        variant: "destructive",
      });
      setAuthorizing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await marketplaceService.testConnection(provider);
      toast({
        title: "Conexão OK!",
        description: result.sellerNickname ? `Conta: ${result.sellerNickname}` : undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      toast({
        title: "Falha no teste",
        description: err?.response?.data?.error ?? err?.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const renderReadinessIcon = (status: ReadinessItem["status"]) => {
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "manual") return <Clock className="h-4 w-4 text-amber-600" />;
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  const copyField = (label: string, value: string) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={value} className="text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={() => copy(value)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conectar {guide?.displayName ?? "Marketplace"}</DialogTitle>
          <DialogDescription>
            Siga o passo a passo para integrar sua conta. Os valores que você precisa colar no
            marketplace já estão prontos para copiar.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  idx === step
                    ? "bg-moria-orange text-white"
                    : idx < step
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {idx < step ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-xs ${idx === step ? "font-semibold" : "text-gray-500"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <Separator />

        {loading || !guide ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* STEP 0 — Pré-requisitos */}
            {step === 0 && (
              <div className="space-y-4">
                {guide.hasApprovalGate && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção: aprovação necessária</AlertTitle>
                    <AlertDescription>
                      A {guide.displayName} exige aprovação de acesso à Open Platform, o que pode
                      levar alguns dias. Você pode iniciar agora e concluir quando for aprovado.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <h4 className="font-medium mb-2">Antes de começar, você precisa de:</h4>
                  <ul className="space-y-2">
                    {guide.prerequisites.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-medium">Prontidão da integração</h4>
                  {readiness.map((item) => (
                    <div key={item.key} className="flex items-start gap-2 text-sm">
                      {renderReadinessIcon(item.status)}
                      <div>
                        <span>{item.label}</span>
                        {item.hint && <p className="text-xs text-gray-500">{item.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1 — Criar app */}
            {step === 1 && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(guide.consoleUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir o painel de desenvolvedor da {guide.displayName}
                </Button>

                <ol className="space-y-2">
                  {guide.steps.map((s, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {i + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-gray-600">{s.description}</p>
                          {s.link && (
                            <a
                              href={s.link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-moria-orange text-xs inline-flex items-center gap-1"
                            >
                              {s.link.label} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                <Separator />
                <h4 className="text-sm font-medium">Cole estes valores no painel da {guide.displayName}:</h4>
                {!guide.redirectUri.startsWith("https://") && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>URL sem HTTPS</AlertTitle>
                    <AlertDescription>
                      A {guide.displayName} exige HTTPS na Redirect URI e no webhook. Os valores abaixo
                      estão como <code>http://localhost</code> porque a variável <code>APP_BASE_URL</code>{" "}
                      não está configurada com o domínio público. Em produção, defina{" "}
                      <code>APP_BASE_URL=https://m2centerauto.com.br</code> para que estes valores fiquem
                      corretos.
                    </AlertDescription>
                  </Alert>
                )}
                {copyField("Redirect URI", guide.redirectUri)}
                {copyField("Callback de notificações (webhook)", guide.webhookUrl)}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    {provider === "mercadolivre"
                      ? 'Tópicos de notificação a marcar (campo "Tópicos")'
                      : "Escopos recomendados"}
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {guide.recommendedScopes.map((sc) => (
                      <Badge key={sc} variant="outline">
                        {sc}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />
                <h4 className="text-sm font-medium">Agora cole as credenciais geradas:</h4>
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID / Partner ID</Label>
                  <Input id="appId" value={appId} onChange={(e) => setAppId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appSecret">Secret / Partner Key</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={connection?.hasCredentials ? "•••• (já salvo — preencha para alterar)" : ""}
                  />
                </div>
              </div>
            )}

            {/* STEP 2 — Autorizar */}
            {step === 2 && (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-gray-600">
                  Clique abaixo para autorizar sua conta {guide.displayName}. Você será redirecionado
                  ao marketplace para fazer login e conceder as permissões. Em seguida, volta
                  automaticamente para cá.
                </p>
                <Button onClick={handleAuthorize} disabled={authorizing} className="bg-moria-orange hover:bg-moria-orange/90">
                  {authorizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Conectar minha conta {guide.displayName}
                </Button>
                {connection?.status === "CONNECTED" && (
                  <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Conta já autorizada
                    {connection.sellerNickname ? `: ${connection.sellerNickname}` : ""}
                  </p>
                )}
              </div>
            )}

            {/* STEP 3 — Testar */}
            {step === 3 && (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-gray-600">
                  Vamos confirmar que tudo está funcionando fazendo uma chamada de teste à API da{" "}
                  {guide.displayName}.
                </p>
                <Button onClick={handleTest} disabled={testing}>
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Testar conexão
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Navegação do wizard */}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>
          {step === 0 && <Button onClick={() => setStep(1)}>Continuar</Button>}
          {step === 1 && (
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar e continuar
            </Button>
          )}
          {step === 2 && <Button onClick={() => setStep(3)}>Já autorizei →</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
