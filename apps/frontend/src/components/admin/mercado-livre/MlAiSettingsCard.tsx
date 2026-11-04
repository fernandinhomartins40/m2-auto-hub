import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Progress } from "../../ui/progress";
import { Loader2, Sparkles } from "lucide-react";
import { aiService, type AiSettings } from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { brl } from "./mlLabels";

const MODEL_LABEL: Record<string, string> = {
  "fuse/deepseek-chat": "DeepSeek Flash (recomendado: barato e confere fotos)",
  "fuse/auto": "Automático (o mais barato disponível)",
  "fuse/deepseek-v4-pro": "DeepSeek V4 Pro (textos mais elaborados, custa ~4x mais)",
};

/** Chave, modelo e limite de gasto da IA (fusai). */
export function MlAiSettingsCard() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  useEffect(() => {
    aiService.getSettings().then(setSettings).catch(err =>
      toast({ title: "Erro ao carregar a IA", description: getErrorMessage(err), variant: "destructive" })
    );
  }, [toast]);

  if (!settings) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></CardContent></Card>;
  }

  const set = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => setSettings(prev => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    setBusy("save");
    try {
      const next = await aiService.updateSettings({
        enabled: settings.enabled,
        model: settings.model,
        monthlyBudgetBrl: settings.monthlyBudgetBrl,
        ...(apiKey.trim() && { apiKey: apiKey.trim() }),
      });
      setSettings(next);
      setApiKey("");
      toast({ title: "Configuração da IA salva" });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      const result = await aiService.test();
      toast({ title: result.ok ? "A IA respondeu: tudo certo" : "A IA respondeu, mas de forma inesperada" });
      setSettings(await aiService.getSettings());
    } catch (err) {
      toast({ title: "Falha ao falar com a fusai", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const used = settings.monthlyBudgetBrl > 0 ? Math.min(100, (settings.month.spentBrl / settings.monthlyBudgetBrl) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-purple-600" /> Inteligência artificial</CardTitle>
        <CardDescription>
          Prepara título, ficha técnica, descrição com nomes regionais, roteiro de clip e confere fotos. Usa a fusai (cobrança em reais);
          só dados de produto são enviados, nunca dados de clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch id="ai-enabled" checked={settings.enabled} onCheckedChange={checked => set("enabled", checked)} />
          <Label htmlFor="ai-enabled">IA ligada</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-key">Chave da API fusai</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              placeholder={settings.hasApiKey ? `Cadastrada (${settings.apiKeyMasked})` : "fai_live_..."}
              onChange={event => setApiKey(event.target.value)}
            />
            <p className="text-xs text-gray-500">Chave do projeto em fusai.com.br/app. O saldo é pré-pago: recarregue com Pix em Carteira.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={settings.model} onValueChange={value => set("model", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {settings.models.map(model => <SelectItem key={model} value={model}>{MODEL_LABEL[model] ?? model}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-budget">Limite de gasto por mês (R$)</Label>
            <Input id="ai-budget" type="number" min={0} step="5" value={settings.monthlyBudgetBrl}
              onChange={event => set("monthlyBudgetBrl", Number(event.target.value))} />
            <p className="text-xs text-gray-500">Ao chegar no limite, a IA para até o próximo mês. Cada produto custa poucos centavos.</p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-md bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Gasto neste mês</span>
            <span><strong>{brl(settings.month.spentBrl)}</strong> de {brl(settings.monthlyBudgetBrl)}</span>
          </div>
          <Progress value={used} />
          <p className="text-xs text-gray-500">{settings.month.calls} chamadas · {settings.month.products} produtos preparados</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={test} disabled={busy !== null || !settings.hasApiKey}>
            {busy === "test" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Testar conexão
          </Button>
          <Button onClick={save} disabled={busy !== null}>
            {busy === "save" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar IA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
