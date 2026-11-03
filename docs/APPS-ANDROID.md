# Apps Android: Cliente e Mecânico

Apps nativos em Flutter que substituem os PWAs do cliente e do mecânico no Android. As telas ficam dentro do app e os dados vêm da mesma API do site, com `Authorization: Bearer` no lugar do cookie. O app `apps/mobile` (M2 Admin) é separado e não mudou.

| | Cliente | Mecânico |
|---|---|---|
| Pasta | `apps/mobile_cliente` | `apps/mobile_mecanico` |
| Nome na loja | M2 Center Auto | M2 Mecânico |
| Application ID | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
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

Use o Flutter **3.32.8**, a mesma versão do CI.

## Validar

```bash
flutter analyze
flutter test
```

Rodar nas três pastas: `packages/mobile_core`, `apps/mobile_cliente` e `apps/mobile_mecanico`.

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

### AAB pelo GitHub Actions

Actions → *Mobile Android (Cliente e Mecânico)* → *Run workflow*, escolhendo o app. Cadastre antes estes secrets:

| Secret | Conteúdo |
|---|---|
| `ANDROID_CLIENTE_KEYSTORE_BASE64` | `base64 -w0 upload-keystore.jks` do cliente |
| `ANDROID_CLIENTE_KEYSTORE_PASSWORD` | `storePassword` do `key.properties` do cliente |
| `ANDROID_MECANICO_KEYSTORE_BASE64` | o mesmo, do mecânico |
| `ANDROID_MECANICO_KEYSTORE_PASSWORD` | o mesmo, do mecânico |

## Publicar na Google Play

Para cada app:

1. Criar o app no Play Console, em português do Brasil, como **App**, **Gratuito**.
2. Enviar o AAB em **Teste interno** e instalar pelo link da Play em um aparelho real.
3. Deixar a **Assinatura de apps do Google Play** ativa.
4. Preencher a ficha com os arquivos de `store/` (ícone 512 e destaque 1024x500) e ao menos duas capturas de tela do celular.
5. Em **Conteúdo do app**, preencher:
   - Política de privacidade: `https://m2centerauto.com.br/privacidade`
   - Segurança dos dados: ver abaixo
   - Acesso a apps: informar uma conta de teste
   - Classificação de conteúdo, público-alvo e anúncios (não há anúncios)
6. Promover para produção.

### Exclusão de conta (app do cliente)

No Console, informe `https://m2centerauto.com.br/privacidade#excluir-conta`. No app, o caminho é Conta → Privacidade → Excluir minha conta.

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
