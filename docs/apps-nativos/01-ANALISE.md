# Apps nativos Cliente e Mecânico: análise

Data: 12/11/2026. Escopo: `apps/mobile_cliente`, `apps/mobile_mecanico` e `packages/mobile_core`.
Fora do escopo: `apps/mobile` (M2 Admin), que não foi analisado.

Este documento só descreve o estado atual. O que fazer está em [02-PLANO.md](02-PLANO.md) e como executar com agentes está em [03-ORQUESTRACAO-AGENTES.md](03-ORQUESTRACAO-AGENTES.md).

## Resumo

1. **Os dois apps não existem para iPhone.** Nenhum tem a pasta `ios/`, não há workflow de iOS para eles e não há nenhum secret da Apple no GitHub. Tudo o que é da App Store está por fazer.
2. **O AAB gerado pelo GitHub Actions hoje sairia com o login quebrado.** O workflow usa por padrão `https://m2centerauto.com.br/api`. Esse domínio responde 301 para o `www`, e o app não segue redirecionamento em POST.
3. **O GitHub Actions não consegue assinar nada.** O repositório só tem o secret `VPS_PASSWORD`. As keystores dos dois apps existem apenas nesta máquina.
4. **As telas nativas seguem o PWA de perto.** A estrutura, os textos e o visual batem. Faltam algumas funções pontuais, listadas na seção 3.
5. **A exclusão de conta é só um pedido.** O app registra a solicitação e a equipe precisa apagar à mão. As duas lojas exigem que a exclusão aconteça de fato.
6. **As artes atuais da loja em `store/artes-ia/` foram redesenhadas por IA** e não reproduzem a tela real com fidelidade. As duas lojas exigem capturas reais do app.

## Como a análise foi feita

- Leitura do código dos dois apps, do núcleo compartilhado, dos workflows e dos documentos em `docs/`.
- Comparação das telas nativas com os componentes do PWA em `apps/frontend/src/components/customer`, `components/mechanic` e nos componentes de admin que o painel do mecânico reutiliza.
- Comparação dos endpoints que cada lado chama.
- Três checagens ao vivo: redirecionamento do domínio, página de privacidade no ar e lista de secrets do repositório.

Não foi feito: compilar os apps, rodar `flutter analyze` ou `flutter test`, abrir os apps em emulador. O Flutter não está instalado nesta máquina. O Android SDK está, com emuladores criados (`rapidinho_a16_16k`, `yuke_390x844` e outros) e imagens das APIs 35 e 36.

As regras das lojas citadas aqui vêm do conhecimento do modelo até meados de 2026. Antes de enviar, cada item marcado com **(confirmar)** precisa ser conferido na fonte oficial. Os links estão na seção 6.

## 1. Estado dos apps

| | Cliente | Mecânico |
|---|---|---|
| Pasta | `apps/mobile_cliente` | `apps/mobile_mecanico` |
| Nome | M2 Center Auto | M2 Mecânico |
| ID Android | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
| Versão | 1.0.0+1 | 1.0.0+1 |
| Android | pronto, `targetSdk 36`, `minSdk 24` | pronto, `targetSdk 36`, `minSdk 24` |
| iOS | **não existe** | **não existe** |
| Telas | 22 arquivos de tela | 16 arquivos de tela |
| Testes | 1 arquivo (modelos) | 2 arquivos (regras da revisão e um teste de layout) |
| Flutter no CI | 3.32.8 | 3.32.8 |

O que já está certo nos dois:

- Sessão guardada com `flutter_secure_storage`, só `Authorization: Bearer`, sem cookies.
- `usesCleartextTraffic="false"` e `allowBackup="false"`.
- Só a permissão `INTERNET`. O mecânico usa a câmera do sistema por intent, sem pedir permissão de câmera no Android.
- Sem anúncios, sem analytics, sem SDK de terceiros que colete dados.
- Fontes embutidas, textos em português, ícone adaptativo e tela de abertura com a cor da marca.
- Cadastro do cliente com aceite do aviso de privacidade e link para lê-lo.
- Compra de peças abre o site. Como são produtos físicos, as duas lojas permitem pagamento fora do app.

## 2. Problemas encontrados

Gravidade: **Bloqueia** impede publicar ou quebra o app. **Alta** tem risco real de rejeição ou de falha para o usuário. **Média** deve entrar antes do envio. **Baixa** pode ficar para depois.

### Build e GitHub Actions

| ID | Gravidade | Problema | Evidência |
|---|---|---|---|
| B-01 | Bloqueia | URL padrão da API no workflow é o domínio sem `www`. O POST de login recebe 301 e falha. | `.github/workflows/mobile-android-apps.yml` linha 24. Teste ao vivo: `POST https://m2centerauto.com.br/api/auth/login` devolve 301; com `www` devolve 400 (rota alcançada). O próprio `packages/mobile_core/lib/src/env.dart` explica o motivo e usa `www` como padrão. |
| B-02 | Bloqueia | Não há secrets de keystore no GitHub. O job de AAB para com erro. | `gh secret list` mostra só `VPS_PASSWORD`. As keystores estão em `apps/mobile_*/android/` nesta máquina, fora do git. |
| B-03 | Bloqueia | Não há build de iOS para Cliente e Mecânico: falta a pasta `ios/`, o workflow e os secrets da Apple. | `git ls-files` não lista nenhum arquivo `ios/` nesses apps. |
| B-04 | Alta | O Flutter 3.32.8 provavelmente não atende ao Xcode exigido hoje pela App Store. Desde abril de 2026 a Apple pede build com o SDK do iOS 26 **(confirmar)**. | `FLUTTER_VERSION: "3.32.8"` nos dois workflows. |
| B-05 | Média | O repositório é público e os workflows não estão endurecidos: actions por tag (`@v4`, `@v2`) e não por commit, sem bloco `permissions`, sem ambiente protegido para os jobs que assinam. | Os dois workflows mobile. |
| B-06 | Média | O job de AAB não roda `flutter analyze` e só valida em push para `main`. Pull requests não são validados. | `mobile-android-apps.yml`. |
| B-07 | Média | AGP 8.7.3 com `compileSdk 36`. Essa versão do plugin foi testada até a API 35 **(confirmar)**. | `android/settings.gradle.kts` dos dois apps. |
| B-08 | Baixa | O número de build vem de `GITHUB_RUN_NUMBER` do workflow Android. Um workflow novo de iOS teria contagem própria; não é erro, mas os números das duas lojas não vão coincidir. | `mobile-android-apps.yml` linha 99. |

### Políticas da Google Play

| ID | Gravidade | Problema | Evidência |
|---|---|---|---|
| G-01 | Alta | A exclusão de conta não é executada pelo sistema. A API só cria um registro `DELETION` com prazo de 15 dias. Se a equipe não agir, a conta continua existindo. | `apps/backend/src/modules/privacy/privacy.controller.ts`, `createRequest`. O próprio `docs/APPS-ANDROID.md` avisa: "a API registra o pedido, não apaga os dados sozinha". |
| G-02 | Alta | As imagens em `store/artes-ia/` redesenham a interface. A política de metadados pede capturas que mostrem o app real. | `apps/mobile_cliente/store/artes-ia/README.md` afirma que a ferramenta "redesenhou a interface". |
| G-03 | Média | Se a conta do Play Console for pessoal e criada depois de novembro de 2023, a Google exige teste fechado com 12 testadores por 14 dias antes da produção **(confirmar o tipo de conta)**. | Regra da Google; o tipo de conta não está documentado no repositório. |
| G-04 | Média | Android 16 (API 36) ignora trava de orientação em telas grandes e força conteúdo de borda a borda. Os apps não foram testados em tablet, paisagem nem com navegação por 3 botões. | `targetSdk = 36`; `SafeArea` aparece em poucas telas. |
| G-05 | Média | Suporte a páginas de memória de 16 KB não foi testado. É exigido para apps novos com alvo no Android 15 ou superior **(confirmar)**. | Há um emulador `rapidinho_a16_16k` nesta máquina para o teste. |
| G-06 | Baixa | "Baixar meus dados" no app só abre um pedido. O site baixa o arquivo na hora, e a API já tem a rota. | `privacy_screen.dart` envia `PORTABILITY`; a rota `GET /privacy/me/export` existe. |

O que já está pronto para a Play: respostas do Console em `docs/PLAY-STORE-CONFIGURACAO.md`, página de privacidade no ar com a âncora `#excluir-conta`, formulário de segurança dos dados redigido.

### Políticas da Apple

Como não há app iOS, tudo aqui é pendência. A lista serve de requisito para a criação.

| ID | Gravidade | Problema |
|---|---|---|
| A-01 | Bloqueia | Criar o projeto iOS dos dois apps com os IDs `br.com.m2centerauto.cliente` e `br.com.m2centerauto.mecanico`, nome de exibição, ícone 1024 sem transparência e tela de abertura. |
| A-02 | Bloqueia | Conta no Apple Developer Program (US$ 99 por ano), apps criados no App Store Connect e chave de API para o CI. Depende do dono. |
| A-03 | Bloqueia | O app do mecânico precisa de `NSCameraUsageDescription` (e `NSPhotoLibraryUsageDescription`, que o `image_picker` referencia). Sem o texto, o app fecha ao abrir a câmera e o envio é recusado. |
| A-04 | Alta | **O app do mecânico é de uso interno.** A regra 3.2 das diretrizes diz que apps para a equipe de uma empresa específica não vão para a App Store pública. O caminho indicado é distribuição não listada (link direto) ou app personalizado pelo Apple Business Manager **(confirmar)**. |
| A-05 | Alta | Regra 5.1.1(v): app com cadastro precisa permitir excluir a conta dentro do app, e a exclusão tem de acontecer. Mesmo problema de G-01. |
| A-06 | Alta | Falha sem tratamento ao abrir a câmera. `ImagePicker().pickImage` fica fora do `runAction`; se o usuário negar a câmera ou o aparelho não tiver uma, a exceção não é capturada. No iOS a negativa de permissão é comum. Arquivo: `apps/mobile_mecanico/lib/features/orders/plate_lookup_screen.dart`, método `_photo`. |
| A-07 | Média | `ITSAppUsesNonExemptEncryption = false` no `Info.plist`, para não responder ao questionário de exportação a cada envio. |
| A-08 | Média | Arquivo de privacidade `PrivacyInfo.xcprivacy` do app e rótulos de privacidade no App Store Connect, equivalentes à "Segurança dos dados" da Play. |
| A-09 | Média | O Keychain do iOS sobrevive à desinstalação. Um token antigo volta depois de reinstalar o app. Precisa de limpeza na primeira abertura. O comentário em `token_storage.dart` só considera Android. |
| A-10 | Média | Decidir se o app roda em iPad. Só iPhone dispensa as capturas de iPad, mas a Apple ainda testa o app em iPad no modo de compatibilidade. |
| A-11 | Média | A revisão da Apple exige conta de demonstração com dados. Já previsto para a Play; vale para as duas lojas. |
| A-12 | Média | O aviso de privacidade no site fala só em "Aplicativos para Android". Precisa citar iPhone. Arquivo: `apps/frontend/src/pages/PrivacyPolicy.tsx`. |
| A-13 | Baixa | Capturas de tela da App Store não podem mostrar barra de status do Android nem citar outras lojas (regra 2.3.10). As capturas atuais são de Android. |

O que não é exigido: "Entrar com a Apple" (só é obrigatório quando há login por terceiros, e o app não tem); compra dentro do app (são produtos e serviços físicos); pedido de rastreamento (não há rastreamento).

## 3. Telas: nativo comparado com o PWA

A estrutura bate. O app do cliente tem Início, Compras (Pedidos, Orçamentos), Veículo (Veículos, Revisões), Ajuda e Mais (Benefícios, Conta, Alterar senha, Privacidade), igual a `customerNavigation.ts` e ao `MobileDrawer`. O app do mecânico tem Trabalho (Revisões, Ordens de serviço), Perfil e Sair, igual a `mechanicNavigation.ts`. O perfil do mecânico tem as mesmas cinco seções de `MechanicSettingsView.tsx`.

A comparação visual foi feita pelo código e pelas capturas já existentes em `store/screenshots/`. Não houve comparação lado a lado em aparelho. Essa conferência é uma etapa do plano.

### Cliente: o que o PWA faz e o app não

| ID | Gravidade | Diferença | PWA | Nativo |
|---|---|---|---|---|
| T-01 | Alta | Cadastro de veículo sem a tabela FIPE. O app pede marca, modelo e ano em texto livre. | `CreateVehicleModalCustomer.tsx` usa `fipeService` | `vehicle_form_screen.dart` |
| T-02 | Alta | Exportar orçamento em PDF. | `CustomerQuotes.tsx`, `handleExportPdf` | ausente |
| T-03 | Média | Reenviar e-mail de confirmação da conta. | `CustomerProfile.tsx` linha 307 | ausente |
| T-04 | Média | Baixar os dados na hora (mesmo item de G-06). | link para `privacyService.exportUrl` | abre pedido |
| T-05 | Média | Acompanhar pedidos de privacidade já feitos. A rota `GET /privacy/me/requests` existe e o app não usa. | **(confirmar se o PWA mostra)** | ausente |
| T-06 | Média | Botões de WhatsApp nos pedidos. | `CustomerOrders.tsx` linhas 95 e 101 | só existe na tela de Ajuda |
| T-07 | Baixa | Favoritos: limpar tudo, compartilhar e exportar CSV. | `CustomerFavorites.tsx` | só busca, ordenação e remover |
| T-08 | Baixa | Exportar a revisão em PDF pelo cliente **(confirmar se o cliente tem esse botão no PWA)**. | `revisionService.exportCustomerRevisionPdf` | ausente |

### Mecânico: o que o PWA faz e o app não

| ID | Gravidade | Diferença | PWA | Nativo |
|---|---|---|---|---|
| T-09 | Média | Cancelar revisão. | `MechanicRevisionsView.tsx` linha 113 | ausente em `mechanic_api.dart` |
| T-10 | Média | Exportar revisão em PDF. | `RevisionDetailsModal.tsx` | ausente |
| T-11 | Média | Lista de notificações. `docs/APPS-ANDROID.md` diz que existe nos dois PWAs e só no app do cliente. | **(confirmar no PWA)** | ausente |
| T-12 | Baixa | Concluir a revisão direto pelo card, sem gerar OS. Diferença já documentada como decisão. | existe | removido de propósito |

### Diferenças aceitas (não são pendência)

- Catálogo, carrinho e checkout abrem o site.
- A OS criada no app já sai atribuída ao mecânico logado.
- Não há notificação push em nenhum dos lados. Não é exigência das lojas.

## 4. Backend e site

| ID | Gravidade | Ponto |
|---|---|---|
| S-01 | Alta | Não existe rotina que execute a exclusão ou anonimização da conta (ver G-01 e A-05). |
| S-02 | Média | Não há controle de versão mínima do app. Uma mudança na API do site pode quebrar versões antigas instaladas, sem aviso para atualizar. |
| S-03 | Média | Com o fim do PWA, o site ainda oferece instalação (`PwaInstallBanner`, manifest, `sw.js`, tela de configuração de PWA no painel). Precisa trocar pelos links das lojas quando os apps estiverem publicados. |
| S-04 | Baixa | CORS já aceita requisições sem `Origin`, que é o caso dos apps. Nada a fazer. |

## 5. O que depende do dono

Nenhum agente resolve estes itens sozinho:

1. Conta Apple Developer ativa e, para o mecânico, pedido de distribuição não listada.
2. Chave de API do App Store Connect (arquivo `.p8`, ID da chave, ID do emissor, ID do time).
3. Cadastro dos secrets de keystore no GitHub, a partir dos arquivos que estão nesta máquina. Guardar cópia das keystores em um cofre.
4. Tipo da conta do Play Console (pessoal ou empresa) e, se pessoal, os 12 testadores.
5. Contas de demonstração em produção, com dados fictícios: um cliente com veículo, revisão, orçamento e pedido; um mecânico com revisão agendada e OS aberta.
6. Decisão sobre iPad (recomendado: só iPhone na primeira versão).
7. Confirmação de quem responde pela LGPD sobre os formulários de dados das duas lojas.

## 6. Fontes oficiais para conferir antes do envio

- Apple, diretrizes de revisão: https://developer.apple.com/app-store/review/guidelines/
- Apple, requisitos de envio (versão do Xcode e SDK): https://developer.apple.com/news/upcoming-requirements/
- Apple, tamanhos de captura de tela: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Apple, exclusão de conta: https://developer.apple.com/support/offering-account-deletion-in-your-app
- Apple, distribuição não listada: https://developer.apple.com/support/unlisted-app-distribution/
- Google, nível de API exigido: https://support.google.com/googleplay/android-developer/answer/11926878
- Google, exclusão de conta: https://support.google.com/googleplay/android-developer/answer/13327111
- Google, recursos gráficos e capturas: https://support.google.com/googleplay/android-developer/answer/9866151
- Google, teste para contas pessoais novas: https://support.google.com/googleplay/android-developer/answer/14151465
- Google, páginas de 16 KB: https://developer.android.com/guide/practices/page-sizes
