# Build e publicação — M2 Admin (app nativo)

Guia para gerar os instaláveis e publicar nas lojas. A URL de produção da API
(`https://m2centerauto.com.br/api`) é embutida no build via `--dart-define`.

## Identificadores

| Plataforma | Application ID / Bundle ID | Nome exibido |
|---|---|---|
| Android | `com.m2autohub.m2_admin` | M2 Admin |
| iOS | `com.m2autohub.m2Admin` | M2 Admin |

> Os IDs diferem porque o iOS não aceita `_`. São apps distintos em cada loja — normal.

Versão atual: **1.0.0 (build 1)** — definida em `pubspec.yaml` (`version: 1.0.0+1`).
A cada envio para a loja, incremente o build: `1.0.0+2`, `1.0.1+3`, etc.

---

## Android

### Assinatura (IMPORTANTE)

O release é assinado com a keystore em `android/app/upload-keystore.jks`, cujas
credenciais estão em `android/key.properties`. **Ambos estão fora do git**
(`.gitignore`) e **NÃO podem ser perdidos** — sem eles você não consegue publicar
atualizações do mesmo app na Play Store.

> Faça backup seguro de `upload-keystore.jks` e das senhas (gerenciador de senhas
> ou cofre). Se perder, só resta publicar um app novo (novo package), perdendo os
> usuários/instalações do atual.

### Gerar o AAB (para a Play Store)

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://m2centerauto.com.br/api
```

Saída: `build/app/outputs/bundle/release/app-release.aab` → é o arquivo que se
sobe no **Google Play Console**.

### Gerar o APK (instalar direto no aparelho, fora da loja)

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://m2centerauto.com.br/api
```

Saída: `build/app/outputs/flutter-apk/app-release.apk`. Envie para o celular e
instale (precisa permitir "fontes desconhecidas"). Serve para testes; a loja usa o AAB.

### Publicar na Google Play

1. Conta **Google Play Console** (taxa única de US$ 25).
2. Criar o app → preencher ficha (nome, descrição, ícone, screenshots, política
   de privacidade).
3. Enviar o `app-release.aab` numa trilha (Teste interno → Produção).
4. Recomendado deixar o **Play App Signing** ativado (o Google regera a chave de
   distribuição; sua keystore vira "upload key").

---

## iOS (exige Mac + conta Apple Developer)

**Não é possível gerar o `.ipa` no Windows** — a Apple exige macOS + Xcode.
O projeto iOS já está pronto (bundle id, nome, versão). Faltam apenas os passos
que só existem num Mac com a sua conta Apple:

### Num Mac com Xcode

```bash
cd apps/mobile
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://m2centerauto.com.br/api
```

Antes, abrir `ios/Runner.xcworkspace` no Xcode e, em *Signing & Capabilities*,
selecionar seu **Team** (conta Apple Developer) para gerar certificados/provisioning.

Saída: `build/ios/ipa/*.ipa`. Enviar via **Xcode Organizer** ou **Transporter**
para o **App Store Connect**.

### Publicar na App Store

1. Conta **Apple Developer Program** (US$ 99/ano).
2. Criar o app no **App Store Connect** com o bundle id `com.m2autohub.m2Admin`.
3. Subir o `.ipa`, preencher ficha e enviar para revisão.

---

## CI na nuvem — GitHub Actions (APK + IPA)

Há um workflow em `.github/workflows/mobile-build.yml` que gera **APK** (runner
Linux) e **IPA** (runner macOS — a Apple exige macOS para compilar iOS) e anexa
os arquivos como *artifacts* do build.

### Como rodar

- **Manual:** aba **Actions** → *Mobile Build (APK + IPA)* → *Run workflow*
  (dá para informar a `API_BASE_URL`).
- **Por tag:** `git tag v1.0.0 && git push origin v1.0.0` dispara o build.

Ao terminar, baixe os artifacts `app-release-apk` e `app-release-ipa` na página
do run.

### Verdade sobre "IPA para instalar no iPhone"

Diferente do Android, **o iOS não instala um `.ipa` não assinado** — nem para
teste. Todo app precisa ser assinado por um certificado da sua conta Apple e o
device precisa estar autorizado. Sem os secrets abaixo, o workflow ainda roda,
mas produz um artefato **não assinado** que só serve para confirmar que o build
compila (não instala em aparelho).

Para um IPA **instalável em iPhones de teste**, use **Ad Hoc**:

1. Conta **Apple Developer** (US$ 99/ano).
2. No portal da Apple, registre os **UDIDs** dos iPhones de teste.
3. Crie um **certificado de distribuição** (`.p12`) e um **provisioning profile
   Ad Hoc** que inclua esses UDIDs e o bundle id `com.m2autohub.m2Admin`.
4. Em `ios/ExportOptions.plist`, ajuste `teamID` (seu Team ID) e mantenha
   `method = ad-hoc`.
5. Cadastre os **secrets** no GitHub (Settings → Secrets and variables → Actions):

   | Secret | Conteúdo |
   |---|---|
   | `IOS_CERTIFICATE_BASE64` | `.p12` em base64 (`base64 -i cert.p12`) |
   | `IOS_CERTIFICATE_PASSWORD` | senha do `.p12` |
   | `IOS_PROVISION_PROFILE_BASE64` | `.mobileprovision` Ad Hoc em base64 |
   | `IOS_EXPORT_METHOD` | `ad-hoc` |

6. Rode o workflow → o artifact `app-release-ipa` agora instala nos aparelhos
   registrados (via Apple Configurator, Xcode Devices, ou um link de distribuição).

> **Alternativa mais simples que Ad Hoc:** publicar no **TestFlight**
> (`method = app-store` + App Store Connect API key). Testadores instalam pelo
> app TestFlight, sem precisar registrar UDID um a um.

### Testar no iPad SEM pagar a licença (avaliação do cliente)

Para o cliente avaliar o app no iPad dele **antes** de você assinar o Apple
Developer Program, use **sideload com Apple ID grátis** — não precisa de Mac,
CI, nem licença:

1. No Windows, instale o **Sideloadly** (sideloadly.io).
2. Gere o IPA **não assinado** — é o que o workflow já produz quando não há
   secrets iOS (artifact `app-release-ipa` / `app-ios-xcarchive-unsigned`).
   Localmente num Mac seria `flutter build ipa --no-codesign`.
3. Conecte o iPad ao PC, abra o Sideloadly, arraste o `.ipa`, informe um
   **Apple ID grátis** (do cliente ou seu). O Sideloadly assina localmente e
   instala. Ele reescreve o bundle id se houver conflito na conta grátis.

**Limitações da conta grátis (importante alinhar com o cliente):**
- O app **expira em 7 dias** — depois **para de abrir** até ser re-assinado
  (reconectar o iPad ao PC e repetir o passo 3). Não some, mas trava.
- Máximo de **3 apps** sideloadados simultâneos por Apple ID.
- Serve para **demonstração/avaliação de poucos dias**, não para uso contínuo
  com o iPad longe de você. Para uso prolongado, o caminho é a licença + TestFlight.

### Secrets do Android no CI (opcional)

Para o workflow gerar um APK **assinado de release** (igual ao local), cadastre:
`ANDROID_KEYSTORE_BASE64` (a `upload-keystore.jks` em base64),
`ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`.
Sem eles, o CI gera um APK com assinatura de **debug** (instala para teste, mas
não publica na Play Store).

---

## Checklist de "pronto para produção"

- [x] API de produção embutida (`https://m2centerauto.com.br/api`).
- [x] Android assinado com keystore de release.
- [x] Nome, ícone padrão e versão configurados.
- [ ] Backup seguro da keystore Android feito por você.
- [ ] (Opcional) Ícone/splash personalizados da marca (hoje usa o padrão Flutter).
- [ ] Política de privacidade publicada (exigida pelas duas lojas).
- [ ] iOS: build do `.ipa` num Mac/CI com sua conta Apple.
- [ ] Backend: confirmar que aceita requisições do app (CORS/origem — ver nota abaixo).

### Nota sobre CORS/backend

O `CORS_ORIGIN` de produção lista só os domínios web. Apps nativos normalmente
**não enviam header `Origin`**, então não são bloqueados por CORS. Validar o
login do app contra produção após publicar; se houver bloqueio por origem,
ajustar o backend para aceitar requisições sem `Origin` (caso de clients nativos).
