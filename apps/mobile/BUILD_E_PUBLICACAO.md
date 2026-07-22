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

### Alternativa sem Mac: CI na nuvem

Compilar o `.ipa` num runner macOS na nuvem:
- **Codemagic** (feito para Flutter, tem integração com App Store Connect), ou
- **GitHub Actions** com `runs-on: macos-latest`.

Ambos exigem que **você** cadastre os segredos da sua conta Apple (certificado
`.p12`, provisioning profile, App Store Connect API key). Sem esses segredos,
nenhuma nuvem consegue assinar em seu nome.

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
