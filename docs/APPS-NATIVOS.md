# Apps nativos: Cliente e Mecânico (Android e iPhone)

Apps nativos em Flutter que substituem os PWAs do cliente e do mecânico no Android e no iPhone. As telas ficam dentro do app e os dados vêm da mesma API do site, com `Authorization: Bearer` no lugar do cookie. O app `apps/mobile` (M2 Admin) é separado e não mudou.

| | Cliente | Mecânico |
|---|---|---|
| Pasta | `apps/mobile_cliente` | `apps/mobile_mecanico` |
| Nome na loja | M2 Center Auto | M2 Mecânico |
| Application ID / Bundle ID | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
| Login | `POST /auth/login` | `POST /auth/admin/login`, só papel `STAFF` |
| Sessão | 30 dias | 30 dias |

O código comum (API, sessão, tema, formatação, estados de tela) está em `packages/mobile_core`.

> O Application ID não muda depois do primeiro envio à Play. Quem trocar deve fazer isso antes de criar o app no Console.

## O que cada app faz

**Cliente:** cadastro, login e recuperação de senha; início com orçamentos a aprovar e próximos agendamentos; pedidos; orçamentos (pedir, aprovar, recusar); veículos; agendamento e histórico de revisões com o checklist; favoritos; cupons; dados pessoais; endereços; notificações; suporte (atendimentos, FAQ, contatos); privacidade e exclusão de conta.

**Mecânico:** login e recuperação de senha; fila de revisões com agendamentos e filtros; checklist completo com busca, carinhas e observações; orçamento dos itens com problema; finalização que cria a OS e fecha a revisão; ordens de serviço (lista, detalhe, iniciar, concluir, editar, adicionar itens); nova OS por foto ou digitação da placa; perfil, estatísticas, histórico e preferências.

### Diferenças em relação aos PWAs

- **Compra de peças:** catálogo, carrinho e checkout abrem no site. O app do cliente não vende dentro do app.
- **PDFs:** exportar revisão e orçamento em PDF não entrou nesta versão. No PWA o HTML é montado no navegador, e o app precisaria de um gerador próprio.
- **Cópia dos dados (LGPD):** o app abre uma solicitação de portabilidade em vez de baixar o arquivo.
- **Mecânico:** a revisão é concluída sempre pelo fluxo que gera a OS. No PWA também havia conclusão direta pelo card.
- **Criação de OS:** a OS criada no app já fica atribuída ao mecânico logado, para aparecer na lista dele.
- **Notificações:** a lista existe nos dois PWAs e no app do cliente, mas não há push. Push exige Firebase e envio pelo backend.

## Rodar em desenvolvimento

```bash
cd apps/mobile_cliente   # ou apps/mobile_mecanico
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001
```

`10.0.2.2` é a máquina de desenvolvimento vista do emulador. Sem o define, o app usa a API de produção. HTTP sem TLS só é permitido no build de debug.

Use o Flutter **3.41.9**, a mesma versão do CI. No iPhone o CI usa o Xcode 26.4.1 (a linha 3.41 do Flutter não suporta o Xcode 27).

## Validar

```bash
flutter analyze
flutter test
```

Rodar nas três pastas: `packages/mobile_core`, `apps/mobile_cliente` e `apps/mobile_mecanico`.

O GitHub Actions faz isso sozinho no workflow **Apps nativos - validação** (`.github/workflows/mobile-apps-ci.yml`), em todo push e pull request que mexe nos apps: `analyze` e `test` nos três pacotes, APK de debug dos dois apps e build de iOS sem assinatura no macOS. Esse workflow não usa nenhum secret.

## Gerar o AAB

```bash
cd apps/mobile_cliente
flutter build appbundle --release --build-number=N
```

Saída: `build/app/outputs/bundle/release/app-release.aab`. Cada envio à Play precisa de um `--build-number` maior que o anterior.

### Assinatura

Cada app tem a própria chave de upload, fora do git:

- `android/app/upload-keystore.jks`
- `android/key.properties`

**Guarde esses dois arquivos de cada app em um cofre.** Com a Assinatura de apps do Google Play ativa, uma chave de upload perdida pode ser redefinida pelo suporte, mas o processo leva dias.

Sem `key.properties` o build sai com assinatura de debug: instala para teste, mas a Play recusa.

## Release pelo GitHub Actions

Workflow **Apps nativos - release** (`.github/workflows/mobile-apps-release.yml`). Gera o AAB e o IPA assinados.

1. Confira se o último commit está verde no workflow de validação.
2. Actions → *Apps nativos - release* → *Run workflow*.
3. Escolha o **app** (cliente ou mecânico) e a **plataforma** (ambos, android ou ios). Deixe a URL da API como está: `https://www.m2centerauto.com.br/api`.
4. Aprove o ambiente `release` quando o GitHub pedir.
5. Resultado:
   - **Android:** o AAB fica em *Artifacts* do run (`m2-<app>-android-<número>`). Envie à mão no Play Console. Ainda não há envio automático: ele depende de uma conta de serviço da Play (secret futuro `PLAY_SERVICE_ACCOUNT_JSON`).
   - **iPhone:** o IPA fica em *Artifacts* (`m2-<app>-ios-<número>`) e já é enviado ao TestFlight. Em até 30 minutos o build aparece no App Store Connect.

**Sem passar pelo `main`:** crie e envie uma etiqueta no formato `release/<app>/<plataforma>/<número>`, por exemplo `git tag release/cliente/android/1 && git push origin release/cliente/android/1`. O release roda no commit da etiqueta, com a URL da API padrão, e continua pedindo aprovação do ambiente `release`. Use para gerar um build de teste a partir de um branch. Para produção, prefira `main`.

O primeiro passo do release confere a URL da API: se um POST em `<url>/auth/login` receber redirecionamento (3xx), o build para. O app não segue redirecionamento em POST, e sem o `www` o login quebraria.

Os artefatos ficam 30 dias. Eles não contêm chave nenhuma, mas qualquer pessoa logada no GitHub consegue baixar artefatos de um repositório público.

### Número de build

É o número de commits do branch (`git rev-list --count HEAD`). O mesmo commit gera o mesmo número no AAB e no IPA, e cada commit novo em `main` aumenta o número. Ele já está acima de qualquer build enviado antes (o workflow antigo usava o número do run, que chegou a 7).

Consequência: para enviar de novo o mesmo app na mesma loja, é preciso um commit novo. Rode o release sempre a partir de `main`; um branch com menos commits geraria número menor.

### Secrets

Cadastre em Settings → Environments → `release` → *Environment secrets* (não em secrets do repositório). O ambiente deve exigir aprovação. Sem um secret, o job para logo no início dizendo qual falta.

| Secret | Conteúdo | Como gerar |
|---|---|---|
| `ANDROID_CLIENTE_KEYSTORE_BASE64` | A keystore de upload do cliente em base64 | `base64 -w0 apps/mobile_cliente/android/app/upload-keystore.jks` (no Windows: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks"))`) |
| `ANDROID_CLIENTE_KEYSTORE_PASSWORD` | Senha da keystore do cliente | o `storePassword` do `key.properties` do cliente |
| `ANDROID_MECANICO_KEYSTORE_BASE64` | O mesmo, do mecânico | idem, em `apps/mobile_mecanico` |
| `ANDROID_MECANICO_KEYSTORE_PASSWORD` | O mesmo, do mecânico | idem |
| `APP_STORE_CONNECT_KEY_ID` | ID da chave de API (10 caracteres) | App Store Connect → Usuários e acesso → Integrações → Chaves da API da App Store Connect → gerar chave com papel **Admin** |
| `APP_STORE_CONNECT_ISSUER_ID` | ID do emissor (formato UUID) | mesma tela, no topo da lista de chaves |
| `APP_STORE_CONNECT_PRIVATE_KEY_BASE64` | O arquivo `AuthKey_<ID>.p8` em base64 | baixe o `.p8` (só dá para baixar uma vez) e rode `base64 -i AuthKey_XXXX.p8` |
| `APPLE_TEAM_ID` | ID do time Apple (10 caracteres) | developer.apple.com → Account → Membership details → Team ID |

O workflow monta o `key.properties` com `keyAlias=upload` e a mesma senha para a keystore e para a chave, como nos arquivos locais. Se alguma keystore usar outro alias ou senhas diferentes, o workflow precisa de ajuste.

A chave `.p8` e a keystore são gravadas na pasta temporária do runner e apagadas no fim do job, mesmo em caso de erro.

### Assinatura do iPhone

Não há certificado nem perfil guardado em secret. O `xcodebuild` usa a chave de API com `-allowProvisioningUpdates` e assinatura automática: registra o Bundle ID, cria ou baixa o certificado e o perfil e assina com o certificado de distribuição gerenciado pela Apple. Por isso a chave precisa do papel **Admin** (ou acesso a certificados de distribuição gerenciados na nuvem).

Antes do primeiro envio de cada app, crie o app no App Store Connect (Apps → +) com o Bundle ID da tabela do início. Sem isso o envio ao TestFlight falha.

Se a assinatura automática falhar no runner, a alternativa é guardar certificado de distribuição (`.p12`) e perfil em secrets e assinar de forma manual.

## Publicar na Google Play

Para cada app:

1. Criar o app no Play Console, em português do Brasil, como **App**, **Gratuito**.
2. Enviar o AAB em **Teste interno** e instalar pelo link da Play em um aparelho real.
3. Deixar a **Assinatura de apps do Google Play** ativa.
4. Preencher a ficha com os arquivos de `store/` (ícone 512 e destaque 1024x500) e ao menos duas capturas de tela do celular.
5. Em **Conteúdo do app**, preencher:
   - Política de privacidade: `https://www.m2centerauto.com.br/privacidade`
   - Segurança dos dados: ver abaixo
   - Acesso a apps: informar uma conta de teste
   - Classificação de conteúdo, público-alvo e anúncios (não há anúncios)
6. Promover para produção.

### Exclusão de conta (app do cliente)

No Console, informe `https://www.m2centerauto.com.br/privacidade#excluir-conta`. No app, o caminho é Mais → Privacidade → Excluir minha conta.

O pedido entra na fila de privacidade do painel (`DELETION`), com prazo de 15 dias. **A equipe precisa executar a exclusão**: a API registra o pedido, não apaga os dados sozinha.

O app do mecânico não tem cadastro: as contas são criadas pela loja.

### Segurança dos dados

Base para o formulário. Confirme com quem responde pela LGPD da M2 antes de enviar.

| Dado | Cliente | Mecânico | Finalidade |
|---|---|---|---|
| Nome, e-mail, telefone | Coletado | Coletado (nome e e-mail) | Conta, atendimento |
| CPF, endereço | Coletado | Exibido de clientes | Pedidos e serviços |
| Fotos | Não | Foto da placa, enviada para leitura | Funcionalidade do app |
| Histórico de compras | Coletado | Não | Pedidos |
| Mensagens de suporte | Coletado | Não | Atendimento |

Nos dois apps os dados trafegam com criptografia (HTTPS). Não há anúncios nem SDK de analytics.

## Backend

Os apps dependem de duas mudanças já feitas na API:

- `POST /auth/login` e `POST /auth/register` devolvem `data.token`, como o login admin já fazia.
- `rememberMe: true` nessas rotas gera sessão de 30 dias. Sem o campo, o site mantém os 7 dias de sempre.
