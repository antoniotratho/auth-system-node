# Guia Visual de Conformidade - Diagramas e Fluxos

---

## 1. FLUXO DE AUTENTICAÇÃO ATUAL vs ESPERADO

### ❌ Fluxo Atual (Incompleto)
```
┌──────────────┐
│   Usuário    │
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ 1. POST /register  │
│ (email + password) │
└────────┬───────────┘
         │
         ▼
   ┌─────────────┐
   │ Hash bcrypt │
   └────────┬────┘
            │
            ▼
   ┌──────────────────┐
   │ Salva no banco   │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ POST /login      │
   │ (email+password) │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Compara hash     │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ JWT de 1h        │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ ❌ SEM LOGOUT    │
   │ ❌ SEM 2FA       │
   │ ❌ SEM RESET     │
   └──────────────────┘
```

### ✅ Fluxo Esperado (Completo)
```
┌──────────────┐
│   Usuário    │
└──────┬───────┘
       │
       ├─► [REGISTRO] ────────────────────────┐
       │   1. Email (criptografado)          │
       │   2. Senha (bcrypt hash)            │
       │   3. Consentimento LGPD             │
       │   4. Email de confirmação           │
       │                                      ▼
       │                           ┌─────────────────────┐
       │                           │ Usuário confirmado  │
       │                           └──────────┬──────────┘
       │                                      │
       └──────────────────────────────────────┤
       │                                      │
       ├─► [LOGIN] ────────────────────────┐ │
       │   1. Valida credenciais           │ │
       │   2. Verifica força bruta         │ │
       │   3. Gera temp JWT (5 min)        │ │
       │                                    │ │
       │   ┌─────────────────────────────────┘ │
       │   │                                   │
       │   ▼                                   │
       │   [2FA - TOTP]                       │
       │   1. Usuário escaneia QR Code        │
       │   2. Insere 6 dígitos               │
       │   3. Valida speakeasy               │
       │                                     │
       │   ┌─────────────────────────────────┬┘
       │   │                                 │
       │   ▼                                 │
       │   [JWT PRINCIPAL]                   │
       │   - Token de 1h                     │
       │   - Refresh token 7d               │
       │                                     │
       └─────────────────────────────────────┤
                                              │
       ┌──────────────────────────────────────┤
       │   [OPERAÇÕES PROTEGIDAS]             │
       │   - Endpoints com JWT validation     │
       │   - Logs de todas ações              │
       │   - Auditoria LGPD                   │
       │                                      │
       └──────────────┬───────────────────────┘
                      │
       ┌──────────────┴─────────────────┐
       │                                │
       ▼                                ▼
   [LOGOUT]                    [ESQUECEU SENHA]
   1. Blacklist JWT            1. Envia email
   2. Limpa sessão             2. Token seguro
   3. Log                       3. Reset com nova senha
                                4. Invalida todos JWT
```

---

## 2. FLUXO DE RECUPERAÇÃO DE SENHA

```
┌─────────────────────┐
│  Usuário clica em   │
│ "Esqueceu Senha"    │
└──────────┬──────────┘
           │
           ▼
   ┌───────────────────┐
   │ POST /forgot-pass │
   │ (email)           │
   └────────┬──────────┘
            │
            ▼
   ┌─────────────────────────┐
   │ Valida email no banco   │
   └────────┬────────────────┘
            │
        Sim │   Não
            │    └──► Retorna sucesso (fake)
            │        para segurança
            ▼
   ┌──────────────────────────────┐
   │ Gera UUID token              │
   │ Expira em 15 minutos         │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Salva no BD (PasswordReset)   │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Envia email com link:         │
   │ /reset-password/[token]       │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Usuário clica no email        │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ POST /reset-password/:token   │
   │ (novaPassword)                │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Valida token:                 │
   │ - Existe?                     │
   │ - Expirado?                   │
   │ - Já foi usado?               │
   └────────┬─────────────────────┘
            │
        OK  │   Erro
            │    └──► Erro 400
            ▼        com log
   ┌──────────────────────────────┐
   │ Hash nova senha (bcrypt)      │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Atualiza usuário             │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Marca token como usado        │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Invalida todos JWT do user    │
   │ (força novo login)            │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Envia email de confirmação    │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ ✅ Sucesso                    │
   │ Logs: início, token, sucesso  │
   └──────────────────────────────┘
```

---

## 3. FLUXO DE 2FA (TOTP)

```
┌──────────────────┐
│ Primeira vez: Ativar 2FA
└────────┬─────────┘
         │
         ▼
   ┌─────────────────────┐
   │ GET /2fa/setup      │
   └──────────┬──────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Gera secret speakeasy         │
   │ - Algoritmo: TOTP             │
   │ - Issuer: AuthSystem          │
   │ - Length: 32 bytes            │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Gera QR Code                  │
   │ (otpauth_url)                 │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Retorna ao usuário:           │
   │ - QR Code (img)               │
   │ - Secret (texto backup)       │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Usuário escaneia com          │
   │ app (Google Auth, Authy, etc) │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ POST /2fa/verify-setup        │
   │ (token de 6 dígitos)          │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Verifica TOTP:                │
   │ speakeasy.totp.verify()       │
   │ (window: 2 = ±60 segundos)    │
   └──────────┬───────────────────┘
              │
          OK  │  Erro
              │   └─► Erro 400
              ▼       Tenta novamente
   ┌──────────────────────────────┐
   │ Salva secret no BD            │
   │ twoFactorEnabled = true       │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ ✅ 2FA Ativado                │
   │ Log: secret_saved, email     │
   └──────────────────────────────┘

─────────────────────────────────────

┌──────────────────┐
│ Login com 2FA ativado
└────────┬─────────┘
         │
         ▼
   ┌──────────────────┐
   │ POST /login      │
   │ (email+password) │
   └──────────┬───────┘
              │
              ▼
   ┌───────────────────────────┐
   │ Valida credenciais OK     │
   └──────────┬────────────────┘
              │
              ▼
   ┌───────────────────────────────┐
   │ Verifica twoFactorEnabled      │
   └──────────┬────────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Gera temp JWT (5 min)         │
   │ { userId, temporary: true }   │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Retorna ao frontend:          │
   │ {                             │
   │   requiresTwoFactor: true,    │
   │   tempToken: "eyJ..."         │
   │ }                             │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Usuário insere 6 dígitos      │
   │ do app autenticador           │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ POST /login/2fa               │
   │ (tempToken + token2fa)        │
   │ Authorization: Bearer token   │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Valida temp JWT              │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Busca secret do BD            │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Verifica TOTP                 │
   │ speakeasy.totp.verify(        │
   │   secret, token2fa, 2         │
   │ )                             │
   └──────────┬───────────────────┘
              │
          OK  │  Erro
              │   └─► Log warn
              │       Error 401
              ▼
   ┌──────────────────────────────┐
   │ Gera JWT principal (1h)       │
   │ { userId, iat, exp }          │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Retorna ao frontend:          │
   │ {                             │
   │   token: "eyJ...",            │
   │   expiresIn: 3600             │
   │ }                             │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ ✅ Login com 2FA completo    │
   │ Log: 2fa_verified, userId    │
   └──────────────────────────────┘
```

---

## 4. MATRIZ DE CONFORMIDADE LGPD

```
┌────────────────────────────────────────────────────────────────┐
│                    DIREITOS DO TITULAR (LGPD)                  │
├──────────────────────┬──────────────────────────────────────────┤
│   Direito            │     Implementação Esperada              │
├──────────────────────┼──────────────────────────────────────────┤
│ Confirmação de       │ GET /my-data                            │
│ Existência           │ Retorna se dados existem no BD           │
│                      │ LOG: data_query_requested               │
├──────────────────────┼──────────────────────────────────────────┤
│ Acesso              │ GET /my-data                             │
│ Completo            │ Retorna:                                 │
│ aos Dados           │ - Email                                  │
│                      │ - Data criação                           │
│                      │ - Último login                           │
│                      │ - Histórico de consentimento             │
│                      │ LOG: data_accessed, userId, ip          │
├──────────────────────┼──────────────────────────────────────────┤
│ Portabilidade       │ POST /export-data                        │
│ dos Dados           │ Gera JSON com todos os dados             │
│                      │ Retorna como attachment/download        │
│                      │ LOG: data_exported, userId              │
├──────────────────────┼──────────────────────────────────────────┤
│ Exclusão            │ DELETE /delete-account                   │
│ (Direito ao         │ 1. Envia email de confirmação            │
│  Esquecimento)      │ 2. Token válido 15 minutos              │
│                      │ 3. Solicita password para confirmar      │
│                      │ 4. Exclui usuário em cascata            │
│                      │ 5. Retém logs por 1 ano (retenção)     │
│                      │ LOG: account_deletion_requested         │
│                      │ LOG: account_deleted, userId            │
├──────────────────────┼──────────────────────────────────────────┤
│ Revogação de        │ POST /revoke-consent                     │
│ Consentimento       │ {type: "authentication"}                 │
│                      │ LOG: consent_revoked, type              │
├──────────────────────┼──────────────────────────────────────────┤
│ Correção            │ POST /update-data                        │
│ de Dados            │ Permite atualizar email, telefone        │
│ Incorretos          │ LOG: data_updated, fields_changed        │
├──────────────────────┼──────────────────────────────────────────┤
│ Restrição de        │ POST /restrict-processing                │
│ Processamento       │ Impede tratamento até resolução          │
│                      │ LOG: processing_restricted              │
└──────────────────────┴──────────────────────────────────────────┘
```

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

### Autenticação e Credenciais

```
✅ 1.1  Hash seguro (bcrypt)               [IMPLEMENTADO]
✅ 1.2  Parâmetros configurados            [IMPLEMENTADO]
✅ 1.3  Salt único por usuário             [IMPLEMENTADO]
✅ 1.4  Armazenamento correto              [IMPLEMENTADO]
❌ 1.5  2FA implementado                   [TODO - 2h]
❌ 1.6  Validação pós-2FA                  [TODO - 2h]
⚠️  1.7  Fluxo documentado                 [PARCIAL - 1h]
❌ 1.8  Evidências funcionais              [TODO - 2h]
✅ 1.9  Sessões com expiração              [IMPLEMENTADO]
❌ 1.10 Logout com invalidação             [TODO - 1h]
⚠️  1.11 Proteção força bruta              [PARCIAL - 2h]
⚠️  1.12 Justificativas documentadas       [PARCIAL - 1h]

Total Autenticação: 5.5/12 (46%)
Tempo TODO: ~11 horas
```

### Recuperação de Senha

```
❌ 2.1  Funcionalidade implementada       [TODO - 3h]
❌ 2.2  Token seguro                      [TODO - 1h]
❌ 2.3  Expiração de token                [TODO - 1h]
❌ 2.4  Invalidação após uso              [TODO - 1h]
❌ 2.5  Falha correta para expirado       [TODO - 1h]
❌ 2.6  Log de solicitação                [TODO - 1h]
❌ 2.7  Log de sucesso/falha              [TODO - 1h]

Total Recuperação: 0/7 (0%)
Tempo TODO: ~9 horas
```

### Criptografia e TLS

```
⚠️  3.1  TLS/HTTPS comunicação            [PARCIAL - 2h]
❌ 3.2  Bloqueio conexões inseguras       [TODO - 1h]
⚠️  3.3  Evidência tráfego cifrado        [PARCIAL]
❌ 3.4  Dados criptografados em repouso   [TODO - 2h]
❌ 3.5  Algoritmo adequado (AES)          [TODO - 2h]
⚠️  3.6  Chaves protegidas                [PARCIAL - 1h]
❌ 3.7  Estratégia documentada            [TODO - 2h]
⚠️  3.8  Justificativa técnica            [PARCIAL - 1h]

Total Criptografia: 2/8 (25%)
Tempo TODO: ~12 horas
```

### Conformidade LGPD

```
❌ 4.1  Listagem dados pessoais           [TODO - 2h]
❌ 4.2  Associação com finalidade         [TODO - 2h]
❌ 4.3  Minimização de dados              [TODO - 1h]
❌ 4.4  Consentimento explícito           [TODO - 3h]
❌ 4.5  Consentimento x finalidade        [TODO - 2h]
❌ 4.6  Revogação de consentimento        [TODO - 2h]
❌ 4.7  Data e versão consentimento       [TODO - 1h]
❌ 4.8  Consulta dados do titular         [TODO - 2h]
❌ 4.9  Exportação de dados               [TODO - 2h]
❌ 4.10 Exclusão de dados                 [TODO - 3h]
❌ 4.11 Fluxo documentado                 [TODO - 2h]

Total LGPD: 0/11 (0%)
Tempo TODO: ~22 horas
```

### Auditoria e Logs

```
✅ 5.1  Logs de autenticação              [IMPLEMENTADO]
⚠️  5.2  Logs de falhas e 2FA             [PARCIAL - 2h]
❌ 5.3  Proteção alteração de logs        [TODO - 3h]
❌ 5.4  Análise de logs                   [TODO - 4h]

Total Auditoria: 1.5/4 (38%)
Tempo TODO: ~9 horas
```

### Documentação

```
❌ 6.1  Documentação arquitetura          [TODO - 4h]
⚠️  6.2  Justificativa criptográfica      [PARCIAL - 2h]
❌ 6.3  Diagramas fluxo                   [TODO - 3h]
❌ 6.4  Conformidade LGPD                 [TODO - 3h]
❌ 6.5  Testes de segurança               [TODO - 6h]
❌ 6.6  Análise vulnerabilidades          [TODO - 4h]
⚠️  6.7  Justificativa parâmetros         [PARCIAL - 2h]
⚠️  6.8  Tratamento de erros              [PARCIAL - 1h]
❌ 6.9  Variáveis de ambiente             [TODO - 1h]
❌ 6.10 Plano resposta incidentes         [TODO - 4h]
❌ 6.11 Backup e recuperação              [TODO - 3h]

Total Documentação: 0.5/11 (5%)
Tempo TODO: ~33 horas
```

---

## 6. TIMELINE VISUAL DE IMPLEMENTAÇÃO

```
SEMANA 1 (8 horas)
┌─────────────────────────────────────────────────────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sab │ Dom │
│  X  │  X  │  X  │  X  │  X  │     │     │
├─────┴─────┴─────┴─────┴─────┴─────┴─────┤
│ ✅ CORS restritivo                       │
│ ✅ Headers de segurança                  │
│ ✅ Logout com blacklist                  │
│ ✅ Rate limiting com bloqueio de conta    │
│ ✅ Testes manuais                        │
└──────────────────────────────────────────┘
         CRÍTICO - Deve fazer!

SEMANA 2 (10 horas)
┌─────────────────────────────────────────────────────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sab │ Dom │
│  X  │  X  │  X  │  X  │  X  │     │     │
├─────┴─────┴─────┴─────┴─────┴─────┴─────┤
│ ✅ 2FA TOTP setup                        │
│ ✅ 2FA TOTP verify                       │
│ ✅ 2FA Login                             │
│ ✅ Recuperação de senha                  │
│ ✅ Criptografia de email                 │
└──────────────────────────────────────────┘
         CRÍTICO - Deve fazer!

SEMANA 3 (12 horas)
┌─────────────────────────────────────────────────────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sab │ Dom │
│  X  │  X  │  X  │  X  │  X  │  X  │     │
├─────┴─────┴─────┴─────┴─────┴─────┴─────┤
│ ✅ Endpoints LGPD (GET /my-data)        │
│ ✅ Endpoints LGPD (POST /export-data)   │
│ ✅ Endpoints LGPD (DELETE /delete)      │
│ ✅ Modelo de consentimento               │
│ ✅ Auditoria de logs                     │
│ ✅ Testes automatizados                  │
└──────────────────────────────────────────┘
         ALTA - Importante

SEMANA 4 (8 horas)
┌─────────────────────────────────────────────────────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sab │ Dom │
│  X  │  X  │  X  │  X  │     │     │     │
├─────┴─────┴─────┴─────┴─────┴─────┴─────┤
│ ✅ Documentação técnica                 │
│ ✅ HTTPS em produção                    │
│ ✅ Monitoramento de segurança            │
│ ✅ Deploy em staging                     │
└──────────────────────────────────────────┘
         MÉDIA - Importante

TOTAL: ~38 horas (1 desenvolvedor por 1-2 semanas)
```

---

## 7. MATRIZ DE RISCO vs IMPACTO

```
         │ IMPACTO
────────┼─────────────────────────────────┐
PROB.   │ BAIXO    MÉDIO    ALTO    CRÍTICO
────────┼─────────────────────────────────┤
ALTA    │         🟠        🔴      🔴🔴
        │      Rate limit  CORS    2FA
        │      Insufic.    Aberto  Logout
        │
MÉDIA   │      🟡         🟠      🔴
        │    Validação   Email    LGPD
        │    Email      PlainTxt  Nenhum
        │
BAIXA   │      🟡         🟡      🟠
        │    Testes    Docs    Rotação
        │    Autom.    LGPD    Chaves
        │
────────┴─────────────────────────────────┘

🟢 = Risco baixo (implementar em manutenção)
🟡 = Risco médio (implementar em 2 semanas)
🟠 = Risco alto (implementar em 1 semana)
🔴 = Risco crítico (implementar HOJE)
```

---

## 8. DEPENDÊNCIAS ENTRE TAREFAS

```
┌──────────────┐
│ Atualizar BD │ (schema.prisma)
└──────┬───────┘
       │
       ├──────────┬──────────┬──────────┐
       ▼          ▼          ▼          ▼
     2FA      Password  Consents    LGPD
    Setup      Reset     Tables     Data
       │          │          │          │
       └──────────┴──────────┴──────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Services &     │
         │ Controllers    │
         └────────┬───────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
    Routes              Repositories
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Testes         │
         │ Automatizados  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Documentação   │
         │ & Deploy       │
         └────────────────┘
```

---

## 9. CRITÉRIOS DE ACEITAÇÃO POR REQUISITO

### ✅ Requisito: Autenticação com 2FA

```
Critérios de Aceitação:
□ Usuário pode ativar 2FA
□ QR Code é gerado corretamente
□ Speakeasy verifica token TOTP
□ Login sem 2FA falha
□ Login com 2FA sucede
□ Logs registram ativação
□ Sessão expira após 1 hora
□ Logout invalida o JWT

Teste Manual:
1. Registrar novo usuário
2. Fazer login com email/senha
3. Ativar 2FA (GET /2fa/setup)
4. Escanear QR com app autenticador
5. Inserir token (POST /2fa/verify-setup)
6. Fazer logout
7. Fazer novo login
8. Sistema solicita 2FA
9. Inserir token do app
10. Confirmar acesso com novo JWT
11. Verificar logs em logs/app.log
```

### ✅ Requisito: Conformidade LGPD

```
Critérios de Aceitação:
□ GET /my-data retorna dados do usuário
□ POST /export-data gera JSON completo
□ DELETE /delete-account exige confirmação
□ Dados são realmente deletados do BD
□ Logs de acesso são retidos por 1 ano
□ Email de confirmação é enviado
□ Token de confirmação expira em 15min
□ Consentimento é registrado

Teste Manual:
1. GET /my-data - verificar estrutura
2. POST /export-data - fazer download
3. DELETE /delete-account - envio de email
4. Confirmar via email
5. Verificar if user foi deletado
6. Verificar logs em BD (Consent)
7. Tentar acessar dados deletados - erro
```

---

## 10. CHECKLIST FINAL DE LANÇAMENTO

```
PRÉ-LANÇAMENTO (Antes de produção)

Segurança
□ CORS restritivo
□ HTTPS obrigatório
□ Headers de segurança
□ Rate limiting adequado
□ 2FA funcionando
□ Logout invalidando JWT
□ Recuperação de senha funcionando
□ Email criptografado em repouso
□ Logs protegidos contra alteração

LGPD
□ Endpoints de consulta funcionando
□ Exportação gerando JSON válido
□ Exclusão deletando dados
□ Consentimento sendo registrado
□ Termos de privacidade publicados
□ DPO designado (nome/email)
□ Plano de resposta a vazamentos pronto

Documentação
□ README atualizado
□ API documentation completa
□ Guia de segurança para devs
□ Plano de resposta a incidentes
□ Política de privacidade
□ Documentação de conformidade LGPD

Testes
□ Testes unitários passando
□ Testes de integração OK
□ Teste de penetração simples
□ Teste de força bruta bloqueado
□ Teste de CSRF positivo
□ Teste de XSS - protected

Deploy
□ Certificado SSL válido
□ Variáveis de ambiente configuradas
□ Banco de dados backed up
□ Plano de rollback pronto
□ Logs e monitoramento ativo
□ Alertas de segurança configurados

Legal/Compliance
□ Advogado revisa conformidade LGPD
□ Seguros de cyber liability ativo
□ Nível de confiança SLA definido
□ Contatos de incidente definidos
□ Formulário de denúncia LGPD pronto

□ ✅ TUDO PRONTO PARA LAUNCH
```

---

*Documento Visual de Conformidade*
*Última atualização: 25 de maio de 2026*
