# Apps nativos Cliente e Mecânico: instruções para o orquestrador

Este documento é para o modelo que vai coordenar a execução (Opus 5.5 no Claude Code). Você não implementa: você lança um agente para cada frente, confere o que voltou e junta o trabalho.

Leia antes, nesta ordem: [01-ANALISE.md](01-ANALISE.md) (o que está errado e a evidência) e [02-PLANO.md](02-PLANO.md) (o que fazer, em que ordem e quando está pronto). Os IDs citados aqui (B-01, T-02, tarefa 3.4) vêm desses dois arquivos.

## Contexto que você precisa ter

- O projeto é um monorepo. Os apps são Flutter: `apps/mobile_cliente`, `apps/mobile_mecanico`, com código comum em `packages/mobile_core`. A API é `apps/backend` e o site é `apps/frontend`.
- O PWA vai ser aposentado. Ele é a referência de como cada tela deve ser: `apps/frontend/src/components/customer`, `components/mechanic` e os componentes de `components/admin` que o painel do mecânico reutiliza.
- `apps/mobile` (M2 Admin) está fora do escopo. Nenhum agente mexe nele.
- O dono do projeto não lê inglês. Toda mensagem para ele, todo documento e todo texto de tela é em português do Brasil. Mensagens de commit seguem o padrão do repositório, em inglês.
- O repositório é público. Nada de credencial, token, keystore ou senha de conta de demonstração em arquivo, commit, log ou saída de comando.

## Regras que valem para você e para todos os agentes

1. **Trabalhe no branch `apps-nativos`, não em `main`.** Todo push em `main` que toque `apps/backend` ou `apps/frontend` dispara o deploy de produção. O `AGENTS.md` pede commit e push ao fim de cada entrega: faça isso no branch. O merge em `main` só acontece com o "pode" explícito do dono.
2. **O Flutter não está instalado nesta máquina.** O primeiro agente instala. Sem ele não há como validar nada localmente.
3. **Só o orquestrador faz commit.** Os agentes editam e relatam. Você confere, roda a validação, e então faz commit e push. Isso evita commits concorrentes.
4. **Agentes em paralelo usam `isolation: "worktree"`.** Cada um tem a lista de pastas que pode alterar. Quando voltarem, junte na ordem em que estão listados e resolva conflitos.
5. **Nada de produção sem o dono.** Nenhum agente cria conta, apaga dado ou roda migração no banco de produção. A rotina de exclusão de conta é escrita e testada em banco local.
6. **Itens marcados (confirmar) na análise são hipóteses.** O agente responsável confere na fonte oficial e relata o que encontrou, inclusive quando a hipótese estiver errada. Nesse caso o plano muda, e você avisa o dono.
7. **Relato honesto.** Cada agente devolve: o que fez, o que validou e como, o que não conseguiu, e o que ficou por decidir. "Compila" e "testei na tela" são coisas diferentes e devem vir separadas.
8. **Fazer o menor conjunto de mudanças que fecha a tarefa.** Reaproveitar os componentes de `packages/mobile_core` e o padrão das telas vizinhas. Não adicionar dependência para poucas linhas, nem funções que o PWA não tem.

## Antes de lançar qualquer agente

Verifique você mesmo e relate ao dono o que faltar. São os itens da Fase 0 do plano:

```
gh secret list
gh api repos/{owner}/{repo}/environments
```

- Sem os secrets de keystore: as ondas 1 a 4 seguem; o AAB assinado fica pendente.
- Sem os secrets da Apple: o iOS é criado e compilado sem assinatura; IPA assinado e TestFlight ficam pendentes.
- Sem as contas de demonstração: a onda 5 (teste) e a onda 6 (capturas) não rodam. Peça ao dono logo no início, porque é o item que mais atrasa.

Não espere a Fase 0 terminar para começar a onda 1.

## Ondas

Uma onda só começa quando a anterior foi conferida, validada e teve commit.

| Onda | Agentes | Em paralelo |
|---|---|---|
| 1 | A1 Ambiente | não |
| 2 | A2 iOS, A3 Backend e site, A4 GitHub Actions | sim |
| 3 | A5 Paridade do cliente, A6 Paridade do mecânico | sim |
| 4 | A7 Revisão de paridade, A8 Conformidade | sim |
| 5 | A9 Teste em emulador | não |
| 6 | A10 Capturas de tela | não |

Depois das ondas 4 e 5, as correções voltam para o agente dono do código. Use `SendMessage` para continuar o mesmo agente, que já tem o contexto, em vez de lançar um novo.

## Agentes

Todos são do tipo `general-purpose`. O texto de cada bloco é o conteúdo do prompt; acrescente as regras da seção anterior e o resultado dos agentes de que ele depende.

### A1: Ambiente e versão do Flutter

- **Tarefas do plano:** 1.3.
- **Pode alterar:** `pubspec.yaml`, `pubspec.lock` e `android/` dos dois apps; `packages/mobile_core/pubspec.yaml`; a variável `FLUTTER_VERSION` nos workflows.
- **Objetivo:** deixar o Flutter instalado nesta máquina (fora do repositório, por exemplo `C:\src\flutter`) e os três pacotes compilando e com testes verdes na versão estável que a App Store aceita hoje.
- **Como decidir a versão:** ler em https://developer.apple.com/news/upcoming-requirements/ qual Xcode e SDK a Apple exige para envio, e escolher a menor versão estável do Flutter que suporta esse Xcode. Conferir também a versão do AGP e do Gradle indicada para `compileSdk 36`.
- **Pronto quando:** `flutter analyze` e `flutter test` passam em `packages/mobile_core`, `apps/mobile_cliente` e `apps/mobile_mecanico`; `flutter build apk --debug` passa nos dois apps.
- **Devolver:** versão escolhida e o motivo; caminho do Flutter instalado; saída resumida de analyze e test; toda mudança de comportamento ou aviso de depreciação que a atualização trouxe.

### A2: iOS dos dois apps

- **Tarefas do plano:** 2.1 a 2.5. A 2.6 fica com o A9 e com o CI, porque não há Mac local.
- **Depende de:** A1.
- **Pode alterar:** `apps/mobile_cliente/ios/`, `apps/mobile_mecanico/ios/`, `packages/mobile_core/lib/src/auth/`, e o `main.dart` dos dois apps só para a limpeza do token.
- **Objetivo:** os dois apps com projeto iOS pronto para compilar no runner macOS, só iPhone, com os IDs `br.com.m2centerauto.cliente` e `br.com.m2centerauto.mecanico`.
- **Atenção:**
  - `flutter create --platforms=ios` roda no Windows e gera a pasta. O nome do pacote Dart (`m2_cliente`) não pode virar o ID do app: defina o ID explicitamente.
  - No mecânico, os textos de uso da câmera e da galeria precisam dizer para que servem ("fotografar a placa do veículo para encontrar o cliente"). Texto genérico é motivo de rejeição.
  - Ícone 1024 sem canal alfa. Reaproveite a arte que gerou o ícone do Android.
  - A-09: o Keychain sobrevive à desinstalação. Limpe o token na primeira abertura.
- **Pronto quando:** os arquivos existem e estão coerentes. A compilação é provada pelo workflow do A4 (`flutter build ios --no-codesign` no runner macOS). Combine com o orquestrador para rodar esse job assim que o A4 entregar.
- **Devolver:** lista de arquivos criados; cada chave adicionada ao `Info.plist` e por quê; o que só pode ser validado em Mac.

### A3: Backend e site

- **Tarefas do plano:** 4.1 a 4.4. A 4.5 não entra: só depois da publicação e com o "pode" do dono.
- **Depende de:** nada da onda 2.
- **Pode alterar:** `apps/backend/`, `apps/frontend/src/pages/PrivacyPolicy.tsx`.
- **Objetivo:**
  1. Exclusão de conta de verdade (G-01, A-05). Hoje `POST /privacy/me/requests` com `DELETION` só cria um registro. O pedido passa a desativar a conta na hora e a anonimizar o cadastro, veículos, endereços e favoritos. Pedidos, ordens de serviço e registros fiscais ficam, sem o vínculo com os dados pessoais.
  2. PDF de orçamento e de revisão acessível com `Authorization: Bearer` para cliente e para mecânico. Verifique primeiro o que já existe (`/admin/quotes/:id/export-pdf` e o que `customerService.exportQuotePdf` e `revisionService.exportCustomerRevisionPdf` chamam no site).
  3. Versão mínima do app: uma rota pública que devolve o menor build aceito por app e plataforma, configurável sem novo deploy.
  4. Aviso de privacidade citando iPhone e Android, com data e versão novas (`POLICY_VERSION` no controller precisa acompanhar).
- **Atenção:** a anonimização mexe em dado pessoal e em obrigação fiscal. Escreva teste automatizado cobrindo: conta some do login; pedidos antigos continuam consultáveis pela loja; pedir duas vezes não quebra. Não rode nada contra o banco de produção.
- **Pronto quando:** testes do backend verdes, incluindo os novos; `npm run build` do backend e do frontend passa.
- **Devolver:** contrato de cada rota nova ou alterada (método, caminho, autenticação, corpo, resposta), porque A5 e A6 dependem disso; decisões tomadas na anonimização, em linguagem que o responsável pela LGPD entenda.

### A4: GitHub Actions

- **Tarefas do plano:** 1.1 e 5.1 a 5.6.
- **Depende de:** A1 para a versão do Flutter. Escreve em paralelo com A2 e valida quando A2 entregar.
- **Pode alterar:** `.github/workflows/mobile-android-apps.yml` (pode renomear ou dividir), novos workflows mobile, `docs/APPS-ANDROID.md`. Não mexe em `deploy-production.yml`, `security.yml` nem `mobile-build.yml` (este é do app admin).
- **Objetivo:** validação automática em push e pull request, e release manual de AAB e IPA assinados para os dois apps, seguro para repositório público.
- **Atenção:**
  - B-01: a URL padrão tem de ser `https://www.m2centerauto.com.br/api`. Acrescente um passo que falha o build se a URL informada responder 3xx a um POST.
  - Repositório público: runner macOS é gratuito, mas qualquer pessoa pode abrir PR. Jobs com secret só rodam por `workflow_dispatch` ou tag, dentro do ambiente `release`. Nunca `pull_request_target`. Actions de terceiros fixadas pelo SHA do commit. `permissions: contents: read` no topo.
  - Assinatura iOS: use a chave de API do App Store Connect com assinatura automática (`xcodebuild -allowProvisioningUpdates` com `-authenticationKeyPath`, `-authenticationKeyID`, `-authenticationKeyIssuerID`). Confirme na documentação atual da Apple e do Flutter que esse caminho funciona com a versão escolhida; se não funcionar, use certificado e perfil em secrets e explique a troca.
  - A chave `.p8` e a keystore são gravadas em `$RUNNER_TEMP` e apagadas em passo com `if: always()`.
  - Sem secrets, o job de release falha cedo com mensagem clara em português dizendo qual secret falta. O job de validação e o build iOS sem assinatura não precisam de secret.
  - Selecione explicitamente a versão do Xcode no runner. Não confie em `macos-latest`.
- **Pronto quando:** o workflow de validação roda verde no branch; o build iOS sem assinatura roda verde; o YAML passa em `actionlint` se disponível. Os jobs assinados só podem ser provados depois da Fase 0: diga isso no relato.
- **Devolver:** lista de workflows e para que serve cada um; lista final de secrets com o que cada um contém; o que foi executado de verdade e o que só foi escrito.

### A5: Paridade do app do cliente

- **Tarefas do plano:** 3.1 a 3.8.
- **Depende de:** A1, e do contrato de rotas do A3.
- **Pode alterar:** `apps/mobile_cliente/lib/`, `apps/mobile_cliente/test/`, `apps/mobile_cliente/pubspec.yaml`, `packages/mobile_core/` (é o único agente da onda 3 que altera o núcleo).
- **Objetivo:** o app do cliente faz tudo o que o PWA do cliente faz, com a mesma aparência. Para cada tarefa, abra o componente do PWA citado na análise e reproduza campos, textos, ordem e validações.
- **Atenção:**
  - T-01: o cadastro de veículo do PWA usa a tabela FIPE em cascata (marca, modelo, ano). Veja `CreateVehicleModalCustomer.tsx` e `fipeService`, e de onde vêm os dados.
  - T-05 e T-08 estão marcados (confirmar): veja primeiro se o PWA do cliente tem a função. Se não tiver, não crie; relate.
  - PDF e download de dados: baixar com o token e abrir pelo compartilhamento do sistema. No iOS o compartilhamento precisa de origem em tela; teste a chamada.
  - Inclua aqui o lado do app da versão mínima (tarefa 4.3), no núcleo, para servir aos dois apps.
- **Pronto quando:** `flutter analyze` e `flutter test` verdes; cada tela nova ou alterada tem teste de widget na largura de um celular comum, no modelo de `apps/mobile_mecanico/test/ui_smoke_test.dart`.
- **Devolver:** por tarefa, feito, não feito ou não se aplica, com o arquivo; dependências adicionadas e o motivo; mudanças no núcleo que afetam o mecânico.

### A6: Paridade do app do mecânico

- **Tarefas do plano:** 1.2 e 3.9 a 3.11.
- **Depende de:** A1, e do contrato de rotas do A3.
- **Pode alterar:** `apps/mobile_mecanico/lib/`, `apps/mobile_mecanico/test/`, `apps/mobile_mecanico/pubspec.yaml`. Não altera `packages/mobile_core`: se precisar de algo no núcleo, descreva no relato para o A5 ou para o orquestrador.
- **Objetivo:** o app do mecânico faz tudo o que o PWA do mecânico faz, e não quebra quando a câmera é negada.
- **Atenção:**
  - A-06: em `plate_lookup_screen.dart`, `ImagePicker().pickImage` está fora do `runAction`. Permissão negada e câmera ausente precisam virar mensagem na tela, com a digitação da placa ainda disponível.
  - T-11 está marcado (confirmar): veja se o PWA do mecânico mostra notificações. Se não, relate e não crie.
  - T-12 é decisão documentada. Não reintroduza a conclusão direta pelo card.
- **Pronto quando:** igual ao A5.
- **Devolver:** igual ao A5.

### A7: Revisão de paridade

- **Tarefa do plano:** 3.12.
- **Depende de:** A5 e A6.
- **Pode alterar:** só `docs/apps-nativos/PARIDADE.md`. Este agente não corrige código.
- **Objetivo:** uma conferência independente, tela por tela, de quem não escreveu o código. Para cada tela do PWA do cliente e do mecânico: qual é a tela nativa, e toda diferença de conteúdo, texto, ordem dos elementos, ações disponíveis, estados vazios e mensagens de erro.
- **Como:** ler o componente do PWA e a tela Flutter lado a lado. Onde houver dúvida visual, rodar o site local em largura de celular e o app no emulador.
- **Pronto quando:** `PARIDADE.md` tem uma linha por tela, com situação (igual, diferença aceita, diferença a corrigir) e a evidência.
- **Devolver:** a lista de diferenças a corrigir, separada por app. O orquestrador encaminha para A5 e A6.

### A8: Conformidade com as lojas

- **Tarefas do plano:** 6.3, 6.4 e 6.5.
- **Depende de:** A2, A3, A5 e A6 (precisa saber o que o app faz no fim).
- **Pode alterar:** `docs/apps-nativos/CONFORMIDADE.md`, `docs/APP-STORE-CONFIGURACAO.md`, `docs/PLAY-STORE-CONFIGURACAO.md`.
- **Ferramentas:** WebFetch e WebSearch nas fontes oficiais listadas na seção 6 da análise.
- **Objetivo:**
  1. Conferir cada item (confirmar) da análise e cada regra citada, contra o texto oficial de hoje. Registrar em `CONFORMIDADE.md`: regra, o que a fonte diz, link, data da consulta, situação do app.
  2. Procurar exigências que a análise não citou. A análise foi escrita de memória e pode ter deixado passar regra nova.
  3. Escrever `APP-STORE-CONFIGURACAO.md` no mesmo formato de `PLAY-STORE-CONFIGURACAO.md`: privacidade do app, classificação etária, conta de demonstração, notas para o revisor, categoria, textos da ficha, e o pedido de distribuição não listada do mecânico.
  4. Atualizar o documento da Play com o que mudou.
- **Atenção:** este agente só usa fonte oficial da Apple e da Google. Blog e fórum servem para achar a página oficial, não como prova.
- **Devolver:** toda regra em que o app ainda não está conforme, com a correção necessária; toda hipótese da análise que estava errada.

### A9: Teste em emulador Android

- **Tarefas do plano:** 6.1 e 6.2. Inclui a parte Android da 2.6.
- **Depende de:** A5, A6, correções do A7, e das contas de demonstração (Fase 0.4).
- **Pode alterar:** só `docs/apps-nativos/TESTE.md`.
- **Ferramentas:** Android SDK em `%LOCALAPPDATA%\Android\Sdk` (`emulator`, `adb`). Já existem emuladores, entre eles `rapidinho_a16_16k` (Android 16 com páginas de 16 KB).
- **Objetivo:** rodar os dois apps em modo release contra a API de produção, com as contas de demonstração, e percorrer o roteiro completo.
- **Roteiro mínimo:** login, cadastro (só cliente, com e-mail descartável e exclusão da conta ao fim, para testar a exclusão de ponta a ponta), recuperar senha, cada aba, cada ação de cada tela, sair. Depois repetir os pontos críticos com: navegação por 3 botões, paisagem, fonte do sistema no máximo, tela de tablet, sem internet, sessão expirada, câmera negada.
- **Atenção:** as credenciais chegam por variável de ambiente. Não escreva em arquivo nem em comando que fique no histórico. Não altere dados de clientes reais: só as contas de demonstração.
- **Pronto quando:** `TESTE.md` tem cada item do roteiro com resultado (passou, falhou, não testado) e, para falha, o passo a passo e uma captura.
- **Devolver:** as falhas, por app e por gravidade. O que não foi possível testar em Android e precisa de iPhone real fica listado à parte, para o dono testar pelo TestFlight.

### A10: Capturas de tela

- **Tarefas do plano:** 7.1 a 7.4. É o último agente. Só roda com tudo acima concluído e conferido.
- **Depende de:** todos os anteriores, das contas de demonstração e do workflow do A4.
- **Pode alterar:** `apps/mobile_*/integration_test/`, `apps/mobile_*/test_driver/`, `apps/mobile_*/pubspec.yaml` (só `dev_dependencies`), `apps/mobile_*/store/capturas/`, um workflow novo de capturas iOS, `docs/apps-nativos/PROMPT-CODEX-IMAGENS.md`.
- **Objetivo:** capturas reais do app final, sem nenhum dado de pessoa real, salvas em pasta, e o prompt do Codex finalizado com a lista do que foi capturado.
- **Como:**
  1. Um teste de integração por app que entra com a conta de demonstração e passa pelas telas da lista abaixo, salvando um PNG por tela. As credenciais entram por `--dart-define` vindas de variável de ambiente.
  2. **Android:** nesta máquina. Criar um emulador de 1080 × 1920 com API 36 (a Play recusa captura em que um lado passe do dobro do outro, então 1080 × 2400 não serve). Ligar o modo de demonstração da barra de status (hora 9:41, bateria cheia, sem notificações). Rodar o teste e salvar em `apps/mobile_<app>/store/capturas/android/`.
  3. **iOS:** não há Mac local. Criar um workflow manual que roda o mesmo teste no simulador de iPhone de 6,9" no runner macOS, com a barra de status ajustada por `xcrun simctl status_bar`, e publica os PNGs como artefato. Disparar com `gh workflow run`, acompanhar com `gh run watch`, baixar com `gh run download` para `apps/mobile_<app>/store/capturas/ios/`. As credenciais vêm dos secrets `DEMO_*`, dentro do ambiente `release`.
  4. Conferir cada PNG: tamanho exato, sem canal alfa, sem faixa de depuração, sem tela de carregamento, sem dado real, sem texto cortado.
  5. Preencher a seção "Capturas disponíveis" de `PROMPT-CODEX-IMAGENS.md` com o caminho e a descrição de cada arquivo.
- **Telas do cliente:** login, início, pedidos, orçamento (detalhe com aprovar), veículos, revisão (detalhe com o checklist), ajuda, benefícios.
- **Telas do mecânico:** login, fila de revisões, checklist em andamento, orçamento da revisão, ordens de serviço, detalhe da OS, leitura de placa, perfil com estatísticas.
- **Nome dos arquivos:** `NN-nome.png`, com a mesma numeração nas duas plataformas (`01-login.png`, `02-inicio.png`...).
- **Pronto quando:** as quatro pastas (dois apps, duas plataformas) têm todas as telas da lista, conferidas, e o prompt do Codex cita cada arquivo.
- **Devolver:** tabela de arquivos com tamanho; telas que não foi possível capturar e por quê; o caminho do prompt finalizado.

## Como conferir o que cada agente devolve

Não repasse o relato do agente como fato. Antes do commit de cada onda:

1. Leia o diff inteiro. Procure credencial, URL de teste esquecida, arquivo fora da lista permitida, mudança em `apps/mobile`.
2. Rode você mesmo `flutter analyze` e `flutter test` nos três pacotes, e os testes do backend quando o A3 tiver mexido.
3. Para o que só valida no CI (iOS, workflows), faça push no branch e acompanhe com `gh run watch`. Falha de CI volta para o agente dono, com o log.
4. Compare o relato com o critério "Pronto quando" da tarefa no plano. Se o agente disse "pronto" sem a prova pedida, a tarefa não está pronta.

## Quando parar e chamar o dono

- Uma hipótese (confirmar) se mostrou errada e isso muda o plano.
- Falta um item da Fase 0 e ele bloqueia a próxima onda.
- Um agente propõe mudança fora do escopo: tocar o app admin, desligar o PWA, mexer no deploy.
- Antes de qualquer merge em `main`.
- Ao fim da onda 6, com o resumo final.

Enquanto houver onda que não dependa da resposta, continue nela.

## Resumo final para o dono

Em português simples, sem jargão:

1. O que ficou pronto, por app e por loja.
2. O que ele precisa fazer, em ordem, com o documento que orienta cada passo.
3. O que não foi feito e por quê.
4. O que foi testado de verdade e o que só compilou.
5. O prompt do Codex para gerar as imagens, com o caminho do arquivo.
