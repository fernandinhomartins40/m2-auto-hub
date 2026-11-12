# Apps nativos Cliente e Mecânico: plano

Base: [01-ANALISE.md](01-ANALISE.md). Os IDs entre parênteses (B-01, A-03, T-02...) apontam para os problemas descritos lá.

## Objetivo

Publicar **M2 Center Auto** (cliente) e **M2 Mecânico** na Google Play e na App Store, com:

- as mesmas telas e funções do PWA que será aposentado;
- conformidade com as políticas das duas lojas;
- todos os builds de Android e iOS feitos pelo GitHub Actions, em repositório público.

## Decisões já tomadas neste plano

Cada uma pode ser trocada pelo dono antes de começar. Se nada for dito, vale o que está aqui.

| Tema | Decisão | Motivo |
|---|---|---|
| iPad | Só iPhone na primeira versão | Dispensa capturas e ajuste de layout para iPad. |
| App do mecânico na Apple | Distribuição não listada | A regra 3.2 não aceita app interno na loja pública. |
| App do mecânico na Google | Público, com conta de teste para o revisor | A Play aceita; já está documentado assim. |
| Assinatura iOS no CI | Chave de API do App Store Connect com assinatura automática | Um secret só, sem certificado que vence para renovar à mão. |
| Envio às lojas | O CI envia para TestFlight e para o teste interno da Play; a promoção para produção é manual | O primeiro envio à Play precisa ser manual de qualquer forma, e a revisão final fica com uma pessoa. |
| PDF | Gerar no servidor e abrir no app | O PWA monta o HTML no navegador; repetir isso em Dart seria manter dois geradores. |
| Exclusão de conta | O servidor executa a anonimização | As lojas exigem exclusão real, não só um pedido. |
| Push | Fora desta versão | Não existia no PWA e não é exigência das lojas. |

## Fases

A ordem importa: cada fase depende da anterior, exceto onde está indicado que pode correr em paralelo.

### Fase 0: preparação do dono

Sem isto as fases 2, 5 e 6 não terminam. Pode começar já, em paralelo com a fase 1.

| # | Tarefa | Resultado |
|---|---|---|
| 0.1 | Cadastrar no GitHub os secrets de keystore dos dois apps, a partir dos arquivos locais (B-02). Guardar cópia em cofre. | `ANDROID_CLIENTE_KEYSTORE_BASE64`, `ANDROID_CLIENTE_KEYSTORE_PASSWORD`, `ANDROID_MECANICO_KEYSTORE_BASE64`, `ANDROID_MECANICO_KEYSTORE_PASSWORD` |
| 0.2 | Ativar a conta Apple Developer e criar os dois apps no App Store Connect (A-02). | IDs `br.com.m2centerauto.cliente` e `br.com.m2centerauto.mecanico` registrados |
| 0.3 | Criar a chave de API do App Store Connect com papel de administrador e cadastrar no GitHub. | `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`, `APPLE_TEAM_ID` |
| 0.4 | Criar as contas de demonstração em produção com dados fictícios (A-11). | Um cliente e um mecânico com dados para todas as telas; credenciais nos secrets `DEMO_CLIENTE_LOGIN`, `DEMO_CLIENTE_SENHA`, `DEMO_MECANICO_LOGIN`, `DEMO_MECANICO_SENHA` |
| 0.5 | Informar o tipo da conta do Play Console (G-03). | Se pessoal: lista de 12 testadores |
| 0.6 | Criar no GitHub o ambiente `release` com aprovação obrigatória do dono. | Jobs de assinatura só rodam depois do clique de aprovação |

### Fase 1: corrigir o que quebra hoje

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 1.1 | Trocar a URL padrão do workflow para `https://www.m2centerauto.com.br/api`. Fazer o build falhar se a URL informada responder com redirecionamento. | B-01 | AAB do CI faz login em produção |
| 1.2 | Tratar erro ao abrir a câmera no app do mecânico: permissão negada, câmera ausente. Mostrar mensagem e manter a opção de digitar a placa. | A-06 | Negar a câmera não trava nem fecha a tela |
| 1.3 | Atualizar o Flutter para a versão estável que atende ao Xcode exigido pela Apple. Ajustar AGP e Gradle para a API 36. Rodar `flutter analyze` e `flutter test` nos três pacotes. | B-04, B-07 | CI verde nos três pacotes com a versão nova |

### Fase 2: iOS dos dois apps

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 2.1 | Gerar a pasta `ios/` em cada app, com ID do pacote, nome de exibição, idioma `pt-BR`, alvo só iPhone e versão mínima do iOS que o Flutter escolhido pede. | A-01, A-10 | `flutter build ios --no-codesign` passa no runner macOS |
| 2.2 | Ícone 1024 sem transparência e tela de abertura com a cor da marca, a partir dos mesmos arquivos do Android. | A-01 | Ícone e abertura corretos no simulador |
| 2.3 | `Info.plist`: textos de uso da câmera e da galeria no mecânico; `ITSAppUsesNonExemptEncryption = false` nos dois; esquemas consultados pelo `url_launcher` se o código usar `canLaunchUrl`. | A-03, A-07 | Envio ao TestFlight sem aviso de chave ausente |
| 2.4 | `PrivacyInfo.xcprivacy` do app, coerente com o que os plugins já declaram. | A-08 | Arquivo presente no pacote |
| 2.5 | Limpar o token do Keychain na primeira abertura depois de instalar. | A-09 | Reinstalar o app cai no login |
| 2.6 | Conferir no simulador de iPhone todas as telas: áreas seguras (entalhe e barra inferior), teclado, gesto de voltar, rolagem. | — | Nenhuma tela cortada ou sobreposta |

### Fase 3: paridade com o PWA

Pode correr em paralelo com a fase 2. Cliente e mecânico são independentes entre si.

**Cliente**

| # | Tarefa | Problema |
|---|---|---|
| 3.1 | Cadastro e edição de veículo com marca, modelo e ano vindos da FIPE, como no PWA. | T-01 |
| 3.2 | Exportar orçamento em PDF. | T-02 |
| 3.3 | Reenviar e-mail de confirmação no perfil. | T-03 |
| 3.4 | "Baixar meus dados" baixa o arquivo e abre o compartilhamento do sistema. | G-06, T-04 |
| 3.5 | Lista dos pedidos de privacidade já feitos, com situação e prazo. | T-05 |
| 3.6 | Botões de WhatsApp nos pedidos. | T-06 |
| 3.7 | Favoritos: limpar tudo, compartilhar, exportar. | T-07 |
| 3.8 | Exportar revisão em PDF, se o cliente tiver esse botão no PWA. | T-08 |

**Mecânico**

| # | Tarefa | Problema |
|---|---|---|
| 3.9 | Cancelar revisão. | T-09 |
| 3.10 | Exportar revisão em PDF. | T-10 |
| 3.11 | Lista de notificações, se o PWA do mecânico tiver. | T-11 |

**Conferência final de paridade**

| # | Tarefa |
|---|---|
| 3.12 | Abrir cada tela do PWA em largura de celular e a tela nativa correspondente, e registrar em `docs/apps-nativos/PARIDADE.md` toda diferença de conteúdo, texto, ordem ou ação. Corrigir as que não forem decisão documentada. |

### Fase 4: backend e site

Pode correr em paralelo com as fases 2 e 3.

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 4.1 | Exclusão de conta executada pelo servidor: ao pedir, a conta é desativada na hora e anonimizada no prazo; registros fiscais ficam pelo prazo legal. O app encerra a sessão depois do pedido. Com teste automatizado. | G-01, A-05, S-01 | Pedir exclusão no app impede novo login e os dados somem ou ficam anônimos no prazo |
| 4.2 | Rotas de PDF de orçamento e de revisão para o cliente e para o mecânico, se ainda não existirem com autenticação por Bearer. | T-02, T-08, T-10 | App baixa o PDF autenticado |
| 4.3 | Versão mínima do app: a API informa o menor build aceito; o app antigo mostra "Atualize o app" com link da loja. | S-02 | Build abaixo do mínimo vê o aviso |
| 4.4 | Aviso de privacidade: citar iPhone e Android, atualizar a data e a versão da política. | A-12 | Página no ar com o texto novo |
| 4.5 | Depois da publicação: trocar o convite de instalar o PWA pelos selos das lojas e remover manifest, `sw.js` e a tela de configuração de PWA. Só com confirmação do dono, porque desliga o PWA para quem já instalou. | S-03 | Site não oferece mais instalação |

### Fase 5: GitHub Actions

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 5.1 | Um workflow de validação para push e pull request: `analyze` e `test` nos três pacotes. Sem acesso a secrets. | B-06 | PR de fork roda sem expor nada |
| 5.2 | Um workflow de release manual, com escolha de app e de plataforma. Android gera AAB assinado. iOS gera IPA assinado no runner macOS. Os dois dentro do ambiente `release`. | B-02, B-03 | AAB e IPA dos dois apps saem como artefato |
| 5.3 | Envio automático: IPA para o TestFlight; AAB para o teste interno da Play quando houver conta de serviço. O primeiro AAB de cada app é enviado à mão. | — | Build aparece no TestFlight |
| 5.4 | Endurecer: actions fixadas por commit, `permissions: contents: read`, `concurrency`, nenhum `pull_request_target`, secrets só em jobs do ambiente `release`. | B-05 | Revisão do YAML sem pendência |
| 5.5 | Número de build único para as duas plataformas, derivado do mesmo contador. | B-08 | Mesmo número no AAB e no IPA do mesmo commit |
| 5.6 | Atualizar `docs/APPS-ANDROID.md` (passa a cobrir iOS) com o passo a passo de release e a lista de secrets. | — | Documento reflete o fluxo real |

### Fase 6: conformidade e teste

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 6.1 | Testar no emulador Android: API 36, páginas de 16 KB, navegação por gestos e por 3 botões, paisagem, fonte grande, tela de tablet. | G-04, G-05 | Sem corte, sobreposição ou travamento |
| 6.2 | Roteiro completo de uso com as contas de demonstração nos dois apps e nas duas plataformas, incluindo sem internet e sessão expirada. | — | Roteiro registrado em `docs/apps-nativos/TESTE.md` com resultado por item |
| 6.3 | Conferir cada item marcado como **(confirmar)** na análise contra a fonte oficial e registrar a data da conferência. | — | Tabela preenchida em `docs/apps-nativos/CONFORMIDADE.md` |
| 6.4 | Escrever `docs/APP-STORE-CONFIGURACAO.md`, equivalente ao documento da Play: privacidade do app, classificação etária, conta de demonstração, notas para o revisor, pedido de distribuição não listada do mecânico. | A-04, A-08, A-11 | Documento pronto para copiar no App Store Connect |
| 6.5 | Revisar `docs/PLAY-STORE-CONFIGURACAO.md` com as mudanças (exclusão real, download de dados). | G-01 | Documento coerente com o app |

### Fase 7: capturas e imagens das lojas

Só começa com as fases 1 a 6 concluídas, porque as capturas têm de mostrar o app final.

| # | Tarefa | Problema | Pronto quando |
|---|---|---|---|
| 7.1 | Teste de integração que entra com a conta de demonstração e percorre as telas tirando capturas, um por app. | — | Roda igual em Android e iOS |
| 7.2 | Android: rodar no emulador desta máquina e salvar as capturas. | G-02 | PNGs em `store/capturas/android/` |
| 7.3 | iOS: rodar no simulador do runner macOS pelo GitHub Actions e baixar os artefatos. | A-13 | PNGs em `store/capturas/ios/` |
| 7.4 | Finalizar o prompt do Codex com a lista real de arquivos capturados. | — | `docs/apps-nativos/PROMPT-CODEX-IMAGENS.md` atualizado |
| 7.5 | O dono roda o Codex para montar as imagens finais e remove `store/artes-ia/`. | G-02 | Imagens nos tamanhos de cada loja em `store/final/` |

### Fase 8: envio

Feita pelo dono, com os documentos da fase 6 em mãos.

1. Play: enviar o AAB ao teste interno, preencher a ficha, cumprir o teste fechado se a conta for pessoal, promover para produção.
2. Apple: instalar pelo TestFlight, preencher a ficha, enviar para revisão. Para o mecânico, pedir a distribuição não listada.
3. Com os dois apps no ar, executar a tarefa 4.5.

## Tamanhos de imagem exigidos

Conferir nas fontes da seção 6 da análise antes de gerar.

| Loja | Item | Tamanho | Formato |
|---|---|---|---|
| Google Play | Ícone | 512 × 512 | PNG 32 bits, até 1 MB |
| Google Play | Gráfico de destaque | 1024 × 500 | PNG ou JPG, sem transparência |
| Google Play | Capturas de telefone | 1080 × 1920, de 2 a 8 | PNG ou JPG, sem transparência |
| App Store | Ícone | 1024 × 1024 | PNG, sem transparência, cantos retos |
| App Store | Capturas de iPhone 6,9" | 1320 × 2868 (ou 1290 × 2796), de 3 a 10 | PNG ou JPG, sem transparência |
| App Store | Capturas de iPad 13" | 2064 × 2752 | Só se o app passar a rodar em iPad |

## Riscos

| Risco | Efeito | Como reduzir |
|---|---|---|
| A Apple recusar o mecânico como app interno | Atraso de semanas | Pedir distribuição não listada desde o primeiro envio (A-04) |
| Atualizar o Flutter quebrar plugins ou layout | Retrabalho na fase 1 | Atualizar antes de qualquer outra mudança e rodar os testes e o roteiro visual |
| Conta pessoal no Play Console | 14 dias de teste fechado antes da produção | Descobrir o tipo de conta na fase 0 |
| Anonimização apagar dado que a lei manda guardar | Problema fiscal | Manter pedidos, OS e notas; anonimizar só o cadastro, e revisar com o responsável pela LGPD |
| Capturas com dado real de cliente | Exposição de dado pessoal | Só capturar com as contas de demonstração |
| Segredo vazar por workflow em repositório público | Perda da chave de assinatura | Fase 5.4 e ambiente `release` com aprovação |

## Critério de conclusão

- `flutter analyze` e `flutter test` verdes nos três pacotes, no CI.
- AAB e IPA dos dois apps gerados e assinados pelo GitHub Actions.
- Todo problema Bloqueia e Alta da análise fechado; Média fechado ou com decisão registrada.
- `PARIDADE.md`, `TESTE.md` e `CONFORMIDADE.md` preenchidos.
- Capturas reais de Android e iOS salvas e prompt do Codex finalizado.
