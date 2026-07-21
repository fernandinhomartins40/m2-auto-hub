# M2 Admin — App nativo (Flutter)

Versão nativa (Android/iOS) do **painel administrativo** do M2 Auto Hub,
publicável na Google Play e na App Store. As telas são embutidas no app
(casca offline: abre instantâneo, sem baixar UI da web) e os dados vêm da
**mesma API** do painel web, via `Authorization: Bearer <token>`.

> Não reaproveita o código React de `apps/frontend` — reaproveita a **API**.
> Documentação dos dados: `docs/integracao-erp-dados.md`.

## Stack

- **dio** — HTTP + interceptor Bearer / tratamento de 401
- **flutter_riverpod** (3.x) — estado/injeção
- **go_router** — navegação com guarda de auth
- **flutter_secure_storage** — token no Keychain/Keystore

## Rodando

O app **não** tem URL de API hardcoded. Passe a base via `--dart-define`:

```bash
# Emulador Android apontando para backend local (apps/backend em :3000)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api

# Apontando para a API de produção
flutter run --dart-define=API_BASE_URL=https://SEU_DOMINIO/api
```

Login com credenciais de **admin** reais. Requer o backend com o ajuste que
faz `POST /auth/admin/login` devolver `data.token` (já aplicado em
`apps/backend/.../admin-auth.controller.ts`).

## Estrutura

```
lib/
  main.dart                 # ProviderScope + MaterialApp.router
  app/
    router.dart             # go_router + guarda de auth
    sections.dart           # as ~18 seções do painel (web ↔ app)
  core/
    env.dart                # API_BASE_URL via --dart-define
    providers.dart          # dio, tokenStorage, sinal de 401
    api/                    # dio client, envelope {success,data}, erros
    auth/                   # token storage (secure)
    theme/                  # tema (azul primário do painel web)
  features/
    auth/                   # login + controller + repo
    dashboard/              # home (grade de seções)
    plate_lookup/           # Consulta por Placa (1ª tela de dados real)
    section_placeholder.dart# seções ainda não portadas
```

## Status (roadmap por fases)

- **Fase 0 (feita):** fundação + login real + shell de navegação +
  Consulta por Placa.
- Próximas fases portam as demais seções (produtos, OS, clientes, etc.),
  reusando a fundação. Ver o plano em `.claude/plans/`.

## Verificação

```bash
flutter analyze   # sem issues
flutter test      # testes de model
```
