# 📮 POSTMAN CHEAT SHEET - RÁPIDO E PRÁTICO

---

## 🚀 COMECE AQUI (2 MINUTOS)

### 1. Importar Collection
```
Postman → Import → Auth_System_Postman_Collection.json ✅
```

### 2. Rodar Primeira Requisição
```
Clique: "1 - Health Check" → Send

Esperado: 200 OK
{"message": "Auth module funcionando 🚀"}
```

### 3. Registrar Usuário
```
Clique: "2 - Registrar Usuário" → Send

Body enviado:
{
  "email": "usuario@example.com",
  "password": "SecurePassword123!"
}

Esperado: 201 Created
```

### 4. Fazer Login
```
Clique: "3 - Login" → Send

Body enviado:
{
  "email": "usuario@example.com",
  "password": "SecurePassword123!"
}

Esperado: 200 OK
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGci...",
  "expiresIn": 3600
}
```

### 5. COPIAR TOKEN ⭐
```
Copie a string completa de "token" (começa com eyJ...)
```

### 6. Fazer Logout (com token)
```
Clique: "4 - Logout (COM TOKEN)"
Cola no Header Authorization: Bearer [SEU-TOKEN-AQUI]
Send

Esperado: 200 OK
{"message": "Logout realizado com sucesso"}
```

---

## 🎯 LISTA COMPLETA DE REQUISIÇÕES

### ✅ DEVE PASSAR (Status 200/201)

```
GET  /api/auth/ping
     → 200 OK

POST /api/auth/register
     Email: usuario@example.com
     Senha: SecurePassword123!
     → 201 Created

POST /api/auth/login
     Email: usuario@example.com
     Senha: SecurePassword123!
     → 200 OK (retorna token)

POST /api/auth/logout
     Header: Authorization: Bearer [token]
     → 200 OK
```

### ❌ DEVE FALHAR (Status 400/401)

```
POST /api/auth/register
     Email: usuario@example.com (duplicado)
     Senha: SecurePassword123!
     → 400 Bad Request ("Email já registrado")

POST /api/auth/register
     Email: novo@test.com
     Senha: 123456 (fraca)
     → 400 Bad Request ("Senha fraca...")

POST /api/auth/login
     Email: usuario@example.com
     Senha: WrongPassword123!
     → 401 Unauthorized ("Credenciais inválidas")

POST /api/auth/login
     Email: nao-existe@example.com
     Senha: SecurePassword123!
     → 401 Unauthorized ("Credenciais inválidas")

POST /api/auth/logout
     (SEM header Authorization)
     → 401 Unauthorized ("Token não fornecido")

POST /api/auth/logout
     Header: Bearer INVALID
     → 401 Unauthorized ("Token inválido")
```

---

## 🔐 REQUISITOS DE SENHA

```
✅ VÁLIDA       ❌ INVÁLIDA
─────────────────────────────
SecurePass@1    123456 (sem maiúscula)
MyPass@2024     password (sem maiúscula/número/especial)
Teste@123       PASS@1 (menos de 8 caracteres)
Admin#456       abcdefgh (sem maiúscula/número/especial)
```

**Regra**: 8+ caracteres + Maiúscula + Número + Caractere especial (@$!%*?&)

---

## 🧪 TESTE DE FORÇA BRUTA (15 minutos)

```
Clique "6a - Registrar (Para teste Força Bruta)" → Send
❌ Registrou: bruteforce@test.com com BruteForce123!

Clique "6b - Login (Tentativa 1/5)" → Send
❌ Vai falhar (senha errada)

Clique "6c - Login (Tentativa 2/5)" → Send
❌ Vai falhar (senha errada)

Clique "6d - Login (Tentativa 3/5)" → Send
❌ Vai falhar (senha errada)

Clique "6e - Login (Tentativa 4/5)" → Send
❌ Vai falhar (senha errada)

Clique "6f - Login (Tentativa 5/5)" → Send
❌ Vai falhar (senha errada)

Clique "6g - Login (Senha CORRETA)" → Send
❌ VAI RETORNAR: "Conta bloqueada. Tente novamente em 15 minutos."

✅ PROTEÇÃO ESTÁ FUNCIONANDO!
```

---

## 💡 COMO USAR TOKEN

### Problema
Login retorna token, mas como usar em outro request?

### Solução (Passo a Passo)

1. **Fazer login**: Clique "3 - Login" → Send
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

2. **Copiar token**: Selecione `eyJhbGciOi...` (sem aspas!)

3. **Colar em logout**: 
   - Clique "4 - Logout (COM TOKEN)"
   - Aba "Headers"
   - Campo "Authorization"
   - Cole: `Bearer eyJhbGciOi...`
   - Send

---

## 🔍 ERROS COMUNS

| Erro | Problema | Solução |
|------|----------|---------|
| Connection refused | Servidor off | `npm run dev` |
| Cannot POST /api | Port errado | Verificar `.env` |
| Bearer undefined | Token não colado | Copiar/colar token |
| Email já registrado | Email duplicado | Usar novo email |
| Senha fraca | Requisitos não met | Ver "Requisitos de Senha" |
| Conta bloqueada | 5+ falhas | Esperar 15 min |
| Token inválido | Token expirou | Fazer login novo |

---

## 📋 CHECKLIST FINAL

```
✅ Pré-requisitos
   □ Postman aberto
   □ Servidor rodando (npm run dev)
   □ Collection importada
   □ Port 3000

✅ Testes Básicos (5-10 min)
   □ Health check (200)
   □ Registrar (201)
   □ Login (200 + token)
   □ Logout com token (200)

✅ Testes de Erro (5-10 min)
   □ Email duplicado (400)
   □ Senha fraca (400)
   □ Senha errada (401)
   □ Email não existe (401)
   □ Logout sem token (401)

✅ Teste de Força Bruta (15 min)
   □ 5 tentativas (falham)
   □ 6ª tentativa (bloqueada)

✅ SE TODOS MARCADOS = TUDO OK ✅
```

---

## 🎨 ESTRUTURA POSTMAN

```
Postman
├─ Collections
│  └─ Auth System - Semana 1
│     ├─ 1 - Health Check
│     ├─ 2 - Registrar Usuário
│     ├─ 2b - Registrar (Email Duplicado)
│     ├─ 2c - Registrar (Senha Fraca)
│     ├─ 3 - Login
│     ├─ 3b - Login (Senha Errada)
│     ├─ 3c - Login (Email não existe)
│     ├─ 4 - Logout (COM TOKEN) ⭐
│     ├─ 5 - Logout (SEM TOKEN)
│     ├─ 6a-6g - Testes Força Bruta
│     └─ 7a-7b - Validações
└─ Environments
   └─ Dev (opcional - para guardar token)
```

---

## 🔑 VARIÁVEIS (Opcional)

Se quiser usar variável para token:

1. **Criar Environment**:
   ```
   Environments → Create → "Dev"
   ```

2. **Adicionar Variável**:
   ```
   Variable: token
   Initial Value: (deixe em branco)
   ```

3. **Usar em Requisições**:
   ```
   Authorization: Bearer {{token}}
   ```

4. **Salvar Token após Login**:
   ```
   No ambiente Dev, cole: token = seu-token-aqui
   ```

---

## 🚀 ORDEM RECOMENDADA

**Primeira Vez (15 minutos)**:
1. Health Check
2. Registrar novo usuário
3. Login (copiar token)
4. Logout com token
5. Testar sem token

**Depois (30 minutos)**:
6. Email duplicado
7. Senha fraca
8. Senha errada
9. Email não existe
10. Força bruta (testes 6a-6g)

---

## 📊 RESUMO DE ROTAS

```
GET  http://localhost:3000/api/auth/ping
POST http://localhost:3000/api/auth/register
POST http://localhost:3000/api/auth/login
POST http://localhost:3000/api/auth/logout (protegida - precisa token)
```

---

## 💾 EXEMPLO HEADERS COMPLETO

### Para Login
```
Content-Type: application/json
```

### Para Logout
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⏱️ TEMPO ESTIMADO

| Teste | Tempo |
|-------|-------|
| Setup e primeira requisição | 2 min |
| Testes básicos (5 testes) | 5 min |
| Testes de erro (5 testes) | 5 min |
| Testes de força bruta | 15 min |
| Testes de validação | 5 min |
| **TOTAL** | **~30 min** |

---

## 🎯 PRÓXIMO PASSO

Após passar em todos os testes:
```
✅ Documentar resultados
✅ Fazer commit no Git
✅ Iniciar SEMANA 2
   └─ Endpoints de 2FA
   └─ Recuperação de senha
   └─ Criptografia de dados
```

---

**Criado**: 25 de maio de 2026  
**Versão**: 1.0  
**Status**: Pronto para testar

---

## 📞 PRECISA DE AJUDA?

- ❓ Erro de conexão? → Verificar `npm run dev`
- ❓ Token não funciona? → Copiar/colar novamente
- ❓ Email duplicado? → Usar novo email
- ❓ Conta bloqueada? → Esperar 15 minutos
- ❓ Outra dúvida? → Consulte `TESTE_POSTMAN_PASSO_A_PASSO.md`

---

**Happy Testing! 🧪🚀**
