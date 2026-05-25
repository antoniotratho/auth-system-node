# 🧪 GUIA DE TESTES COM POSTMAN - PASSO A PASSO

**Data**: 25 de maio de 2026  
**Versão**: 1.0  
**Status**: Pronto para testar

---

## 📋 ÍNDICE

1. [Setup Inicial do Postman](#setup-inicial)
2. [Passo 1: Health Check](#passo-1-health-check)
3. [Passo 2: Registrar Usuário](#passo-2-registrar-usuário)
4. [Passo 3: Login](#passo-3-login)
5. [Passo 4: Usar Token JWT](#passo-4-usar-token-jwt)
6. [Passo 5: Logout](#passo-5-logout)
7. [Passo 6: Testar Proteção Força Bruta](#passo-6-testar-proteção-força-bruta)
8. [Passo 7: Testar Validações](#passo-7-testar-validações)
9. [Passo 8: Verificar Logs](#passo-8-verificar-logs)

---

## Setup Inicial

### Pré-requisitos
- ✅ Postman instalado ([Download](https://www.postman.com/downloads/))
- ✅ Servidor Node rodando (`npm run dev`)
- ✅ MySQL/Database configurado e conectado
- ✅ Arquivo `.env` configurado

### Verificar se servidor está rodando
```bash
# Terminal 1
npm run dev

# Esperado ver:
# Server is running on port 3000
```

### Importar Collection no Postman (Opcional)
Você pode criar uma collection manualmente ou usar o arquivo JSON fornecido.

---

## 🟢 PASSO 1: Health Check

**Objetivo**: Verificar se servidor está respondendo

### Detalhes da Requisição
| Item | Valor |
|------|-------|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/auth/ping` |
| **Headers** | (nenhum necessário) |
| **Body** | (vazio) |

### No Postman

1. Clique em **"New"** → **"HTTP Request"**
2. Selecione **GET** no dropdown
3. Cole a URL: `http://localhost:3000/api/auth/ping`
4. Clique em **Send**

### Resposta Esperada

```json
{
  "message": "Auth module funcionando 🚀"
}
```

### Status
- ✅ **200 OK** - Sucesso

---

## 🔵 PASSO 2: Registrar Usuário

**Objetivo**: Criar novo usuário com email e senha forte

### Detalhes da Requisição
| Item | Valor |
|------|-------|
| **Método** | POST |
| **URL** | `http://localhost:3000/api/auth/register` |
| **Content-Type** | `application/json` |

### No Postman

1. Clique em **"New"** → **"HTTP Request"**
2. Selecione **POST** no dropdown
3. Cole a URL: `http://localhost:3000/api/auth/register`
4. Clique na aba **Headers**
5. Verifique se há automaticamente:
   - **Content-Type**: `application/json`
6. Clique na aba **Body**
7. Selecione **raw** → **JSON**
8. Cole o JSON abaixo:

### JSON para Enviar

```json
{
  "email": "usuario@example.com",
  "password": "SecurePassword123!"
}
```

### Importante ⚠️
A senha deve ter:
- ✅ Mínimo 8 caracteres
- ✅ 1 letra maiúscula (A-Z)
- ✅ 1 número (0-9)
- ✅ 1 caractere especial (@, $, !, %, *, ?, &)

**Senhas válidas:**
- ✅ `SecurePassword123!`
- ✅ `MyPass@2024`
- ✅ `Teste@123`

**Senhas INVÁLIDAS:**
- ❌ `password123` (sem maiúscula, sem especial)
- ❌ `Pass@1` (menos de 8 caracteres)
- ❌ `PASSWORD123!` (sem minúscula)

### Clique em **Send**

### Resposta Esperada (Sucesso)

```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@example.com",
    "createdAt": "2026-05-25T10:30:00.000Z"
  }
}
```

### Status
- ✅ **201 Created** - Usuário criado com sucesso

---

## 🟠 TESTANDO VALIDAÇÕES (Antes de prosseguir)

Teste com SENHA FRACA para ver a validação funcionando:

### JSON com Senha Fraca

```json
{
  "email": "test2@example.com",
  "password": "123456"
}
```

### Resposta Esperada (Erro)

```json
{
  "error": "Senha fraca. Mínimo 8 caracteres, incluindo maiúscula, número e caractere especial"
}
```

### Status
- ❌ **400 Bad Request** - Validação falhou

---

### Testando Email Duplicado

Tente registrar o mesmo email de novo:

```json
{
  "email": "usuario@example.com",
  "password": "AnotherPass456!"
}
```

### Resposta Esperada (Erro)

```json
{
  "error": "Email já registrado"
}
```

### Status
- ❌ **400 Bad Request** - Email já existe

---

## 🟡 PASSO 3: Login

**Objetivo**: Autenticar com email/senha e receber JWT

### Detalhes da Requisição
| Item | Valor |
|------|-------|
| **Método** | POST |
| **URL** | `http://localhost:3000/api/auth/login` |
| **Content-Type** | `application/json` |

### No Postman

1. Clique em **"New"** → **"HTTP Request"**
2. Selecione **POST** no dropdown
3. Cole a URL: `http://localhost:3000/api/auth/login`
4. Aba **Body** → **raw** → **JSON**
5. Cole o JSON:

### JSON para Enviar

```json
{
  "email": "usuario@example.com",
  "password": "SecurePassword123!"
}
```

### Clique em **Send**

### Resposta Esperada (Sucesso)

```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcwMzU2ODgwMCwiZXhwIjoxNzAzNTcyNDAwfQ.abcdef123456...",
  "expiresIn": 3600
}
```

### Status
- ✅ **200 OK** - Login bem-sucedido

### ⭐ SALVAR O TOKEN

Você vai usar este token nos próximos passos! Copie o valor da chave `token`.

---

## 🔴 TESTANDO LOGIN COM SENHA ERRADA

```json
{
  "email": "usuario@example.com",
  "password": "WrongPassword123!"
}
```

### Resposta Esperada (Erro)

```json
{
  "error": "Credenciais inválidas"
}
```

### Status
- ❌ **401 Unauthorized** - Senha incorreta

---

## 🟣 TESTANDO LOGIN COM EMAIL NÃO REGISTRADO

```json
{
  "email": "nao-existe@example.com",
  "password": "SecurePassword123!"
}
```

### Resposta Esperada (Erro)

```json
{
  "error": "Credenciais inválidas"
}
```

### Status
- ❌ **401 Unauthorized** - Email não existe (não revelamos para segurança)

---

## 🔐 PASSO 4: Usar Token JWT (Rota Protegida)

**Objetivo**: Acessar endpoint protegido usando o token recebido

### Preparação

Você deve ter um token JWT do Passo 3. Se não tiver, faça login novamente.

### Detalhes da Requisição
| Item | Valor |
|------|-------|
| **Método** | POST |
| **URL** | `http://localhost:3000/api/auth/logout` |
| **Headers** | **Authorization**: `Bearer [seu-token]` |
| **Body** | (vazio) |

### No Postman

1. Clique em **"New"** → **"HTTP Request"**
2. Selecione **POST** no dropdown
3. Cole a URL: `http://localhost:3000/api/auth/logout`
4. Clique na aba **Headers**
5. Adicione novo header:
   - **Key**: `Authorization`
   - **Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcwMzU2ODgwMCwiZXhwIjoxNzAzNTcyNDAwfQ.abcdef123456...`

> **Nota**: Substitua `eyJhbGciOi...` pelo token que você recebeu no Passo 3

6. **Body** pode ficar vazio
7. Clique em **Send**

### Resposta Esperada (Sucesso)

```json
{
  "message": "Logout realizado com sucesso"
}
```

### Status
- ✅ **200 OK** - Logout bem-sucedido

---

## ❌ PASSO 5: Testar Sem Token

**Objetivo**: Verificar que rota protegida rejeita requisições sem token

### No Postman

1. Use a mesma URL: `http://localhost:3000/api/auth/logout`
2. **Selecione POST**
3. **NÃO adicione nenhum header de Authorization**
4. Clique em **Send**

### Resposta Esperada (Erro)

```json
{
  "error": "Token não fornecido"
}
```

### Status
- ❌ **401 Unauthorized** - Token obrigatório

---

## ⏰ PASSO 6: Testar Proteção Contra Força Bruta

**Objetivo**: Verificar se conta é bloqueada após 5 tentativas falhadas

### Passo 6.1: Registrar Novo Usuário

Primeiro, registre um novo usuário para teste:

**URL**: `http://localhost:3000/api/auth/register`  
**Método**: POST

```json
{
  "email": "bruteforce@test.com",
  "password": "BruteForce123!"
}
```

### Passo 6.2: Fazer 5 Tentativas com Senha ERRADA

**URL**: `http://localhost:3000/api/auth/login`  
**Método**: POST

Faça 5 vezes (mude o número no comentário):

```json
{
  "email": "bruteforce@test.com",
  "password": "WrongPassword123!"
}
```

**Repita 5 vezes** - Cada uma vai retornar 401 com erro

### Passo 6.3: 6ª Tentativa com Senha CORRETA

Na 6ª tentativa, use a senha CORRETA:

```json
{
  "email": "bruteforce@test.com",
  "password": "BruteForce123!"
}
```

### Resposta Esperada (Bloqueado)

```json
{
  "error": "Conta bloqueada. Tente novamente em 15 minutos."
}
```

### Status
- ⏱️ **401 Unauthorized** - Conta bloqueada por 15 minutos

### ✅ Validação
Se você ver a mensagem "Conta bloqueada", a proteção contra força bruta **está funcionando!** 🎉

---

## 🧪 PASSO 7: Testar Validações

### Teste 7.1: Email Vazio

**URL**: `http://localhost:3000/api/auth/register`  
**Método**: POST

```json
{
  "password": "SecurePassword123!"
}
```

### Resposta Esperada

```json
{
  "error": "Email e senha são obrigatórios"
}
```

---

### Teste 7.2: Senha Vazia

**URL**: `http://localhost:3000/api/auth/register`  
**Método**: POST

```json
{
  "email": "test@example.com"
}
```

### Resposta Esperada

```json
{
  "error": "Email e senha são obrigatórios"
}
```

---

### Teste 7.3: Email Inválido

**URL**: `http://localhost:3000/api/auth/register`  
**Método**: POST

```json
{
  "email": "nao-e-um-email",
  "password": "SecurePassword123!"
}
```

**Nota**: No momento não há validação de formato de email, mas você pode implementar se quiser.

---

## 📊 PASSO 8: Verificar Logs

**Objetivo**: Ver os logs de segurança sendo registrados

### Abrir Arquivo de Logs

No seu projeto, abra o arquivo de logs:

```
seu-projeto/logs/app.log
```

### Procure por Entradas Como:

```json
{
  "level": "info",
  "action": "user_registered",
  "email": "usuario@example.com",
  "userId": 1,
  "timestamp": "2026-05-25 10:30:00"
}
```

```json
{
  "level": "info",
  "action": "login_success_primary",
  "userId": 1,
  "email": "usuario@example.com",
  "ip": "::1",
  "timestamp": "2026-05-25 10:31:00"
}
```

```json
{
  "level": "warn",
  "action": "login_failed_invalid_password",
  "email": "usuario@example.com",
  "ip": "::1",
  "failedAttempts": 1,
  "timestamp": "2026-05-25 10:32:00"
}
```

---

## 🎯 RESUMO DE TESTES

| # | Teste | Método | URL | Status Esperado |
|---|-------|--------|-----|-----------------|
| 1 | Health Check | GET | `/api/auth/ping` | 200 |
| 2 | Registrar | POST | `/api/auth/register` | 201 |
| 3 | Registrar (Email Dup) | POST | `/api/auth/register` | 400 |
| 4 | Registrar (Senha Fraca) | POST | `/api/auth/register` | 400 |
| 5 | Login | POST | `/api/auth/login` | 200 |
| 6 | Login (Senha Errada) | POST | `/api/auth/login` | 401 |
| 7 | Login (Email Não Existe) | POST | `/api/auth/login` | 401 |
| 8 | Logout (Com Token) | POST | `/api/auth/logout` | 200 |
| 9 | Logout (Sem Token) | POST | `/api/auth/logout` | 401 |
| 10 | Force Brute (5 falhas) | POST | `/api/auth/login` | 401 |
| 11 | Force Brute (Bloqueado) | POST | `/api/auth/login` | 401 |

---

## 📱 ORDEM RECOMENDADA DE TESTES

**Para primeira vez (15 minutos):**
1. ✅ Passo 1: Health Check
2. ✅ Passo 2: Registrar Usuário (sucesso)
3. ✅ Passo 2: Registrar (email duplicado - erro)
4. ✅ Passo 2: Registrar (senha fraca - erro)
5. ✅ Passo 3: Login (sucesso)
6. ✅ Passo 3: Login (senha errada - erro)
7. ✅ Passo 4: Logout (com token)
8. ✅ Passo 5: Logout (sem token - erro)

**Para testes de segurança (30 minutos):**
9. ✅ Passo 6: Força bruta (5 tentativas)
10. ✅ Passo 6: Força bruta (bloqueado)
11. ✅ Passo 7: Validações
12. ✅ Passo 8: Verificar logs

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot GET /api/auth/ping"
- ❌ Servidor não está rodando
- ✅ Solução: `npm run dev` em outro terminal

### Erro: "connect ECONNREFUSED 127.0.0.1:3000"
- ❌ Servidor não está no port 3000
- ✅ Solução: Verificar `.env` - PORT deve ser 3000

### Erro: "CORS error"
- ❌ Postman não está na whitelist de CORS
- ✅ Solução: Em `.env`, adicione `ALLOWED_ORIGINS=http://localhost:3000`

### Erro: "Token inválido"
- ❌ Token expirou (JWT tem 1 hora de validade)
- ✅ Solução: Faça login de novo

### Erro: "Conta bloqueada"
- ✅ Comportamento esperado! Significa que força bruta está funcionando
- ✅ Espere 15 minutos ou aguarde (em teste, você pode resetar o DB)

---

## 💡 DICAS POSTMAN

### Salvar Requisições em Collection
1. Após criar uma requisição, clique em **Save**
2. Dê um nome: "Login - Test"
3. Selecione ou crie uma Collection: "Auth Tests"
4. Clique em **Save**

### Usar Variáveis para Token
1. Crie uma variável: Clique em **Environment**
2. Adicione: `token` = seu-token-aqui
3. Use em requisições: `Authorization: Bearer {{token}}`

### Exemplo com Variável

**Header:**
- **Key**: `Authorization`
- **Value**: `Bearer {{token}}`

---

## 📸 EXEMPLO VISUAL

### Tela de Requisição GET /ping

```
┌─────────────────────────────────────────┐
│ GET  │ http://localhost:3000/api/auth/ping │ Send │
├─────────────────────────────────────────┤
│ Params │ Headers │ Body │ Tests │ Settings │
├─────────────────────────────────────────┤
│ (vazio)                                 │
└─────────────────────────────────────────┘

Response:
┌─────────────────────────────────────────┐
│ 200 OK │ 45ms │ 28B                     │
├─────────────────────────────────────────┤
│ {
│   "message": "Auth module funcionando 🚀"
│ }
└─────────────────────────────────────────┘
```

---

## 📸 EXEMPLO VISUAL - POST /register

```
┌──────────────────────────────────────────────────┐
│ POST │ http://localhost:3000/api/auth/register │ Send │
├──────────────────────────────────────────────────┤
│ Params │ Headers │ Body │ Tests │ Settings       │
├──────────────────────────────────────────────────┤
│ Body (raw / JSON):
│ {
│   "email": "usuario@example.com",
│   "password": "SecurePassword123!"
│ }
└──────────────────────────────────────────────────┘

Response:
┌──────────────────────────────────────────────────┐
│ 201 Created │ 125ms │ 152B                       │
├──────────────────────────────────────────────────┤
│ {
│   "message": "Usuário criado com sucesso",
│   "user": {
│     "id": 1,
│     "email": "usuario@example.com",
│     "createdAt": "2026-05-25T10:30:00.000Z"
│   }
│ }
└──────────────────────────────────────────────────┘
```

---

## 📸 EXEMPLO VISUAL - POST /login

```
┌──────────────────────────────────────────────────┐
│ POST │ http://localhost:3000/api/auth/login     │ Send │
├──────────────────────────────────────────────────┤
│ Params │ Headers │ Body │ Tests │ Settings       │
├──────────────────────────────────────────────────┤
│ Body (raw / JSON):
│ {
│   "email": "usuario@example.com",
│   "password": "SecurePassword123!"
│ }
└──────────────────────────────────────────────────┘

Response:
┌──────────────────────────────────────────────────┐
│ 200 OK │ 234ms │ 512B                            │
├──────────────────────────────────────────────────┤
│ {
│   "message": "Login realizado com sucesso",
│   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
│   "expiresIn": 3600
│ }
└──────────────────────────────────────────────────┘
```

---

## 📸 EXEMPLO VISUAL - POST /logout (com token)

```
┌──────────────────────────────────────────────────┐
│ POST │ http://localhost:3000/api/auth/logout    │ Send │
├──────────────────────────────────────────────────┤
│ Params │ Headers │ Body │ Tests │ Settings       │
├──────────────────────────────────────────────────┤
│ Headers:
│ Key              │ Value
│ Authorization    │ Bearer eyJhbGciOiJIUzI1NiI...
│ Content-Type     │ application/json
│
│ Body: (vazio)
└──────────────────────────────────────────────────┘

Response:
┌──────────────────────────────────────────────────┐
│ 200 OK │ 45ms │ 62B                              │
├──────────────────────────────────────────────────┤
│ {
│   "message": "Logout realizado com sucesso"
│ }
└──────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST FINAL

Após completar todos os testes:

```
FUNCIONALIDADES
□ Health check respondendo
□ Registrar novo usuário
□ Email duplicado rejeitado
□ Senha fraca rejeitada
□ Login com credenciais corretas
□ Login com senha errada rejeitado
□ Logout com token funcionando
□ Logout sem token rejeitado

SEGURANÇA
□ Proteção força bruta ativa
□ Conta bloqueada após 5 falhas
□ Token JWT sendo gerado
□ Logs sendo registrados
□ Headers de segurança presentes

SE TUDO MARCADO ✅ = PRONTO PARA SEMANA 2
```

---

## 🎯 PRÓXIMOS PASSOS

Após validar tudo:

1. ✅ Todos os testes passando
2. ✅ Verificar logs em `logs/app.log`
3. ✅ Fazer commit dos testes
4. ✅ Iniciar SEMANA 2: Endpoints 2FA

---

**Criado em**: 25 de maio de 2026  
**Versão**: 1.0  
**Status**: Pronto para testar

**Próximo**: [SEMANA_2_IMPLEMENTACAO.md]
