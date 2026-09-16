/**
 * Dados tecnicos extraidos da consulta por placa.
 *
 * Vive aqui, e nao no service, para que o parser nao dependa dele - o service
 * e quem importa este modulo.
 */
export interface ParsedPlateData {
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassisNumber: string | null;
  fuel: string | null;
  city: string | null;
  state: string | null;
  displacement: string | null;
  power: string | null;
}

/**
 * Extrai os dados tecnicos do texto da pagina de consulta por placa.
 *
 * A pagina lista os campos como `Label:<TAB>Valor`, uma por linha. Ancorar a
 * regex na linha inteira e essencial: o paragrafo descritivo no topo repete
 * marca, cor e chassi em prosa, e um match solto captura aquele texto em vez
 * do valor da tabela.
 *
 * Usado tanto pela consulta assistida (texto vem do navegador do atendente)
 * quanto pela consulta no servidor, para que as duas produzam o mesmo formato.
 */
export function parsePlacaFipeText(texto: string, plate: string): ParsedPlateData | null {
  const pares: Record<string, string> = {};

  // Texto colado pelo atendente pode vir com quebras do Windows (\r\n).
  for (const linha of texto.split(/\r?\n/)) {
    const match = linha.match(/^\s*([A-Za-zÀ-ÿ ]{2,20}?)\s*:\s*\t?\s*(.+?)\s*$/);

    if (match) {
      const chave = match[1].trim().toLowerCase();
      // Primeira ocorrencia vence: a tabela de dados vem antes das secoes
      // de IPVA e FIPE, que repetem rotulos parecidos.
      if (!(chave in pares)) {
        pares[chave] = match[2].trim();
      }
    }
  }

  const campo = (...chaves: string[]): string | null => {
    for (const chave of chaves) {
      if (pares[chave]) {
        return pares[chave];
      }
    }
    return null;
  };

  const ano = (valor: string | null): number | null => {
    const match = valor?.match(/\d{4}/);
    return match ? Number(match[0]) : null;
  };

  const brand = campo('marca');
  const model = campo('modelo');

  // Sem marca nem modelo a pagina nao trouxe resultado (placa inexistente).
  if (!brand && !model) {
    return null;
  }

  return {
    plate,
    brand,
    model,
    year: ano(campo('ano modelo')) ?? ano(campo('ano')),
    color: campo('cor'),
    chassisNumber: campo('chassi'),
    fuel: campo('combustível', 'combustivel'),
    city: campo('município', 'municipio'),
    state: campo('uf'),
    displacement: campo('cilindrada'),
    power: campo('potencia', 'potência'),
  };
}

/**
 * URL publica da consulta para uma placa normalizada.
 *
 * A placa vai em MAIUSCULAS: a origem responde 404 para o caminho em
 * minusculas e 200 para o mesmo caminho em maiusculas.
 */
export function buildPlacaFipeUrl(plate: string): string {
  return `https://placafipe.com/placa/${plate.toUpperCase()}`;
}
