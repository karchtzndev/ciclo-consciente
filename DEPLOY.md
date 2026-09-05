# 🚀 Deploy — estado atual do projeto

## Antes de tudo: 3 passos no Firebase Console

Sem estes três, partes do app não funcionam. São rápidos.

### 1. Publicar as Regras do Firestore ⚠️
`Firestore → Rules` → apague tudo → cole o conteúdo de `firestore.rules` → **Publicar**

Sem isso: não salva registro, não vincula instrutora.

### 2. Ativar login por E-mail/senha e Anônimo ⚠️
`Authentication → Sign-in method` → ative **E-mail/senha** e **Anônimo**

Sem o anônimo: o parceiro não consegue abrir o link compartilhado.

### 3. Autorizar o domínio da Vercel
`Authentication → Settings → Authorized domains` → adicione `ciclo-consciente.vercel.app`

---

## Deploy do código

```bash
git add .
git commit -m "correções: notas, vínculo instrutora/parceiro, regras do Firestore"
git push
```

A Vercel redeploya sozinha.

---

## Roteiro de teste depois do deploy

**Registro diário**
- [ ] Preencher sensação + muco + **uma anotação** → Salvar
- [ ] A anotação foi gravada junto? (era o bug do `onchange`)
- [ ] Editar o mesmo dia e trocar a anotação

**Vínculo instrutora**
- [ ] Conta aluna: Perfil → gerar link → copiar
- [ ] Conta instrutora: colar em "Vincular" → deve dizer "vinculada com sucesso"
- [ ] Abrir o gráfico da aluna

**Parceiro sem conta**
- [ ] Abrir o mesmo link numa aba anônima → gráfico carrega sem pedir login

**Revogação (importante)**
- [ ] Aluna revoga o link
- [ ] Instrutora tenta abrir de novo → deve dar "acesso revogado"

**Offline**
- [ ] Modo avião → registrar um dia → voltar online → sincronizou?

---

## Pendências que continuam abertas

| Item | Bloqueia o quê | Precisa de |
|---|---|---|
| Chave VAPID do FCM | notificação push | Firebase Console → Cloud Messaging |
| Deploy das Cloud Functions | lembrete diário | plano Blaze |
| Variáveis do Stripe na Vercel | pagamento | só quando sair do beta |

Nenhuma delas bloqueia o uso do app agora — o beta roda com tudo liberado
(`__FREE_MODE__ = true`).

---

## Quando for ativar o Premium

1. `index.html` → trocar `window.__FREE_MODE__ = true` por `false`
2. Configurar o Stripe (ver `STRIPE-SETUP-CHECKLIST.md`)
3. Push

A aba de Erros some junto, automaticamente — ela só existe no modo beta.
