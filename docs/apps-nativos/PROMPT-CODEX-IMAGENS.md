# Prompt para o Codex: imagens das lojas

Este arquivo é o prompt a colar no Codex. A seção "Capturas disponíveis" é preenchida pelo agente de capturas (A10 em [03-ORQUESTRACAO-AGENTES.md](03-ORQUESTRACAO-AGENTES.md)) quando o app estiver pronto. Não rode antes disso.

---

Preciso das imagens de divulgação de dois aplicativos para a Google Play e a App Store. Os apps são da M2 Center Auto, uma oficina e loja de autopeças em Palmital, no Paraná:

- **M2 Center Auto** (pasta `apps/mobile_cliente`): app do cliente. Ele acompanha revisões, aprova orçamentos, vê pedidos e cadastra veículos.
- **M2 Mecânico** (pasta `apps/mobile_mecanico`): app da equipe da oficina. Fila de revisões, checklist do veículo, orçamento e ordens de serviço.

As capturas de tela reais dos dois apps já estão no repositório. Seu trabalho é montar as imagens finais das lojas a partir delas.

## A regra mais importante

**A tela do app não pode ser redesenhada.** As duas lojas exigem que a captura mostre o app como ele é, e recusam imagem em que a interface foi recriada. Uma tentativa anterior usou geração de imagem sobre as capturas e a ferramenta alterou textos e elementos; esse material foi descartado.

Por isso, a montagem é feita por código (Pillow ou ImageMagick): a captura entra como está, só redimensionada na proporção, sem recorte de conteúdo, sem filtro e sem retoque. Geração de imagem serve apenas para o fundo e para elementos decorativos em volta, nunca para a área da tela.

## Identidade visual

- Azul da marca: use a cor de `apps/mobile_cliente/android/app/src/main/res/values/colors.xml` (`brand`) e as cores de `packages/mobile_core/lib/src/theme/app_theme.dart`.
- Fundo: azul-marinho escuro com luz azul discreta, ambiente de oficina moderna, sem pessoas e sem carros de marca reconhecível.
- Fontes: Rajdhani nos títulos e Inter no texto. Os arquivos estão em `packages/mobile_core/assets/fonts/`.
- Logo e ícone: use os arquivos que já existem em `apps/mobile_cliente/store/` e `apps/mobile_mecanico/store/` (`icone-512.png`). Não redesenhe a logo.

## O que gerar

Para cada um dos dois apps, salve em `apps/mobile_<app>/store/final/`:

| Pasta | Arquivo | Tamanho | Formato |
|---|---|---|---|
| `google-play/` | `icone-512.png` | 512 × 512 | PNG 32 bits, até 1 MB |
| `google-play/` | `destaque-1024x500.png` | 1024 × 500 | PNG 24 bits, sem transparência |
| `google-play/telefone/` | `01-...png` a `08-...png` | 1080 × 1920 | PNG 24 bits, sem transparência |
| `app-store/` | `icone-1024.png` | 1024 × 1024 | PNG sem transparência, cantos retos |
| `app-store/iphone-6.9/` | `01-...png` a `08-...png` | 1320 × 2868 | PNG 24 bits, sem transparência |

Cada imagem de captura tem três partes:

1. Fundo da marca ocupando a imagem inteira.
2. Uma frase curta no topo, em português, com no máximo seis palavras.
3. A captura real abaixo, com cantos arredondados e sombra leve, inteira e legível.

Use as capturas de `store/capturas/android/` nas imagens da Google Play e as de `store/capturas/ios/` nas da App Store. Não misture: a App Store recusa imagem com barra de status ou botões do Android.

Não desenhe moldura de aparelho. Se quiser sugerir um celular, use só o contorno arredondado, sem imitar um modelo específico.

### Frases sugeridas

Cliente:

| Tela | Frase |
|---|---|
| Login | Sua oficina no celular |
| Início | Tudo do seu carro em um lugar |
| Pedidos | Acompanhe suas compras |
| Orçamento | Aprove orçamentos na hora |
| Veículos | Seus veículos sempre à mão |
| Revisão | Veja o checklist completo |
| Ajuda | Fale com a oficina |
| Benefícios | Cupons e favoritos |

Mecânico:

| Tela | Frase |
|---|---|
| Login | O dia da oficina no celular |
| Fila de revisões | Sua fila de trabalho |
| Checklist | Checklist item por item |
| Orçamento | Do problema ao orçamento |
| Ordens de serviço | Ordens de serviço em dia |
| Detalhe da OS | Inicie e conclua com um toque |
| Leitura de placa | Fotografe a placa e encontre o cliente |
| Perfil | Acompanhe seu desempenho |

### Gráfico de destaque (1024 × 500)

Logo à esquerda, o nome do app e uma frase: "Área do Cliente" para o cliente, "Área do Mecânico" para o mecânico. À direita, uma ou duas capturas reais inclinadas levemente. Mantenha o conteúdo importante longe das bordas, porque a Play corta as laterais em alguns lugares.

### Ícones

Parta do `icone-512.png` existente de cada app. Para a App Store, amplie para 1024 × 1024 com fundo sólido cobrindo a imagem inteira, sem cantos arredondados (a Apple arredonda sozinha) e sem transparência. Se a ampliação perder nitidez, redesenhe o fundo e reaplique o símbolo original, sem alterar o símbolo.

## O que não pode aparecer

- Preço, "grátis", "nº 1", "melhor", selo de prêmio ou nota de avaliação.
- Nome ou logo de outra empresa, incluindo Google, Apple, Android, iPhone e marcas de carro.
- "Baixe na Google Play", "Disponível na App Store" ou qualquer menção a loja.
- Dado de pessoa real. As capturas usam contas de demonstração; não acrescente nomes, telefones ou placas.
- Função que o app não tem.
- Texto em outro idioma que não o português do Brasil.

## Conferência

Ao terminar, escreva e rode um script que verifique cada arquivo e mostre uma tabela com: caminho, largura, altura, se tem canal alfa e tamanho em KB. O script deve falhar se alguma imagem estiver fora do tamanho da tabela, tiver transparência onde não pode, ou se o ícone da Play passar de 1 MB.

Depois abra cada imagem final e compare com a captura original: os textos da tela têm de ser idênticos. Liste qualquer imagem em que você não tenha certeza.

Por fim, apague as pastas `apps/mobile_cliente/store/artes-ia/` e `apps/mobile_mecanico/store/artes-ia/` e atualize o `README.md` de cada pasta `store/` descrevendo o que há em `final/`.

## Capturas disponíveis

<!-- Preenchido pelo agente de capturas. Uma linha por arquivo: caminho, tela, tamanho. -->

Ainda não preenchido. Sem esta lista, pare e avise que as capturas ainda não foram feitas.
