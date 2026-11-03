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
https://m2centerauto.com.br/privacidade
```

A página cita os dois apps, o que cada um coleta, o uso da câmera no app do mecânico, o e-mail de contato e como excluir a conta. Ela precisa estar no ar antes do envio: abra o endereço no navegador e confira se aparece a seção **Aplicativos para Android**.

## 2. Acesso ao app

Os dois apps só funcionam com login. Escolha **Todas ou algumas funcionalidades estão restritas** e cadastre uma conta de teste para o revisor do Google.

Crie as contas em produção antes de enviar, com dados fictícios e uma senha só para isso. Não use contas de clientes ou funcionários reais.

| | Cliente | Mecânico |
|---|---|---|
| Nome da instrução | Conta de teste | Conta de teste do mecânico |
| Usuário | e-mail ou telefone da conta de teste | e-mail de um usuário com papel Mecânico (STAFF) |
| Senha | senha da conta de teste | senha da conta de teste |
| Outras informações | "Entre com o e-mail e a senha. Não há verificação em duas etapas." | "Conta criada pela oficina. Entre com e-mail e senha. A conta precisa ter ao menos uma revisão agendada para mostrar o checklist." |

Para o mecânico, deixe uma revisão agendada e uma ordem de serviço aberta para a conta de teste. Sem isso, o revisor vê só listas vazias.

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
| Os usuários podem pedir a exclusão dos dados? | Sim |
| Link para exclusão da conta | `https://m2centerauto.com.br/privacidade#excluir-conta` |

**Compartilhamento:** responda **Não** em todos os tipos. Hospedagem, e-mail e o leitor de placas são serviços que trabalham para a M2, e o Google não conta isso como compartilhamento.

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

- **Cliente:** no app, **Mais → Privacidade → Excluir minha conta**. Fora do app, pelo link `https://m2centerauto.com.br/privacidade#excluir-conta` ou pelo e-mail `contato@m2centerauto.com.br`. O prazo de resposta é de até 15 dias.
- **Mecânico:** não há cadastro no app. A oficina encerra a conta pelo painel administrativo. Se o Console pedir um link, use o mesmo do cliente.

## 12. Permissões e serviços

- **Câmera:** o app do mecânico abre a câmera do sistema para fotografar a placa, sem pedir a permissão de câmera. Não há declaração a fazer.
- **Localização, SMS, chamadas, arquivos, serviços em primeiro plano, acessibilidade:** nenhum dos dois usa.
- **ID de publicidade:** **Não**, os apps não usam o ID de publicidade.

## 13. Ficha da loja

### Comum aos dois

- **Categoria:** Auto e veículos
- **Tags:** manutenção de veículos, oficina mecânica, autopeças
- **E-mail de contato:** `contato@m2centerauto.com.br`
- **Site:** `https://m2centerauto.com.br`
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
• Orçamentos: receba, confira cada item e aprove ou recuse direto pelo celular.
• Pedidos: acompanhe suas compras e o status de cada uma.
• Veículos: cadastre seus carros e mantenha o histórico de cada um.
• Benefícios: veja seus pontos de fidelidade e cupons de desconto.
• Ajuda: abra atendimentos, consulte as perguntas frequentes e fale com a loja.
• Privacidade: baixe seus dados ou peça a exclusão da conta quando quiser.

Para usar, crie sua conta grátis ou entre com o mesmo acesso do site m2centerauto.com.br.
```

**Imagens** (pasta `apps/mobile_cliente/store/`):

- **Ícone:** 512 × 512, `icone-ia-512.png` ou `icone-512.png`.
- **Gráfico de destaque:** 1024 × 500, `destaque-ia-1024x500.png` ou `destaque-1024x500.png`.
- **Capturas do telefone:** de 2 a 8 arquivos da pasta `screenshots/`.

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

Nas próximas versões, gere o AAB com um `--build-number` maior (veja [APPS-ANDROID.md](APPS-ANDROID.md)).
