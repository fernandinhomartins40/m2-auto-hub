# App Store Connect: respostas para configurar os dois apps

Respostas para cada tela do **App Store Connect** ao criar e enviar os apps. Elas descrevem o que os apps fazem de fato hoje (versão 1.0.0). Se um app passar a coletar outro dado ou usar um SDK novo (Firebase, analytics, anúncios), revise a seção **Privacidade do app**, o arquivo `ios/Runner/PrivacyInfo.xcprivacy` e o aviso de privacidade.

As regras por trás de cada resposta, com link e data da conferência, estão em [apps-nativos/CONFORMIDADE.md](apps-nativos/CONFORMIDADE.md).

| | Cliente | Mecânico |
|---|---|---|
| Nome na loja | M2 Auto Center | M2 Auto Center - Mecânico |
| Bundle ID | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
| SKU (só uso interno) | `m2-cliente` | `m2-mecanico` |
| Idioma principal | Português (Brasil) | Português (Brasil) |
| Aparelhos | Só iPhone | Só iPhone |
| iOS mínimo | 15.0 | 15.0 |
| Distribuição | Pública na App Store | Pública na App Store (decisão do dono em 14/11/2026) |
| Build | Enviado pelo workflow *Apps nativos - release* (ver [APPS-NATIVOS.md](APPS-NATIVOS.md)) | idem |

## Antes de começar

1. Conta no Apple Developer Program ativa.
2. O site e a API deste branch publicados em produção. O revisor lê o aviso de privacidade e testa a exclusão de conta: os dois precisam estar na versão nova (a página tem de mostrar a seção **Aplicativos para iPhone e Android**).
3. Contas de demonstração criadas em produção (ver seção 5).
4. Capturas de tela tiradas no iPhone ou no simulador do iOS, com a conta de demonstração.

## 1. Criar o app

Em **Apps → + → Novo app**:

| Campo | Cliente | Mecânico |
|---|---|---|
| Plataforma | iOS | iOS |
| Nome | M2 Auto Center | M2 Auto Center - Mecânico |
| Idioma principal | Português (Brasil) | Português (Brasil) |
| Bundle ID | `br.com.m2centerauto.cliente` | `br.com.m2centerauto.mecanico` |
| SKU | `m2-cliente` | `m2-mecanico` |
| Acesso de usuário | Acesso total | Acesso total |

Em **Preços e disponibilidade**:

- **Preço:** Grátis.
- **Disponibilidade:** só **Brasil**. Publicar na União Europeia exige declarar o status de comerciante (trader), e os apps só atendem no Brasil.
- **Mecânico:** deixe como público na App Store. A distribuição não listada é pedida depois, por formulário (seção 7). **Não** escolha distribuição privada pelo Apple Business: depois disso o app não pode virar não listado sem criar outro registro.

## 2. Informações do app e ficha

### Comum aos dois

- **URL de suporte:** `https://www.m2centerauto.com.br/#contato`
- **URL de marketing:** `https://www.m2centerauto.com.br`
- **URL da política de privacidade:** `https://www.m2centerauto.com.br/privacidade`
- **Direitos autorais:** `2026 M2 Center Auto`
- **Conteúdo de terceiros:** Não.

Não cite Android, Google Play nem outras lojas nos textos e nas imagens (regra 2.3.10).

### App do cliente: M2 Center Auto

- **Subtítulo** (30 de 30 caracteres): `Revisões, orçamentos e pedidos`
- **Categoria principal:** Estilo de vida
- **Categoria secundária:** Utilidades
- **Palavras-chave** (92 de 100):

  ```
  oficina,revisão,carro,autopeças,orçamento,mecânica,manutenção,veículo,fidelidade,FIPE
  ```

- **Texto promocional** (opcional, pode mudar sem nova versão):

  ```
  Acompanhe revisões, aprove orçamentos e veja seus pedidos da M2 Center Auto direto no iPhone.
  ```

- **Descrição:**

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

### App do mecânico: M2 Mecânico

- **Subtítulo** (29 de 30 caracteres): `Checklist e ordens de serviço`
- **Categoria principal:** Negócios
- **Categoria secundária:** Produtividade
- **Palavras-chave** (90 de 100). O app não listado não aparece na busca, mas o campo é obrigatório:

  ```
  checklist,oficina,revisão,ordem de serviço,OS,placa,orçamento,mecânica,veículo,equipe
  ```

- **Texto promocional:** deixe em branco.
- **Descrição:**

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

### Imagens

- **Ícone:** vem do build (1024 × 1024, sem transparência). Não há envio separado.
- **Capturas do iPhone:** de 1 a 10, PNG ou JPG sem transparência. A Apple exige o tamanho **iPhone com Dynamic Island (tela média)**: 1206 × 2622 (ou 1179 × 2556). Envie o mesmo conjunto também em **1320 × 2868** (Dynamic Island, tela grande), porque a página da Apple é ambígua sobre esse tamanho. Os outros tamanhos a Apple reduz sozinha.
- **iPad:** não precisa. Os apps são só iPhone.
- Use só capturas reais, tiradas com a conta de demonstração. As artes de `store/artes-ia/` não servem.

## 3. Privacidade do app

Em **App → Privacidade do app**:

- **URL da política de privacidade:** `https://www.m2centerauto.com.br/privacidade`
- **Vocês ou seus parceiros coletam dados deste app?** Sim (nos dois).

Em todos os tipos abaixo, responda:

- **Finalidade:** Funcionalidade do app.
- **Vinculado à identidade do usuário?** Sim.
- **Usado para rastreamento?** Não.

Não marque nenhuma outra finalidade (publicidade, análise, personalização). Os apps não têm anúncios, analytics nem SDK de terceiros que colete dados.

### App do cliente

| Categoria | Tipo | Observação |
|---|---|---|
| Informações de contato | Nome | Cadastro |
| Informações de contato | Endereço de e-mail | Cadastro e login |
| Informações de contato | Número de telefone | Cadastro e login |
| Informações de contato | Endereço físico | Endereços de entrega, opcional |
| Identificadores | ID do usuário | ID da conta |
| Compras | Histórico de compras | Pedidos e orçamentos |
| Conteúdo do usuário | Suporte ao cliente | Atendimentos abertos no app |
| Outros dados | Outros tipos de dados | CPF (opcional) e dados dos veículos |

Não marque: localização, contatos, saúde, finanças (não há pagamento no app), histórico de navegação, histórico de busca, identificadores do aparelho, dados de uso, diagnósticos, fotos.

O cadastro de veículo consulta a tabela FIPE pública (`fipe.parallelum.com.br`) só com códigos de marca, modelo e ano. Nenhum dado da pessoa vai para a FIPE e não há código da FIPE dentro do app, então isso não entra nos rótulos.

### App do mecânico

| Categoria | Tipo | Observação |
|---|---|---|
| Informações de contato | Nome | Conta criada pela oficina |
| Informações de contato | Endereço de e-mail | Login |
| Informações de contato | Número de telefone | Opcional, no perfil |
| Identificadores | ID do usuário | ID da conta |
| Conteúdo do usuário | Fotos ou vídeos | Foto da placa, enviada só para leitura e não guardada |
| Outros dados | Outros tipos de dados | Checklists, observações e ordens de serviço feitos pelo mecânico |

A foto da placa não fica guardada, e pela definição da Apple isso poderia ficar de fora. Ela está declarada para ficar igual ao `PrivacyInfo.xcprivacy` e à "Segurança dos dados" da Play.

Os dados de clientes e veículos que o mecânico digita pertencem aos clientes da oficina e estão descritos no aviso de privacidade.

### Coerência com o `PrivacyInfo.xcprivacy`

O arquivo de cada app (`apps/mobile_*/ios/Runner/PrivacyInfo.xcprivacy`) lista os mesmos tipos destas tabelas. Se mudar um, mude o outro.

## 4. Classificação etária

Em **Informações do app → Classificação etária → Editar**. Mesmas respostas para os dois apps.

| Seção | Pergunta | Resposta |
|---|---|---|
| Controles no app | Controles parentais | Não |
| Controles no app | Verificação de idade (Age Assurance) | Não |
| Recursos | Acesso irrestrito à web | Não. Os links abrem o navegador do sistema, fora do app. |
| Recursos | Conteúdo gerado por usuários | Não |
| Recursos | Redes sociais (Social Media) | Não. Não há feed nem troca de conteúdo entre usuários. |
| Recursos | Mensagens e bate-papo | Não. O suporte é uma conversa com a loja, não entre usuários. |
| Recursos | Publicidade | Não |
| Recursos | Localização compartilhada (Shared Location) | Não. Os apps não usam localização. |
| Recursos | Namoro e relacionamentos (Dating and Relationships) | Não |
| Temas adultos | Palavrões, terror, álcool, tabaco ou drogas | Nenhum |
| Médico ou bem-estar | Informação médica, saúde ou bem-estar | Nenhum |
| Sexualidade ou nudez | Todos | Nenhum |
| Violência | Todos, incluindo armas | Nenhum |
| Atividades de sorte | Apostas, apostas simuladas, concursos, caixas de recompensa | Nenhum. Os pontos de fidelidade não são sorteio. |

Resultado esperado: **4+** e, no Brasil, **L** (livre).

As perguntas de **Localização compartilhada** e **Namoro** entram no questionário em 16/11/2026 e são obrigatórias para todos os apps até 12/01/2027. Se o primeiro envio for antes de 16/11, volte ao questionário depois dessa data e responda as duas.

## 5. Informações para a revisão (App Review Information)

### Conta de demonstração

Marque **Login obrigatório** e preencha com as contas de demonstração. **A senha não fica neste documento**: o repositório é público. Ela está nos secrets do GitHub:

| | Cliente | Mecânico |
|---|---|---|
| Usuário | secret `DEMO_CLIENTE_LOGIN` | secret `DEMO_MECANICO_LOGIN` |
| Senha | secret `DEMO_CLIENTE_SENHA` | secret `DEMO_MECANICO_SENHA` |

Regras para as contas:

- Criadas em produção, com dados fictícios. Nunca use cliente ou funcionário real.
- Sem verificação em duas etapas e com senha que não expira.
- **Cliente:** um veículo, uma revisão com checklist, um orçamento aguardando aprovação e um pedido.
- **Mecânico:** papel Mecânico (STAFF), uma revisão agendada e uma ordem de serviço aberta.
- Se o revisor testar a exclusão com a conta do cliente, ela deixa de existir. Antes de cada novo envio, confira se a conta ainda entra e recrie se for preciso.

### Contato

Nome, telefone e e-mail de quem responde à Apple durante a revisão. Use `contato@m2centerauto.com.br` ou o e-mail do responsável.

### Notas para o revisor

As notas podem ficar em inglês, que é o idioma da equipe de revisão.

**Cliente:**

```
M2 Center Auto is the customer app of an auto repair shop and auto parts store in Brazil. The app is in Portuguese.

Sign in with the demo account above (email and password, no two-factor authentication). The account has a vehicle, a revision with its checklist, a quote awaiting approval and an order.

Account deletion (Guideline 5.1.1(v)): Mais (bottom bar) > Privacidade > "Excluir minha conta". After confirmation the account is deleted immediately and the user is signed out. Personal data is erased or anonymized; invoices and service records are kept without personal data for the period required by Brazilian law, as the app and the privacy notice explain. If you delete the demo account, you can create a new one on the sign-in screen ("Criar conta").

Data download: Mais > Privacidade > "Baixar meus dados" exports the account data as a JSON file.

Purchases: the app does not sell digital content. Buying auto parts (physical goods) opens our website in the browser (Guideline 3.1.3(e)). Quotes are for repair services performed at the shop.
```

**Mecânico:**

```
M2 Mecânico is the internal app for the staff (mechanics) of the M2 Center Auto repair shop in Brazil. The app is in Portuguese.

This app is intended for UNLISTED distribution: only shop employees will receive the link. We will submit the unlisted distribution request after this submission.

There is no sign-up in the app: employee accounts are created and closed by the shop manager in the web admin panel. For that reason the app does not offer account creation or self-service account deletion. Employees can ask the manager to close their account; the privacy notice in the app (Perfil > "Aviso de privacidade") explains this.

Sign in with the demo mechanic account above. It has a scheduled revision (Revisões) with a checklist and an open service order (Ordens de serviço).

Camera: Ordens de serviço > "Nova OS" > "Ler placa" > photograph the license plate. The photo is sent to our server only to read the plate and is not stored.
```

## 6. Exportação de criptografia

Os dois `Info.plist` já têm `ITSAppUsesNonExemptEncryption = false`. Os apps só usam a criptografia do próprio sistema (HTTPS). Com essa chave, o App Store Connect não pergunta nada a cada build. Se perguntar, responda que o app **não usa criptografia além da isenta** (só HTTPS do sistema).

## 7. Distribuição não listada do mecânico

O app não listado não aparece na busca, nas categorias nem nas listas da App Store. Só instala quem tem o link. Passa pela mesma revisão de um app público.

1. Crie o app como público (seção 1), com disponibilidade só no Brasil.
2. Preencha ficha, privacidade, classificação etária e informações para a revisão como acima. As notas para o revisor já avisam que o app é para distribuição não listada.
3. Envie o build para revisão. Em **Liberação da versão**, escolha **Liberar esta versão manualmente**, para o app não ficar público antes do pedido ser aceito.
4. Com o app já enviado à revisão, entre com a conta do titular (Account Holder) em `https://developer.apple.com/contact/request/unlisted-app/` e preencha o formulário. Informe o nome do app, o Apple ID do app (número em **Informações do app**) e o motivo. Sugestão de texto:

   ```
   M2 Mecânico is an internal tool for the mechanics of our auto repair shop. It is only useful to our employees, whose accounts are created by the shop manager. We want to share it with the staff by direct link and keep it out of search and charts.
   ```

5. A Apple responde por e-mail. Pedidos são recusados se o app não estiver enviado à revisão ou estiver em versão beta.
6. Com o pedido aceito e a revisão aprovada, libere a versão. O link fica em **Informações do app** (ou no e-mail da Apple). Envie à equipe por WhatsApp ou e-mail, sem encurtador.
7. Qualquer pessoa com o link instala o app, mas sem uma conta criada pela oficina não passa do login.

Para atualizações, envie novas versões normalmente: o app continua não listado.

## 8. Envio da versão

1. Rode o workflow **Apps nativos - release** com a plataforma `ios` (ou `ambos`). O build chega ao App Store Connect em até 30 minutos.
2. Em **TestFlight**, instale em um iPhone real e confira login, telas e, no cliente, a exclusão com uma conta de teste descartável.
3. Na página da versão **1.0.0**, escolha o build.
4. **Novidades desta versão:** `Primeira versão do app.`
5. Confira capturas, privacidade, classificação etária e informações da revisão. Clique em **Adicionar para revisão** e **Enviar para revisão**.
6. Depois da aprovação, cadastre o link da App Store do app no painel de versão mínima (hoje o endereço do iOS está vazio), para o aviso "Atualize o app" levar à loja certa.

Nas próximas versões, aumente a versão em `pubspec.yaml` quando mudar algo visível ao usuário. O número de build sai do workflow (veja [APPS-NATIVOS.md](APPS-NATIVOS.md)).

## 9. Prazos que já estão marcados

| Data | O que muda | Efeito nos apps |
|---|---|---|
| 16/11/2026 | Perguntas de localização compartilhada e namoro no questionário de classificação | Responder "Não" (seção 4) |
| 12/01/2027 | Todas as apps precisam ter essas respostas | Idem |
| Abril de 2027 | Envio só com SDK do iOS 27 e alvo mínimo iOS 15 | Antes disso: subir o Flutter para uma versão com suporte ao Xcode 27, trocar o CI e o alvo para iOS 15 |
