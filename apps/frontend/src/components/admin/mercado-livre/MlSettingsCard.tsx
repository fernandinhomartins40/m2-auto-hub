import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Loader2 } from "lucide-react";
import { mlPanelService, type MlStoreSettings, type MlListingType, type MlWarrantyType } from "@/api/marketplaceService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { LISTING_TYPE_LABEL } from "./mlLabels";

const WARRANTIES: MlWarrantyType[] = ["Garantia do vendedor", "Garantia de fábrica", "Sem garantia"];

/** Regras padrão que valem para todos os produtos sem regra própria. */
export function MlSettingsCard() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<MlStoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mlPanelService.getSettings().then(setSettings).catch(err =>
      toast({ title: "Erro ao carregar regras", description: getErrorMessage(err), variant: "destructive" })
    );
  }, [toast]);

  if (!settings) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  const set = <K extends keyof MlStoreSettings>(key: K, value: MlStoreSettings[K]) =>
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    setSaving(true);
    try {
      setSettings(await mlPanelService.updateSettings(settings));
      toast({ title: "Regras salvas", description: "Os anúncios publicados recebem as novas regras em instantes." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preço e anúncio</CardTitle>
          <CardDescription>Valem para todos os produtos que não tiverem uma regra própria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ml-markup">Acréscimo sobre o preço do site (%)</Label>
            <Input
              id="ml-markup"
              type="number"
              step="0.5"
              value={settings.markupPercent}
              onChange={event => set("markupPercent", Number(event.target.value))}
            />
            <p className="text-xs text-gray-500">
              O Mercado Livre cobra de 11% a 19% por venda. Exemplo: com 15%, um produto de R$ 100,00 no site sai por R$ 115,00 no Mercado Livre.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de anúncio</Label>
            <Select value={settings.listingTypeId} onValueChange={value => set("listingTypeId", value as MlListingType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LISTING_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">O tipo vale para anúncios novos. Os já publicados mantêm o tipo escolhido na publicação.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Garantia</Label>
              <Select value={settings.warrantyType} onValueChange={value => set("warrantyType", value as MlWarrantyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARRANTIES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ml-warranty-days">Prazo da garantia (dias)</Label>
              <Input
                id="ml-warranty-days"
                type="number"
                min={0}
                disabled={settings.warrantyType === "Sem garantia"}
                value={settings.warrantyDays}
                onChange={event => set("warrantyDays", Number(event.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horários de despacho</CardTitle>
          <CardDescription>Usados para avisar quando vender sem estoque é arriscado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ml-cutoff">Despacho até</Label>
              <Input id="ml-cutoff" type="time" value={settings.dispatchCutoff} onChange={event => set("dispatchCutoff", event.target.value)} />
              <p className="text-xs text-gray-500">Horário limite para levar o pacote à agência no mesmo dia.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ml-supplier">Fornecedor entrega até</Label>
              <Input id="ml-supplier" type="time" value={settings.supplierDeadline} onChange={event => set("supplierDeadline", event.target.value)} />
              <p className="text-xs text-gray-500">Até que horas o fornecedor entrega na loja o que foi pedido de manhã.</p>
            </div>
          </div>
          {settings.supplierDeadline >= settings.dispatchCutoff && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              O fornecedor entrega no mesmo horário ou depois do despacho. Nesse caso, produtos do fornecedor devem usar
              "Sob encomenda" com pelo menos 1 dia, para não atrasar o envio e perder reputação.
            </p>
          )}
          <p className="text-xs text-gray-500">
            O prazo de despacho de cada venda é definido pelo Mercado Livre. Esses horários servem para o painel avisar
            se a regra "loja + fornecedor no mesmo dia" é segura.
          </p>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar regras
        </Button>
      </div>
    </div>
  );
}
