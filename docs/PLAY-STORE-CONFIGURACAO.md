# Play Console: respostas para configurar os dois apps

Respostas para cada seção de **Painel → Configurar seu app** no Play Console. Elas descrevem o que os apps fazem de fato hoje (versão 1.0.0). Se um app passar a coletar outro dado ou usar um SDK novo (Firebase, analytics, anúncios), revise a seção **Segurança dos dados** e o aviso de privacidade.

| | Cliente | Mecânico |
|---|---|---|
| Nome na loja | M2 Center Auto | M2 Mecânico |
| Pacote | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
| AAB | `apps/mobile_cliente/build/app/outputs/bundle/release/app-release.aab` | `apps/mobile_mecanico/build/app/outputs/bundle/release/app-release.aab` |
| Imagens | `apps/mobile_cliente/store/` | `apps/mobile_mecanico/store/` |

## 1. Política de privacidade

Mesmo endereço nos dois apps:

```
https://www.m2centerauto.com.br/privacidade
```

A página cita os dois apps, o que cada um coleta, o uso da câmera no app do mecânico, o e-mail de contato, como excluir a conta e o que fica guardado depois da exclusão.

Antes do envio, publique o site e a API deste branch e abra o endereço no navegador. A seção precisa se chamar **Aplicativos para iPhone e Android**, e a parte **Excluir sua conta** precisa dizer que a exclusão pelo app acontece na hora. Em 12/11/2026 o site no ar ainda mostrava a versão antiga ("Aplicativos para Android" e prazo de 15 dias).

## Antes de criar os apps

- **Verificação de desenvolvedor Android:** desde 30/09/2026, no Brasil, só instalam pelo caminho normal os apps de desenvolvedores verificados, e todo pacote da Play precisa estar registrado. A Google tenta registrar apps novos sozinha, mas não garante. Depois de criar cada app, abra a página inicial do Play Console e a página **Verificação de desenvolvedor Android** e confira se `br.com.m2centerauto.cliente` e `br.com.m2centerauto.mecanico` aparecem como registrados. Se não, registre ali.
- **Teste fechado:** se a conta do Play Console for **pessoal** e criada depois de 13/11/2023, cada app precisa de um teste fechado com pelo menos **12 testadores inscritos sem interrupção por 14 dias** antes de ir para produção. Quem sai e volta reinicia a contagem. Os mesmos 12 podem testar os dois apps. Depois, peça acesso à produção no Painel (a Google responde em até 7 dias). Conta de empresa não tem essa exigência.
- **Páginas de 16 KB:** exigidas para apps com alvo Android 15 ou mais. Teste o AAB final no emulador de 16 KB antes de enviar. Atualizações sem suporte são bloqueadas a partir de 01/02/2027.

As fontes e as datas de cada regra estão em [apps-nativos/CONFORMIDADE.md](apps-nativos/CONFORMIDADE.md).

## 2. Acesso ao app

Os dois apps só funcionam com login. Escolha **Todas ou algumas funcionalidades estão restritas** e cadastre uma conta de teste para o revisor do Google.

Crie as contas em produção antes de enviar, com dados fictícios e uma senha só para isso. Não use contas de clientes ou funcionários reais.

A Google exige que o acesso funcione sempre, de qualquer lugar, possa ser usado várias vezes e não peça código de verificação. Ela pede as instruções em inglês. **A senha não fica neste documento** (o repositório é público): ela está nos secrets do GitHub.

| | Cliente | Mecânico |
|---|---|---|
| Nome da instrução | Demo account | Demo mechanic account |
| Usuário | secret `DEMO_CLIENTE_LOGIN` | secret `DEMO_MECANICO_LOGIN` (papel Mecânico, STAFF) |
| Senha | secret `DEMO_CLIENTE_SENHA` | secret `DEMO_MECANICO_SENHA` |
| Outras informações | "Sign in with email and password. No two-factor authentication. Account deletion: Mais > Privacidade > Excluir minha conta (immediate). If you delete this account, create a new one with Criar conta." | "Staff account created by the shop (there is no sign-up in this app). Sign in with email and password. The account has a scheduled revision with a checklist and an open service order." |

Para o cliente, deixe um veículo, uma revisão com checklist, um orçamento aguardando aprovação e um pedido. Para o mecânico, uma revisão agendada e uma ordem de serviço aberta. Sem isso, o revisor vê só listas vazias.

Se o revisor excluir a conta do cliente, ela deixa de existir na hora. Antes de cada novo envio, confira se a conta ainda entra e recrie se for preciso.

## 3. Anúncios

**Não, meu app não contém anúncios.** Vale para os dois.

## 4. Classificação do conteúdo

Use o mesmo e-mail de contato nos dois: `contato@m2centerauto.com.br`.

- **Categoria:** Todos os outros tipos de app (não é jogo, nem rede social, nem app de notícias).
- **Violência, sexo, linguagem, drogas, apostas, terror:** Não em todas.
- **Os usuários podem interagir ou trocar conteúdo entre si?** Não. O suporte do app do cliente é uma conversa com a loja, não entre usuários.
- **O app compartilha a localização do usuário?** Não.
- **O app permite comprar itens digitais?** Não. A compra de peças abre no site.
- **O app é um navegador ou mecanismo de pesquisa?** Não.

O resultado esperado é **Livre** (L) para os dois.

## 5. Público-alvo e conteúdo

- **Faixa etária:** marque só **18 anos ou mais**. Os dois apps tratam de veículos, compras e trabalho em oficina. Incluir menores de idade traz exigências extras da política Famílias.
- **O app pode atrair crianças sem querer?** Não.

## 6. Apps de notícias

**Não.** Vale para os dois.

## 7. Apps governamentais

**Não.** Vale para os dois.

## 8. Recursos financeiros

**Meu app não oferece nenhum recurso financeiro.** O cliente vê valores de orçamentos e pedidos, mas não paga nem pede crédito dentro do app.

## 9. Saúde

**Meu app não tem recursos de saúde.** Vale para os dois.

## 10. Segurança dos dados

### Visão geral (os dois apps)

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dados exigidos? | Sim |
| Todos os dados são criptografados em trânsito? | Sim (só HTTPS) |
| O app permite que os usuários criem uma conta? | Cliente: **Sim, por cadastro com usuário e senha**. Mecânico: **Não**, a conta é criada pela oficina. |
| Os usuários podem pedir a exclusão dos dados? | Sim. Cliente: pelo app, na hora, ou pelo site e e-mail. Mecânico: pela oficina ou pelo e-mail. |
| Link para exclusão da conta | Cliente: `https://www.m2centerauto.com.br/privacidade#excluir-conta`. Mecânico: o Console não pede, porque o app não permite criar conta. |

**Compartilhamento:** responda **Não** em todos os tipos. Hospedagem, e-mail e o leitor de placas são serviços que trabalham para a M2, e o Google não conta isso como compartilhamento.

**Tabela FIPE:** o cadastro de veículo do cliente consulta a tabela FIPE pública (`fipe.parallelum.com.br`) direto do app, só com os códigos de marca, modelo e ano. Não vai nome, conta, aparelho nem localização, e não há SDK da FIPE no app. Não é dado do usuário, então não entra no formulário. Os dados do veículo que o cliente salva vão para a API da M2 e já estão em "Outras informações".

**Baixar meus dados:** o cliente baixa uma cópia dos dados em JSON pelo app (Mais → Privacidade → Baixar meus dados). O formulário não tem pergunta sobre isso; não muda nenhuma resposta.

### App do cliente: dados coletados

Em todos: coletado, não compartilhado, **não** processado de forma temporária. A finalidade é **Funcionalidade do app** e **Gerenciamento da conta**.

| Categoria | Tipo | Obrigatório ou opcional |
|---|---|---|
| Informações pessoais | Nome | Obrigatório |
| Informações pessoais | Endereço de e-mail | Obrigatório |
| Informações pessoais | Número de telefone | Obrigatório |
| Informações pessoais | IDs de usuário | Obrigatório |
| Informações pessoais | Endereço | Opcional |
| Informações pessoais | Outras informações (CPF e dados dos veículos) | Opcional |
| Informações financeiras | Histórico de compras (pedidos e orçamentos) | Obrigatório |
| Mensagens | Outras mensagens no app (atendimentos de suporte) | Opcional |

Não marque: localização, contatos, fotos, áudio, arquivos, agenda, saúde, atividade no app, navegação na Web, informações do app e desempenho, nem IDs do dispositivo.

### App do mecânico: dados coletados

Finalidade em todos: **Funcionalidade do app**. Nome, e-mail, telefone e IDs de usuário também servem para **Gerenciamento da conta**.

| Categoria | Tipo | Obrigatório ou opcional | Processado temporariamente? |
|---|---|---|---|
| Informações pessoais | Nome | Obrigatório | Não |
| Informações pessoais | Endereço de e-mail | Obrigatório | Não |
| Informações pessoais | Número de telefone | Opcional | Não |
| Informações pessoais | IDs de usuário | Obrigatório | Não |
| Fotos e vídeos | Fotos (leitura de placa) | Opcional | **Sim**: a foto só serve para ler a placa e não fica guardada |

Os dados de clientes e veículos que o mecânico digita pertencem aos clientes da oficina, não ao usuário do app, e já estão descritos no aviso de privacidade.

## 11. Exclusão de conta

- **Cliente, no app:** **Mais → Privacidade → Excluir minha conta**. Depois de confirmar, a conta é excluída **na hora**: os dados pessoais são apagados ou anonimizados, a sessão é encerrada em todos os aparelhos e o app sai para o login.
- **Cliente, fora do app:** pelo link `https://www.m2centerauto.com.br/privacidade#excluir-conta` (no site, Perfil → Privacidade e seus dados → Solicitar eliminação) ou pelo e-mail `contato@m2centerauto.com.br`. Nesses casos a equipe conclui em até 15 dias.
- **O que é apagado:** nome, e-mail, telefone, CPF, data de nascimento, senha, endereços, placa, chassi, cor e município dos veículos, favoritos, notificações e mensagens.
- **O que fica:** notas fiscais e registros de pedidos, orçamentos, revisões, ordens de serviço, pontos e atendimentos, **sem dado pessoal**, pelo prazo da lei fiscal e do consumidor (em regra 5 anos). O prazo precisa da confirmação do jurídico. A Google aceita essa guarda porque o aviso de privacidade a explica.
- **Mecânico:** não há cadastro no app, e a regra de exclusão da Google só vale para apps que criam conta. A oficina encerra a conta pelo painel administrativo; o funcionário pode pedir ao gerente ou pelo e-mail.

## 12. Permissões e serviços

- **Câmera:** o app do mecânico abre a câmera do sistema para fotografar a placa, sem pedir a permissão de câmera. Não há declaração a fazer.
- **Localização, SMS, chamadas, arquivos, serviços em primeiro plano, acessibilidade:** nenhum dos dois usa.
- **ID de publicidade:** **Não**, os apps não usam o ID de publicidade.

## 13. Ficha da loja

### Comum aos dois

- **Categoria:** Auto e veículos
- **Tags:** manutenção de veículos, oficina mecânica, autopeças
- **E-mail de contato:** `contato@m2centerauto.com.br`
- **Site:** `https://www.m2centerauto.com.br`
- **Telefone:** opcional; deixe em branco se não quiser exibir.

### App do cliente: M2 Center Auto

**Descrição curta** (75 de 80 caracteres):

```
Revisões, orçamentos, pedidos e veículos da M2 Center Auto na palma da mão.
```

**Descrição completa:**

```
O app da M2 Center Auto reúne tudo o que você precisa para cuidar do seu carro com a nossa oficina e loja de autopeças.

• Revisões: agende, acompanhe o andamento e veja o checklist completo feito pelo mecânico.
• Orçamentos: receba, confira cada item, aprove ou recuse direto pelo celular e salve em PDF.
• Pedidos: acompanhe suas compras e o status de cada uma.
• Veículos: cadastre seus carros pela tabela FIPE e mantenha o histórico de cada um.
• Favoritos: guarde as peças que interessam e compartilhe a lista.
• Benefícios: veja seus pontos de fidelidade e cupons de desconto.
• Ajuda: abra atendimentos, consulte as perguntas frequentes e fale com a loja pelo WhatsApp.
• Privacidade: baixe seus dados ou exclua sua conta quando quiser, pelo próprio app.

A compra de peças abre a loja no site m2centerauto.com.br.

Para usar, crie sua conta grátis ou entre com o mesmo acesso do site.
```

**Imagens** (pasta `apps/mobile_cliente/store/`):

- **Ícone:** 512 × 512, `icone-ia-512.png` ou `icone-512.png`.
- **Gráfico de destaque:** 1024 × 500, `destaque-ia-1024x500.png` ou `destaque-1024x500.png`.
- **Capturas do telefone:** de 2 a 8, com lados entre 320 e 3840 px e o lado maior até 2 vezes o menor. Para o app aparecer em destaques, use ao menos 4 com 1080 px ou mais. Só capturas reais do app, tiradas com a conta de demonstração: as artes de `artes-ia/` redesenham a tela e não servem.

### App do mecânico: M2 Mecânico

**Descrição curta** (78 de 80 caracteres):

```
Checklist de revisão, orçamentos e ordens de serviço para a equipe da oficina.
```

**Descrição completa:**

```
O M2 Mecânico é o app da equipe da oficina M2 Center Auto. Ele leva para o celular o trabalho do dia a dia na oficina.

• Revisões: veja a fila de agendamentos e comece a revisão com um toque.
• Checklist: marque cada item do veículo, registre observações e salve o andamento.
• Orçamento: transforme os itens com problema em orçamento para o cliente aprovar.
• Ordens de serviço: crie, acompanhe, inicie e conclua as OS atribuídas a você.
• Leitura de placa: fotografe a placa para encontrar o cliente e o veículo na hora.
• PDF: gere o relatório da revisão para enviar ao cliente.
• Perfil: acompanhe suas estatísticas, seu histórico e suas preferências.

Uso restrito à equipe: o acesso é criado pelo gerente da oficina.
```

**Imagens** (pasta `apps/mobile_mecanico/store/`): ícone, gráfico de destaque e de 2 a 8 capturas da pasta `screenshots/`, nos mesmos formatos do cliente.

## 14. Envio da versão

1. Em **Testar e lançar → Produção** (ou **Teste interno** primeiro), clique em **Criar nova versão**.
2. Aceite a **Assinatura de apps do Google Play**.
3. Envie o AAB do app.
4. **Nome da versão:** `1.0.0 (1)`.
5. **Notas da versão:**

   ```
   <pt-BR>
   Primeira versão do app.
   </pt-BR>
   ```

6. Revise e envie para análise. A primeira análise costuma levar de alguns dias a uma semana.

Nas próximas versões, gere o AAB com um `--build-number` maior (veja [APPS-NATIVOS.md](APPS-NATIVOS.md)).
