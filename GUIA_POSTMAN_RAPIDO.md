# 🚀 GUIA RÁPIDO - POSTMAN COM IMPORT DA COLLECTION

**Versão**: 1.0  
**Criado em**: 25 de maio de 2026

---

## 📥 OPÇÃO 1: IMPORTAR COLLECTION AUTOMÁTICA (Mais Fácil)

### Passo 1: Baixar Collection
Arquivo já existe no projeto:
```
Auth_System_Postman_Collection.json
```

### Passo 2: Abrir Postman

### Passo 3: Importar Collection

1. No Postman, clique em **"Import"** (canto superior esquerdo)
2. Selecione **"File"**
3. Navegue até: `Auth_System_Postman_Collection.json`
4. Clique em **Open**
5. Clique em **Import**

### Resultado

Você terá uma Collection com 20 requisições pré-configuradas! ✅

---

## 🎯 USAR A COLLECTION

### Abrir Collection no Postman

Na esquerda, você verá:
```
Collections
├─ Auth System - Semana 1
   ├─ 1 - Health Check
   ├─ 2 - Registrar Usuário (SUCESSO)
   ├─ 2b - Registrar (Email DUPLICADO - Erro)
   ├─ 2c - Registrar (Senha FRACA - Erro)
   ├─ 3 - Login (SUCESSO)
   ├─ 3b - Login (Senha ERRADA - Erro)
   ├─ 3c - Login (Email não existe - Erro)
   ├─ 4 - Logout (COM TOKEN - SUCESSO)
   ├─ 5 - Logout (SEM TOKEN - Erro)
   ├─ 6a - Registrar (Para teste Força Bruta)
   ├─ 6b - Login (Senha ERRADA - Tentativa 1/5)
   ├─ 6c - Login (Senha ERRADA - Tentativa 2/5)
   ├─ 6d - Login (Senha ERRADA - Tentativa 3/5)
   ├─ 6e - Login (Senha ERRADA - Tentativa 4/5)
   ├─ 6f - Login (Senha ERRADA - Tentativa 5/5)
   ├─ 6g - Login (Senha CORRETA - Bloqueado)
   ├─ 7a - Registrar (Email VAZIO - Erro)
   └─ 7b - Registrar (Senha VAZIA - Erro)
```

### Clique em Qualquer Requisição

Por exemplo: **"1 - Health Check"**

Você vai ver:
```
┌────────────────────────────────────────────┐
│ GET                                        │
│ http://localhost:3000/api/auth/ping       │
│                                            │
│ Send | Save | ... | Send and Download     │
└────────────────────────────────────────────┘
```

### Clique em **Send**

Resultado:
```json
{
  "message": "Auth module funcionando 🚀"
}
```

---

## 📋 FLUXO RECOMENDADO COM COLLECTION

### 1️⃣ Primeiros Testes (5 minutos)

1. Clique em **"1 - Health Check"** → **Send**
2. Clique em **"2 - Registrar Usuário (SUCESSO)"** → **Send**
3. Clique em **"3 - Login (SUCESSO)"** → **Send**
   - ⭐ **IMPORTANTE**: Copie o token retornado
4. Clique em **"4 - Logout (COM TOKEN - SUCESSO)"**
   - ⚠️ Substitua o token no header `Authorization`
   - → **Send**

### 2️⃣ Testar Erros (10 minutos)

5. Clique em **"2b - Registrar (Email DUPLICADO - Erro)"** → **Send**
6. Clique em **"2c - Registrar (Senha FRACA - Erro)"** → **Send**
7. Clique em **"3b - Login (Senha ERRADA - Erro)"** → **Send**
8. Clique em **"3c - Login (Email não existe - Erro)"** → **Send**
9. Clique em **"5 - Logout (SEM TOKEN - Erro)"** → **Send**

### 3️⃣ Testar Força Bruta (15 minutos)

10. Clique em **"6a - Registrar (Para teste Força Bruta)"** → **Send**
11. Clique em **"6b - Login (Senha ERRADA - Tentativa 1/5)"** → **Send**
12. Clique em **"6c - Login (Senha ERRADA - Tentativa 2/5)"** → **Send**
13. Clique em **"6d - Login (Senha ERRADA - Tentativa 3/5)"** → **Send**
14. Clique em **"6e - Login (Senha ERRADA - Tentativa 4/5)"** → **Send**
15. Clique em **"6f - Login (Senha ERRADA - Tentativa 5/5)"** → **Send**
16. Clique em **"6g - Login (Senha CORRETA - Bloqueado)"** → **Send**
    - Deve retornar erro "Conta bloqueada"

### 4️⃣ Testar Validações (5 minutos)

17. Clique em **"7a - Registrar (Email VAZIO - Erro)"** → **Send**
18. Clique em **"7b - Registrar (Senha VAZIA - Erro)"** → **Send**

---

## 🔑 COMO USAR O TOKEN (Passo Crítico)

### Problema: Você fez login, recebeu um token, mas como usar?

### Solução: Copiar e Colar

#### Passo 1: Fazer Login
Clique em **"3 - Login (SUCESSO)"** → **Send**

Resultado:
```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcwMzU2ODgwMCwiZXhwIjoxNzAzNTcyNDAwfQ.abcdef123456...",
  "expiresIn": 3600
}
```

#### Passo 2: Copiar o Token
Selecione o valor da chave `token` (a parte começando com `eyJhbGciOi...`) e copie.

#### Passo 3: Colar em Logout
1. Clique em **"4 - Logout (COM TOKEN - SUCESSO)"**
2. Clique na aba **"Headers"**
3. Procure por `Authorization`
4. Cole o token completo após `Bearer `

Exemplo:
```
Key: Authorization
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcwMzU2ODgwMCwiZXhwIjoxNzAzNTcyNDAwfQ.abcdef123456...
```

5. Clique em **Send**

---

## 📝 ALTERNATIVA: USAR VARIÁVEIS DO POSTMAN

Para não precisar copiar/colar toda vez:

### Criar Environment

1. No Postman, clique em **"Environments"** (esquerda)
2. Clique em **"Create"** (botão "+")
3. Nome: `Dev`
4. Adicione variável:
   - **VARIABLE**: `token`
   - **VALUE**: `seu-token-aqui`
   - **INITIAL VALUE**: (deixe em branco)

### Usar a Variável

1. Clique em **"4 - Logout"**
2. Na aba **Headers**, o campo deve ser:
   ```
   Authorization: Bearer {{token}}
   ```
3. Após fazer login, copie o token
4. Clique no Environment `Dev`
5. Cole o token na variável `token`
6. Agora todas as requisições usam `{{token}}` automaticamente!

---

## 🎨 VISUAL: COMO FICA NA TELA

### Collection na Esquerda

```
┌──────────────────────────────┐
│ Collections                  │
├──────────────────────────────┤
│ ▼ Auth System - Semana 1     │
│   ├─ 1 - Health Check        │
│   ├─ 2 - Registrar...        │
│   ├─ 2b - Registrar (Email..│
│   ├─ 2c - Registrar (Senha..│
│   ├─ 3 - Login (SUCESSO)     │ ← Clique
│   ├─ 3b - Login (Erro)       │
│   └─ ...                     │
└──────────────────────────────┘
```

### Requisição no Centro

```
┌────────────────────────────────────────────────────┐
│ 3 - Login (SUCESSO)                                │
├────────────────────────────────────────────────────┤
│ POST http://localhost:3000/api/auth/login │ Send   │
│                                                    │
│ Params │ Headers │ Body │ Tests │ Settings        │
├────────────────────────────────────────────────────┤
│ Body (raw / JSON):                                 │
│ {                                                  │
│   "email": "usuario@example.com",                 │
│   "password": "SecurePassword123!"                │
│ }                                                  │
└────────────────────────────────────────────────────┘
```

### Resposta na Direita

```
┌────────────────────────────────────────────────────┐
│ Response                                           │
├────────────────────────────────────────────────────┤
│ 200 OK │ 234 ms │ 512 B                           │
├────────────────────────────────────────────────────┤
│ {                                                  │
│   "message": "Login realizado com sucesso",       │
│   "token": "eyJhbGci...",                         │
│   "expiresIn": 3600                               │
│ }                                                  │
└────────────────────────────────────────────────────┘
```

---

## 🧪 CHECKLIST DE TESTES COM COLLECTION

```
✅ Pré-requisitos
   ✓ Postman instalado
   ✓ Servidor rodando (npm run dev)
   ✓ Collection importada
   ✓ Port 3000 correto

✅ Testes Básicos
   ✓ 1 - Health Check (200 OK)
   ✓ 2 - Registrar (201 Created)
   ✓ 3 - Login (200 OK com token)
   ✓ 4 - Logout com token (200 OK)
   ✓ 5 - Logout sem token (401 erro)

✅ Testes de Validação
   ✓ 2b - Email duplicado (400 erro)
   ✓ 2c - Senha fraca (400 erro)
   ✓ 3b - Senha errada (401 erro)
   ✓ 3c - Email não existe (401 erro)
   ✓ 7a - Email vazio (400 erro)
   ✓ 7b - Senha vazia (400 erro)

✅ Testes de Segurança
   ✓ 6a-6f - Força bruta (5 tentativas)
   ✓ 6g - Conta bloqueada (erro esperado)

SE TODOS PASSARAM ✅ = TUDO FUNCIONANDO PERFEITAMENTE!
```

---

## 🐛 TROUBLESHOOTING

### "Cannot POST /api/auth/login"
- ❌ Servidor não está rodando
- ✅ Solução: `npm run dev`

### "ECONNREFUSED"
- ❌ Postman não consegue conectar ao servidor
- ✅ Solução: Verificar se port 3000 está correto

### "Bearer undefined"
- ❌ Você não colou o token no header
- ✅ Solução: Copiar token do login e colar após "Bearer "

### "Conta bloqueada"
- ✅ Comportamento esperado após 5 falhas
- ✅ Espere 15 minutos ou resete o DB

### "Email já registrado"
- ✅ Você já registrou esse email
- ✅ Use email diferente: `user2@example.com`

---

## 📸 EXEMPLO PASSO A PASSO

### Passo 1: Importar Collection
```
Postman → Import → Selecione arquivo JSON → Import
```

### Passo 2: Health Check
```
Clique em "1 - Health Check"
Status: 200 OK ✅
```

### Passo 3: Registrar Usuário
```
Clique em "2 - Registrar Usuário (SUCESSO)"
Status: 201 Created ✅
```

### Passo 4: Fazer Login
```
Clique em "3 - Login (SUCESSO)"
Status: 200 OK ✅
Token recebido: eyJhbGci...
```

### Passo 5: Copiar Token
```
Selecione e copie o valor da chave "token"
```

### Passo 6: Colar em Logout
```
Clique em "4 - Logout (COM TOKEN)"
No header Authorization, cole: Bearer eyJhbGci...
Status: 200 OK ✅
```

### Passo 7: Testar Força Bruta
```
Clique em "6a" até "6g" sequencialmente
Últimas 5 tentativas devem retornar 401
6ª tentativa deve retornar "Conta bloqueada" ✅
```

---

## ✨ RECURSO EXTRA: Salvar Respostas

No Postman, você pode salvar respostas para referência:

1. Após receber resposta, clique em **Save Response**
2. Dê um nome: "Sucesso Login"
3. Agora você pode ver respostas anteriores

---

## 🎯 PRÓXIMAS ETAPAS

Após completar todos os testes:

1. ✅ Documentar quaisquer erros encontrados
2. ✅ Fazer commit no Git
3. ✅ Preparar para SEMANA 2 (endpoints 2FA)

---

## 📞 RESUMO FINAL

| O que | Como | Resultado |
|------|------|-----------|
| **Importar Collection** | File → Auth_System_Postman_Collection.json | 20 requisições prontas |
| **Testes Básicos** | Executar testes 1-7 em ordem | Todas devem passar ✅ |
| **Usar Token** | Copiar do login, colar em logout | JWT validado |
| **Força Bruta** | Fazer 5 falhas, depois 1 sucesso | Conta bloqueada ✅ |

---

**Data**: 25 de maio de 2026  
**Status**: Pronto para testar  
**Próximo**: SEMANA 2 (2FA endpoints)

Boa sorte! 🚀
