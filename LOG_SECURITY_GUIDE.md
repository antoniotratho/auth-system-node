# 🔐 Proteção contra Alteração de Logs

## Visão Geral

Sistema completo de proteção de integridade de logs implementado em **3 camadas**:

### 1. **Hash de Integridade (SHA-256)**
   - Cada arquivo de log recebe hash SHA-256 automático
   - Hash registrado em arquivo de checksum centralizado (`.log-integrity`)
   - Qualquer alteração no arquivo é detectada

### 2. **Permissões de Arquivo (Append-Only)**
   - Logs configurados com permissões restritas (600 - apenas owner)
   - Em Unix/Linux: modo `chattr +a` (append-only, protege contra edição)
   - Em Windows: arquivo read-only para não-owners
   - Impede exclusão ou modificação manual

### 3. **Auditoria de Acesso**
   - Registro de todas as verificações de integridade
   - Histórico de acesso centralizado (`.log-access-audit`)
   - Rastreamento de quem/quando acessa os logs
   - Alertas automáticos de falhas

---

## 📁 Arquivos Criados

### `/src/shared/utils/logSecurityManager.js`
Classe responsável pela proteção de logs:
- `calculateFileHash()` - Gera hash SHA-256 de arquivo
- `recordLogHash()` - Registra hash em arquivo centralizado
- `verifyLogIntegrity()` - Verifica se arquivo foi alterado
- `setAppendOnlyPermissions()` - Define permissões restritas
- `logAccessAudit()` - Registra eventos de acesso
- `generateSecurityReport()` - Gera relatório completo

### `/src/modules/audit/routes/auditRoutes.js`
Endpoints REST para auditoria:

#### **Verificar integridade de um log**
```bash
GET /api/audit/logs/verify/security.log
```

Resposta (sucesso):
```json
{
  "valid": true,
  "logFile": "security.log",
  "currentHash": "sha256...",
  "recordedHash": "sha256...",
  "lastVerified": "2026-06-01T10:30:45.000Z",
  "status": "OK",
  "message": "Log file integrity verified"
}
```

Resposta (falha):
```json
{
  "valid": false,
  "logFile": "security.log",
  "reason": "HASH MISMATCH - File may have been modified",
  "severity": "HIGH",
  "currentHash": "sha256_novo...",
  "recordedHash": "sha256_antigo...",
  "status": "COMPROMISED"
}
```

#### **Verificar todos os logs**
```bash
GET /api/audit/logs/verify-all
```

Resposta:
```json
{
  "allValid": true,
  "results": [
    {
      "valid": true,
      "logFile": "error.log",
      "currentHash": "sha256...",
      "recordedHash": "sha256...",
      "lastVerified": "2026-06-01T10:30:45.000Z"
    },
    {
      "valid": true,
      "logFile": "security.log",
      "currentHash": "sha256...",
      "recordedHash": "sha256...",
      "lastVerified": "2026-06-01T10:30:45.000Z"
    }
  ],
  "timestamp": "2026-06-01T10:30:45.000Z",
  "status": "OK"
}
```

#### **Obter relatório de segurança**
```bash
GET /api/audit/security-report
```

Resposta:
```json
{
  "timestamp": "2026-06-01T10:30:45.000Z",
  "summary": {
    "totalLogs": 3,
    "validLogs": 3,
    "compromisedLogs": 0,
    "allValid": true
  },
  "integrityDetails": [
    {
      "valid": true,
      "logFile": "error.log",
      "currentHash": "sha256...",
      "recordedHash": "sha256..."
    }
  ],
  "recentAudit": [
    {
      "action": "INTEGRITY_VERIFIED",
      "logFile": "security.log",
      "timestamp": "2026-06-01T10:30:40.000Z",
      "userId": "system"
    }
  ],
  "recommendations": [
    "Sistema de logs íntegro. Continuar monitoramento."
  ]
}
```

#### **Obter histórico de auditoria**
```bash
GET /api/audit/access-history?limit=50
```

Resposta:
```json
{
  "timestamp": "2026-06-01T10:30:45.000Z",
  "limit": 50,
  "records": [
    {
      "action": "INTEGRITY_VERIFIED",
      "logFile": "security.log",
      "timestamp": "2026-06-01T10:30:40.000Z",
      "userId": "system",
      "details": {
        "valid": true,
        "currentHash": "sha256..."
      }
    },
    {
      "action": "INTEGRITY_FAILURE",
      "logFile": "app.log",
      "timestamp": "2026-06-01T10:25:15.000Z",
      "userId": "system",
      "details": {
        "valid": false,
        "reason": "HASH MISMATCH"
      }
    }
  ],
  "totalRecords": 2
}
```

---

## 🔄 Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────┐
│  Logger registra novo evento                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Winston escreve em arquivo de log              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  LogSecurityManager é acionado                  │
│  - Calcula hash SHA-256                         │
│  - Registra em .log-integrity                   │
│  - Seta permissões append-only                  │
│  - Registra na auditoria de acesso              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Arquivo protegido e verificável                │
└─────────────────────────────────────────────────┘
```

---

## 🛡️ Proteção em Ação

### Cenário 1: Tentativa de Editar Log
```bash
# Alguém tenta editar security.log
$ sed -i 's/failed/success/g' logs/security.log

# Verificação:
$ curl http://localhost:3000/api/audit/logs/verify/security.log

# Resultado:
{
  "valid": false,
  "reason": "HASH MISMATCH - File may have been modified",
  "severity": "HIGH",
  "status": "COMPROMISED"
}
```

### Cenário 2: Monitoramento Contínuo
```bash
# Cron job verifica integridade a cada hora
0 * * * * curl http://localhost:3000/api/audit/logs/verify-all

# Sistema envia alerta se algum log foi comprometido
```

### Cenário 3: Compliance & Auditoria
```bash
# Gerar relatório para conformidade LGPD/SOX
$ curl http://localhost:3000/api/audit/security-report

# Retorna: histórico completo, status de integridade, recomendações
```

---

## 📊 Estrutura de Arquivos de Proteção

```
logs/
├── app.log           ← Arquivo de log (protegido)
├── error.log         ← Arquivo de log (protegido)
├── security.log      ← Arquivo de log (protegido)
├── .log-integrity    ← Arquivo de checksums (modo 600)
│   {
│     "version": "1.0",
│     "createdAt": "2026-06-01T10:00:00.000Z",
│     "logs": {
│       "security.log": {
│         "hash": "sha256...",
│         "lineCount": 1245,
│         "timestamp": "2026-06-01T10:30:45.000Z"
│       }
│     }
│   }
└── .log-access-audit ← Auditoria de acesso (modo 600)
    [{"action":"INTEGRITY_VERIFIED","logFile":"security.log",...}]
    [{"action":"INTEGRITY_FAILURE","logFile":"app.log",...}]
```

---

## 🔑 Recursos de Segurança

| Recurso | Implementação | Benefício |
|---------|---|---|
| **Hash SHA-256** | Automático em cada escrita | Detecta qualquer alteração |
| **Append-only** | Permissões 600 + chattr +a | Previne edição/deleção |
| **Auditoria** | `.log-access-audit` | Rastreamento completo |
| **Checksum centralizado** | `.log-integrity` | Verificação rápida |
| **Relatórios** | API REST | Compliance automatizado |
| **Alertas** | Recommendations geradas | Ação proativa |

---

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras
1. **Criptografia** - Usar AES-256 para dados sensíveis
2. **Backup Externo** - Replicar logs em serviço seguro (S3, Azure)
3. **Assinatura Digital** - Assinar logs com chave privada
4. **SIEM Integration** - Integrar com Splunk/ELK Stack
5. **Alertas Automáticos** - Webhook em caso de comprometimento
6. **Retenção Legal** - Holds automáticos por período
7. **Rate Limiting** - Limitar verificações por IP

---

## ✅ Verificação Rápida

```bash
# 1. Iniciar servidor
npm start

# 2. Fazer login (gera logs)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# 3. Verificar integridade
curl http://localhost:3000/api/audit/logs/verify-all

# 4. Ver relatório
curl http://localhost:3000/api/audit/security-report

# 5. Histórico de auditoria
curl http://localhost:3000/api/audit/access-history?limit=10
```

---

**Proteção implementada com sucesso! ✅**
