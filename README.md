# Ciclo Consciente · Método Billings

SPA de acompanhamento do Método de Ovulação Billings (MOB), com:

**Núcleo:**
- **Autenticação real** (Firebase Auth — e-mail/senha, verificação de e-mail, recuperação de senha, modo convidada anônimo)
- **Banco de dados isolado por usuária** (Firestore, protegido por Regras de Segurança)
- **Registro offline** (persistência local do Firestore — funciona sem internet e sincroniza depois)
- **PWA** (instalável, funciona offline para o app-shell)

**Assinatura e notificações:**
- **Assinatura real** do plano Premium (Stripe Checkout + Portal de Cobrança)
- **Lembrete diário por push** (Firebase Cloud Messaging + Cloud Function agendada)

**Conformidade e privacidade:**
- **Conformidade LGPD básica** (consentimento no cadastro, exportação e exclusão de dados)
- **App Check** contra bots (reCAPTCHA v3 na Cloud Function pública)
- **Rate limiting** na criação de links de compartilhamento

**Fidelidade clínica:**
- **Override manual do Ápice** pela usuária
- **Regra do "dia de espera"** pós-relação (fase cautelosa)
- **Padrão Básico Pessoal** para fases especiais (amamentação, perimenopausa, ciclos irregulares)
- **Estatísticas de ciclo** (duração média, dia médio do Ápice, duração da fase lútea) — Premium
- **Alerta de padrão atípico** (ciclo muito longo sem Ápice — sugestão gentil, não diagnóstico)

**Visualização:**
- **Gráfico em calendário mensal** visual com simbologia estilo carimbo clássico Billings — Premium
- **PDF com símbolos** (cores, carimbos) em vez de apenas texto — Premium
- **Onboarding guiado** de 4 slides na primeira vez (pulável)

**Compartilhamento e B2B:**
- **Compartilhamento somente-leitura** com instrutora ou parceiro (link expirável de 30 dias, revogável, máximo 5 ativos, rate limited)
- **Página pública** (`share.html`) para visualizar gráfico compartilhado sem login
- **Painel B2B para instrutoras certificadas** (conta com papel "instrutora", vincula alunas pelo link, visualiza gráficos delas em leitura, gerencia turma)

Front-end estático + duas peças de backend leve: funções serverless no Vercel (`/api`, para o Stripe) e Cloud Functions no Firebase (lembrete agendado + leitura de gráficos compartilhados).

---

## 1. Firebase — Auth + Firestore

1. [console.firebase.google.com](https://console.firebase.google.com) → **Adicionar projeto**.
2. **Authentication → Sign-in method** → ative **E-mail/senha** e **Anônimo**.
3. **Authentication → Templates** → revise o e-mail de verificação/redefinição de senha (opcional, mas recomendado personalizar).
4. **Firestore Database → Criar banco de dados** → modo produção.
5. **Firestore Database → Regras** → cole o conteúdo de [`firestore.rules`](./firestore.rules) e publique.
6. **Configurações do projeto → Seus apps → Web (`</>`)** → copie o `firebaseConfig`.
7. Cole esses valores em **dois lugares** (precisam ficar idênticos):
   - `index.html`, bloco `window.__FIREBASE_CONFIG__`
   - `sw.js`, dentro de `firebase.initializeApp({...})` (perto do fim do arquivo — é o mesmo service worker que cuida do PWA e do push, por isso a config aparece duas vezes no projeto)

Sem isso preenchido, o app mostra uma tela de "Configure o Firebase" em vez de quebrar.

## 2. Firebase Cloud Messaging (notificações push)

1. **Configurações do projeto → Cloud Messaging → Web Push certificates → Gerar par de chaves**.
2. Copie a chave e cole em `index.html`, na variável `window.__FCM_VAPID_KEY__`.
3. Pronto — o toggle "Lembrete diário" na aba Perfil já fica funcional (pede permissão do navegador e salva o token em `users/{uid}.fcmToken`).

### Cloud Function do lembrete (opcional, requer plano Blaze)
O envio efetivo da notificação todo dia às 20h é feito por uma função agendada, que roda fora do Vercel:
```bash
npm i -g firebase-tools
firebase login
firebase use --add        # selecione seu projeto
cd functions && npm install && cd ..
firebase deploy --only functions
```
Funções agendadas exigem o plano **Blaze** (pay-as-you-go) — o uso desse projeto fica bem dentro da faixa gratuita mensal do Blaze para poucas centenas de usuárias.

O mesmo comando `firebase deploy --only functions` também publica a função `getSharedChart`, usada pelo compartilhamento com instrutora/parceiro e pelo painel B2B (seção 2.1 abaixo) — não precisa rodar o deploy duas vezes.

O botão "Compartilhar com instrutora ou parceiro" (aba Perfil) e o painel de instrutoras não usam Regras do Firestore para a leitura entre contas — isso é proposital: regras de segurança conseguem validar "sou o dono deste documento", mas não conseguem validar "este código aleatório que estou apresentando é um link de compartilhamento válido". Essa checagem acontece na Cloud Function `getSharedChart`, com o Admin SDK.

1. Depois de rodar `firebase deploy --only functions` (seção 2 acima), copie a URL impressa no terminal para a função `getSharedChart` (algo como `https://us-central1-SEU_PROJETO.cloudfunctions.net/getSharedChart`).
2. Cole essa URL em **dois lugares**:
   - `index.html`, variável `window.__FUNCTIONS_BASE_URL__`
   - `share.html`, variável `window.__FUNCTIONS_BASE_URL__`
3. Pronto — usuárias podem gerar links em Perfil, e instrutoras (contas criadas com o papel "Instrutora certificada" no cadastro) podem colá-los no painel para vincular alunas.

## 2.2. App Check (proteção contra bots) — opcional, mas recomendado

O compartilhamento usa uma Cloud Function pública. Sem proteção, um bot conseguiria varrer IDs de compartilhamento por força bruta. O Firebase App Check, com reCAPTCHA v3, reduz drasticamente esse risco.

1. Firebase Console > App Check > **Registrar um novo app Web** → selecione seu app web.
2. Escolha **reCAPTCHA v3** como provedor.
3. Crie uma chave reCAPTCHA (console.cloud.google.com, APIs, keys) — será usada aqui e também na Cloud Function.
4. Cole a chave em **três lugares**:
   - `index.html`, `window.__APPCHECK_SITE_KEY__`
   - `share.html`, `window.__APPCHECK_SITE_KEY__`
   - `functions/index.js`, edite a linha da função `getSharedChart` e troque `// enforceAppCheck: true` por `enforceAppCheck: true` (descomente)
5. Deploy novamente: `firebase deploy --only functions`.

Enquanto o App Check não estiver configurado, a Cloud Function funciona normalmente (o código trata a falta de App Check gracefully) — então o app não quebra se você pular essa etapa de primeira. Mas recomendamos ativar depois.

## 3. Stripe — assinatura do Plano Pro

1. [dashboard.stripe.com](https://dashboard.stripe.com) → modo **Test** para começar.
2. **Product catalog** → crie o produto "Plano Pro", com um **Price** recorrente mensal (ex.: R$ 19,90). Copie o **Price ID** (`price_...`).
3. **Developers → API keys** → copie a **Secret key** (`sk_test_...`).
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://SEU-APP.vercel.app/api/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copie o **Signing secret** (`whsec_...`).
5. **Settings → Billing → Customer portal** → ative o portal (permite à usuária cancelar/trocar cartão).

### Firebase Admin (necessário para o backend Stripe atualizar o Firestore)
1. **Configurações do projeto → Contas de serviço → Gerar nova chave privada** → baixa um JSON.
2. Converta para base64 numa linha só:
   ```bash
   base64 -i service-account.json | tr -d '\n' > service-account.b64
   ```
3. Use o conteúdo desse arquivo na variável `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` (passo 4 abaixo).

## 4. Variáveis de ambiente no Vercel

**Project → Settings → Environment Variables**, adicione (veja também [`.env.example`](./.env.example)):

| Nome | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_ID` | `price_...` |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | conteúdo do `service-account.b64` |
| `APP_URL` | `https://seu-app.vercel.app` (sem barra no final) |

Depois de adicionar, faça um novo deploy para as variáveis entrarem em vigor.

## 5. Deploy no Vercel

```bash
npm i -g vercel
cd ciclo-consciente-billings
vercel --prod
```
Ou importe o repositório em [vercel.com/new](https://vercel.com/new) — Framework Preset **Other**, sem build command. As funções em `/api` são detectadas automaticamente.

## 6. Autorizar o domínio no Firebase

Depois do deploy, copie a URL gerada e adicione em:
**Firebase Console → Authentication → Settings → Authorized domains → Add domain**

Sem isso, login funciona em `localhost` mas falha em produção.

## 7. Testar o fluxo de pagamento

```bash
stripe listen --forward-to https://SEU-APP.vercel.app/api/stripe-webhook
stripe trigger checkout.session.completed
```
Use o [cartão de teste](https://stripe.com/docs/testing) `4242 4242 4242 4242`, qualquer validade futura e CVC.

---

## Estrutura do projeto
```
.
├── index.html                    # aplicação completa (HTML + Tailwind + JS + Firebase SDK)
├── share.html                    # visualização somente-leitura do gráfico (link compartilhado)
├── privacy.html / terms.html     # política de privacidade e termos (linkados no cadastro)
├── manifest.json / sw.js         # PWA (instalável, offline) + push do FCM em segundo plano
├── icons/                        # ícones do app
├── firestore.rules               # isolamento de dados por usuária + regras de compartilhamento
├── api/                          # funções serverless do Vercel
│   ├── create-checkout-session.js
│   ├── create-portal-session.js
│   └── stripe-webhook.js
├── lib/firebaseAdmin.js          # Firebase Admin SDK compartilhado pelas funções acima
├── functions/                    # Cloud Functions do Firebase
│   └── index.js                  #   - dailyReminder (agendada) + getSharedChart (HTTPS)
├── vercel.json / package.json / .env.example
└── README.md
```

## Isolamento de dados por usuária
- **Autenticação:** Firebase Auth gera um `uid` único por conta.
- **Dados:** cada registro fica em `users/{uid}/records/{data}` — nunca numa coleção compartilhada.
- **Segurança:** `firestore.rules` recusa qualquer leitura/escrita onde `request.auth.uid` não bate com o `{userId}` do caminho.
- **Compartilhamento controlado:** links gerados em Perfil (`shares/{shareId}`) são a única forma de ler dados de outra conta, sempre com expiração de 30 dias e revogáveis a qualquer momento — validados por Cloud Function, nunca por leitura direta do Firestore.
- **LGPD:** aba Perfil tem "Exportar meus dados" (baixa um JSON com tudo) e "Excluir minha conta" (apaga perfil + registros + a conta de login, permanentemente).

## Contas de instrutora (painel B2B)
No cadastro, a pessoa escolhe "Aluna" ou "Instrutora certificada". Contas de instrutora veem um painel diferente (sem os módulos Free/Premium): vinculam alunas colando o link/código que elas geraram em Perfil, e visualizam os gráficos correspondentes em modo leitura. Hoje esse painel é gratuito para instrutoras — um plano pago específico para instrutoras (múltiplas turmas, exportação em lote, etc.) é uma extensão natural futura.

## Login de demonstração
Botão **"Entrar como Convidada"** — cria uma conta anônima nova por navegador, populada com ~34 dias de histórico de exemplo. Contas convidadas não podem assinar o Plano Pro, ativar notificações nem gerar links de compartilhamento (precisam virar conta com e-mail/senha primeiro).

## Onboarding e visualização (Premium)
- **Onboarding guiado:** modal de 4 slides na primeira vez que uma aluna se registra, explicando sensação vulvar, aspecto do muco, cores (verde/amarelo/vermelho) e o papel da instrutora certificada — completamente pulável.
- **Estatísticas de ciclo:** após 2+ ciclos completos, aba Gráfico mostra duração média, dia médio do Ápice e duração da fase lútea em cards numerados — sem nunca fazer diagnóstico, apenas informação descritiva.
- **Alerta de padrão atípico:** se um ciclo passa de 45 dias sem Ápice identificado, aviso gentil sugerindo conversar com a instrutora ou profissional de saúde.
- **Calendário visual mensal:** toggle "Lista/Calendário" na aba Gráfico, mostrando uma grade tradicional Billings com simbologia de cores e carimbo (7 colunas, sem rótulos de dia).
- **PDF com símbolos:** exportação em PDF desenha círculos coloridos (carimbo de cores) em vez de só texto, mais fiel ao gráfico clássico, com legenda incluída.

## Limites do plano gratuito do Firebase (Spark)
Auth e Firestore ficam confortavelmente dentro do free tier para ~200 usuárias. A Cloud Function agendada (lembrete diário) exige o plano Blaze, mas o custo real tende a ficar em centavos/mês nessa escala.
