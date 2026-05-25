# 🔐 GUIA COMPLETO: TESTAR 2FA (Autenticação de Dois Fatores)

**Data**: 25 de maio de 2026  
**Tempo estimado**: 10-15 minutos  
**Dificuldade**: Média

---

## 📱 O QUE VOCÊ PRECISA

1. ✅ **Postman** (aberto)
2. ✅ **Google Authenticator** ou **Authy** no celular/PC
3. ✅ **API rodando** em `http://localhost:3000`
4. ✅ **Collection importada** (`Auth_System_Complete_Collection.json`)

---

## 🎯 FLUXO COMPLETO DE 2FA

```
┌─────────────────────────────────────────────┐
│  PASSO 1: Registrar Usuário                 │
│  POST /register                             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 2: Fazer Login                       │
│  POST /login                                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 3: Setup 2FA (Obter QR Code)         │
│  POST /2fa/setup                            │
│  Header: Authorization: Bearer JWT          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 4: Escanear QR Code no App           │
│  Google Authenticator / Authy               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 5: Verificar Setup 2FA               │
│  POST /2fa/verify-setup                     │
│  Body: secret + token (6 dígitos)           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 6: Login com 2FA Ativo               │
│  POST /login (com 2FA ativo)                │
│  Retorna: tempToken + requiresTwoFactor     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PASSO 7: Validar Código TOTP               │
│  POST /login/2fa                            │
│  Header: Authorization: Bearer TEMP_TOKEN   │
│  Body: token (6 dígitos do app)             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  ✅ LOGIN COM 2FA COMPLETO!                 │
│  Retorna: JWT final (1 hora)                │
└─────────────────────────────────────────────┘
```

---

## 📝 TESTE PRÁTICO - PASSO A PASSO

### PASSO 1: Registrar Usuário

**URL**: `http://localhost:3000/api/auth/register`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "email": "test2fa@example.com",
  "password": "SecurePass@123"
}
```

**No Postman**:
1. Clique na request "📌 SEMANA 1 - Autenticação Básica" → "Registrar Usuário"
2. Altere email para `test2fa@example.com`
3. Clique **Send**

**Resposta esperada** (201 Created):
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 3,
    "email": "test2fa@example.com",
    "createdAt": "2026-05-25T20:16:54.926Z"
  }
}
```

✅ **Se viu isso**: Passe ao PASSO 2

---

### PASSO 2: Fazer Login

**URL**: `http://localhost:3000/api/auth/login`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "email": "test2fa@example.com",
  "password": "SecurePass@123"
}
```

**No Postman**:
1. Clique em "📌 SEMANA 1" → "Login"
2. Altere email para `test2fa@example.com`
3. Clique **Send**

**Resposta esperada** (200 OK):
```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

⭐ **IMPORTANTE**: Copie o **token** inteiro (a parte que começa com `eyJ...`)

✅ **Se viu token**: Passe ao PASSO 3

---

### PASSO 3: Setup 2FA (Obter QR Code)

**URL**: `http://localhost:3000/api/auth/2fa/setup`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
Authorization: Bearer <TOKEN_DO_PASSO_2>
```

**Body**: 
```json
{}
```

**No Postman**:
1. Clique em "🔐 SEMANA 2 - 2FA" → "2FA - Setup (Iniciar)"
2. Vá para **Headers**
3. No campo `Authorization`, copie e cole o token do Passo 2:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Clique **Send**

**Resposta esperada** (200 OK):
```json
{
  "message": "2FA setup iniciado",
  "secret": "C2VGVM3UL3UGTVZR5E6WTODFL5CUYDV",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAA...",
  "backupCodes": [
    "8B52F6V7",
    "UA7OJCXA",
    "I0G14VPY",
    ...
  ],
  "instruction": "Escaneie o QR code com seu app authenticator..."
}
```

⭐ **IMPORTANTE**: Copie e guarde:
- `secret`: `C2VGVM3UL3UGTVZR5E6WTODFL5CUYDV`
- `qrCode`: Toda a string (começando com `data:image/png;base64,`)
- `backupCodes`: Os 10 códigos de backup

✅ **Se viu QR Code + secret**: Passe ao PASSO 4

---

### PASSO 4: Escanear QR Code no Celular

#### Opção A: Com Google Authenticator (mais comum)

1. **Abra o Google Authenticator** no celular
2. Clique **+ (adicionar)**
3. Escolha **"Escanear código QR"**
4. **Aponte a câmera** para o QR Code da resposta do Passo 3
5. App mostrará algo como:
   ```
   Auth System
   ••••••
   ```
   (6 dígitos que mudam a cada 30 segundos)

#### Opção B: Sem câmera (inserir secret manualmente)

1. **No Google Authenticator**: + → "Inserir uma chave de configuração"
2. Clique em "Tempo baseado"
3. Cole o `secret` do Passo 3
4. Clique **Adicionar**

#### Opção C: Usando Authy

1. Abra **Authy**
2. Clique **+**
3. Escolha **Escanear QR** ou **Inserir manualmente**
4. Cole o secret se for manual

✅ **Se o app mostra um código de 6 dígitos**: Passe ao PASSO 5

---

### PASSO 5: Verificar Setup 2FA (Ativar)

**URL**: `http://localhost:3000/api/auth/2fa/verify-setup`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
Authorization: Bearer <TOKEN_DO_PASSO_2>
```

**Body (JSON)**:
```json
{
  "secret": "C2VGVM3UL3UGTVZR5E6WTODFL5CUYDV",
  "token": "123456"
}
```

**Explicação do body**:
- `secret`: Cole o valor do Passo 3
- `token`: Digite o código de **6 dígitos** que vê no app (muda a cada 30s)

**No Postman**:
1. Clique em "🔐 SEMANA 2" → "2FA - Verify Setup (Ativar)"
2. Vá para **Headers** e cole o token do Passo 2 no `Authorization`
3. Vá para **Body**
4. Copie o `secret` do Passo 3
5. **Olhe o app no celular** e copie o código de 6 dígitos
6. Cole os dois valores no body
7. Clique **Send** (⚠️ **RÁPIDO**: código expira em 30 segundos!)

**Resposta esperada** (200 OK):
```json
{
  "message": "2FA ativado com sucesso",
  "status": "active"
}
```

❌ **Se viu erro "Token TOTP inválido"**:
- Código expirou (janela de 30s)
- Volte ao app, copie o **novo** código
- Envie novamente

✅ **Se viu "2FA ativado com sucesso"**: Passe ao PASSO 6

---

### PASSO 6: Login COM 2FA Ativo

**Agora o 2FA está ativo! Vamos testar o login**

**URL**: `http://localhost:3000/api/auth/login`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "email": "test2fa@example.com",
  "password": "SecurePass@123"
}
```

**No Postman**:
1. Clique em "📌 SEMANA 1" → "Login"
2. Clique **Send**

**Resposta esperada** (200 OK - DIFERENTE de antes!):
```json
{
  "requiresTwoFactor": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Autenticação de dois fatores necessária"
}
```

⭐ **IMPORTANTE**: Note que agora:
- ❌ NÃO retorna `token` final
- ✅ Retorna `tempToken` (válido por 5 minutos)
- ✅ Diz `requiresTwoFactor: true`

**Copie o `tempToken`** para o PASSO 7

✅ **Se viu "requiresTwoFactor: true"**: Passe ao PASSO 7

---

### PASSO 7: Validar Código TOTP (Completar 2FA)

**URL**: `http://localhost:3000/api/auth/login/2fa`  
**Método**: `POST`  
**Headers**: 
```
Content-Type: application/json
Authorization: Bearer <TEMP_TOKEN_DO_PASSO_6>
```

**Body (JSON)**:
```json
{
  "token": "654321"
}
```

**Explicação**:
- `Authorization`: Cole o `tempToken` do Passo 6
- `token`: Código TOTP atual do app (6 dígitos)

**No Postman**:
1. Clique em "🔐 SEMANA 2" → "2FA - Login (Validar Token)"
2. Vá para **Headers**
3. Cole o `tempToken` do Passo 6 no `Authorization`
4. Vá para **Body**
5. **Olhe o app no celular** e copie o código de 6 dígitos **ATUAL**
6. Cole no campo `token`
7. Clique **Send** (⚠️ RÁPIDO: código expira em 30 segundos!)

**Resposta esperada** (200 OK - ✅ LOGIN COMPLETO!):
```json
{
  "message": "Autenticação de dois fatores validada",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

✅ **SUCESSO! 2FA FUNCIONANDO!** 🎉

Você agora tem:
- ✅ JWT token final
- ✅ 2FA ativado
- ✅ Acesso total ao sistema

---

## 📊 RESUMO VISUAL

### Sem 2FA:
```
Registrar → Login → JWT Final
                    ✅ Acesso liberado
```

### Com 2FA:
```
Registrar → Ativar 2FA → Login → TOTP → JWT Final
                         (tempToken)      ✅ Acesso liberado
```

---

## 🔄 TESTANDO NOVAMENTE (Próximo Login com 2FA)

Se quiser fazer login novamente:

1. **Postman**: POST /login
2. **Copie** o novo `tempToken`
3. **App celular**: Copie código TOTP atual
4. **Postman**: POST /login/2fa com novo `tempToken` + novo código TOTP

---

## ❌ ERROS COMUNS

| Erro | Causa | Solução |
|------|-------|---------|
| "Token TOTP inválido" | Código expirou | Use novo código (30s) |
| "Token não fornecido" em /2fa/setup | Header Authorization vazio | Cole o JWT do login |
| "2FA não está ativado" | Pulou o Passo 5 | Complete Verify Setup |
| "Credenciais inválidas" | Email/senha errados | Verifique Passo 1 |
| App mostra "Inválido" | QR code errado | Digitalize novamente |

---

## 🎯 VALIDAÇÕES

### ✅ 2FA Funcionando Se:

- [x] Setup retorna QR Code
- [x] App mostra código de 6 dígitos
- [x] Verify Setup aceita o código
- [x] Login retorna `tempToken`
- [x] /login/2fa aceita o novo código
- [x] Recebe JWT final

### ❌ 2FA Com Problemas Se:

- [ ] Setup não retorna QR Code
- [ ] App não reconhece QR Code
- [ ] Verify Setup sempre falha
- [ ] Login não ativa 2FA

---

## 📱 FLUXO RÁPIDO (Cheat Sheet)

```
1. Registrar:
   POST /register
   {email, password}

2. Login:
   POST /login
   {email, password}
   ✅ Copie: token

3. Setup 2FA:
   POST /2fa/setup
   Header: Authorization: Bearer [token]
   ✅ Copie: secret, qrCode

4. App:
   Escanear QR code
   ✅ Copie: 6 dígitos

5. Ativar:
   POST /2fa/verify-setup
   Header: Authorization: Bearer [token]
   Body: {secret, token: "6dígitos"}

6. Login novamente:
   POST /login
   {email, password}
   ✅ Copie: tempToken

7. Validar 2FA:
   POST /login/2fa
   Header: Authorization: Bearer [tempToken]
   Body: {token: "6dígitos_novo"}
   ✅ Receba: JWT final + 3600s
```

---

## 🎓 O QUE ESTÁ ACONTECENDO

### Sem 2FA:
- Senha se torna JWT diretamente
- Qualquer pessoa com sua senha entra

### Com 2FA:
- Senha gera `tempToken` (5 min)
- Precisa do app para gerar código
- Código + tempToken gera JWT final
- Muito mais seguro! 🔒

---

## 💡 DICAS

1. **Código TOTP muda a cada 30 segundos** - tenha pressa!
2. **Backup codes** - guarde em lugar seguro
3. **App funciona offline** - pode usar sem internet
4. **5 minutos** - tempo limite do tempToken
5. **1 hora** - tempo de expiração do JWT final

---

## 🎉 PRÓXIMO TESTE

Após completar 2FA, teste:

```
✅ Logout (com JWT final)
✅ Ver dados (GET /my-data com JWT)
✅ Desativar 2FA (POST /2fa/disable)
✅ Recuperação de senha (POST /forgot-password)
```

---

**Criado em**: 25 de maio de 2026  
**Versão**: 1.0 - Guia Completo  
**Status**: Pronto para testar  

🚀 **Boa sorte com seus testes de 2FA!**
