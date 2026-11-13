# Teste de ponta a ponta dos apps (Cliente e Mecânico)

O teste abre os apps de verdade num **Android virtual** (emulador) e num
**iPhone virtual** (simulador), faz login e passa por todas as telas
principais. Tudo roda no GitHub Actions, nunca no seu computador.

O app conversa com um **backend de teste** que nasce e morre dentro do
próprio job: um banco Postgres vazio, preenchido com as contas e os dados
fictícios do seed. **Não toca em produção** e não usa nenhuma senha real.

## Como disparar

```
gh workflow run mobile-apps-e2e.yml --ref apps-nativos
```

Ele também roda sozinho a cada push no branch `apps-nativos` e nos branches
`wip/...`. Para acompanhar: aba **Actions** do GitHub, workflow
"Apps nativos - teste de ponta a ponta".

São quatro jobs: Android Cliente, Android Mecânico, iOS Cliente e iOS
Mecânico. Se qualquer tela mostrar erro, travar carregando ou o app
quebrar, o job fica **vermelho**.

## Onde ver as imagens

No fim de cada execução, na página do workflow, em **Artifacts**:

- `e2e-android-cliente`, `e2e-android-mecanico`
- `e2e-ios-cliente`, `e2e-ios-mecanico`

Cada um é um .zip com uma imagem por tela (`01-login.png`,
`02-esqueci-a-senha.png`...) e o `backend.log`, que ajuda a achar a causa
quando algo falha. As imagens são guardadas mesmo quando o teste falha.

## Contas usadas (fictícias, do seed)

- Cliente: `joao.silva@email.com`, senha `Test123!`
- Mecânico: `mecanico@moria.com`, senha `Test123!`

O arquivo `apps/backend/prisma/seeds/ci-e2e.ts` cria, só no teste, o que o
seed normal não garante: uma revisão concluída e uma em andamento do João
com o mecânico, uma ordem de serviço aberta, um orçamento esperando
aprovação e um chamado de suporte.

## O que é testado

**App Cliente:** login, esqueci a senha, início, orçamento (detalhe e
aprovação), compras (pedidos e detalhe do pedido, orçamentos), veículos e
tela de cadastro de veículo, revisões e detalhe da revisão, suporte (lista,
chamado aberto e novo chamado), menu "Mais", benefícios (favoritos e
cupons), conta (dados pessoais, segurança, endereços, notificações), alterar
senha, privacidade e a confirmação de excluir conta. O teste abre essa
confirmação e toca em **Voltar**: a conta **não** é excluída.

**App Mecânico:** login, esqueci a senha, revisões, detalhe da revisão com
o botão Exportar PDF (e confere que o servidor devolve um PDF de verdade),
orçamento da revisão (volta sem gerar OS), ordens de serviço e detalhe,
consulta de placa digitando a placa (sem câmera) até a tela de nova OS, e
perfil (dados, estatísticas e histórico).

Em cada tela o teste espera carregar, confere que não apareceu erro e tira
a imagem.

## O que NÃO é testado

- Câmera de verdade (a placa é digitada).
- A janela de compartilhar do celular ao exportar PDF (o PDF é conferido
  direto no servidor).
- Notificações push.
- Compra ou pagamento real.
- Envio de e-mail (esqueci a senha só abre a tela, não envia).
- Envio às lojas (Google Play e App Store).
- Telas que salvam dados além da aprovação do orçamento: cadastrar veículo,
  criar chamado, gerar OS e trocar senha são só abertos, não enviados.

## Arquivos

- `.github/workflows/mobile-apps-e2e.yml`: o workflow.
- `apps/mobile_*/integration_test/app_test.dart`: o roteiro de cada app.
- `apps/mobile_*/integration_test/e2e.dart`: esperar, conferir erro e
  fotografar (cópia igual nos dois apps).
- `apps/mobile_*/test_driver/integration_test.dart`: grava as imagens.
- `apps/backend/prisma/seeds/ci-e2e.ts`: dados extras do teste.
