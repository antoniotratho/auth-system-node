# Test Plan — Auth System

Objetivo: mapear cada requisito de segurança e conformidade para casos de teste executáveis (unitários, integração e e2e), com critério de aceitação e prioridades.

**Estratégia de testes**
- Unitários: lógica pura, utilitários (`hash`, `twoFactor`, `token`), controllers pequenos com mocks.
- Integração: rotas críticas (`/api/auth/*`) usando `supertest` com app importado (`src/app.js`) e mocks para SMTP e Prisma quando necessário.
- End-to-end (opcional): fluxo completo com DB de teste (SQLite/instância Docker) para evidências funcionais.

**Ambiente & dependências**
- Framework: Jest + Supertest + Sinon (mocks)
- Rodar: `npm install --save-dev jest supertest sinon` e ajustar `package.json` com `"test": "jest --runInBand"`.
- Mocks necessários: `EmailService` (não enviar emails), `prisma` (ou banco de teste), `logger` (capturar entradas).

**Mapeamento requisitos → Casos de teste (prioridade alta/medium/low)**

1) Autenticação e Gestão de Credenciais
- 1.1 Uso de hash seguro
  - Tipo: Unitário
  - Arquivo: tests/hash.test.js
  - Caso: `hash.hashPassword()` produz hash verificável por `hash.comparePassword()`; usa `bcrypt` por padrão.
  - Mock/Deps: nenhum
  - Critério: comparePassword retorna true para a senha correta; hashes diferentes para duas execuções (salt único).
  - Prioridade: Alta

- 1.2 Parâmetros de custo do hash
  - Tipo: Unitário
  - Arquivo: tests/hash.test.js
  - Caso: verificar que `BCRYPT_ROUNDS` (ou valor embutido) está >= 10 e documentado no README dos testes.
  - Critério: valor lido da configuração corresponde à recomendação do projeto.
  - Prioridade: Medium

- 1.3 Salt único por usuário
  - Tipo: Unitário
  - Caso: gerar dois hashes para mesma senha com `hash.hashPassword()` e assert hashes são diferentes.
  - Prioridade: Alta

- 1.4 Armazenamento correto do hash + salt
  - Tipo: Integração
  - Arquivo: tests/userRepository.test.js
  - Caso: criar usuário via `UserRepository.create()` e ler do DB (mock ou DB de teste) para confirmar campo `password` existe e não contém senha em claro.
  - Prioridade: Alta

- 1.5–1.6 2FA implementada e validada após auth primária
  - Tipo: Unitário + Integração
  - Arquivo: tests/2fa.test.js, tests/auth.integration.test.js
  - Casos: gerar secret/QR (`twoFactor.generateSecret()`), validar token (`twoFactor.verify()`), fluxo de login que exige 2FA quando ativado.
  - Mocks: `qrcode` pode ser stubado; usar `speakeasy` real para verificação.
  - Prioridade: Alta

- 1.7 Fluxo documentado
  - Tipo: Procedural (documentar) + Smoke tests
  - Caso: smoke test de login -> 2FA -> acesso, usando `supertest`.
  - Prioridade: Medium

- 1.8 Evidências funcionais
  - Tipo: Execução de testes e captura de logs/screenshots
  - Caso: rodar suíte CI local e coletar `logs/error.log` e prints das respostas.
  - Prioridade: High

- 1.9 Sessões com tempo de expiração
  - Tipo: Integração
  - Caso: simular emissão de token JWT com exp curto e validar middleware rejeita após expiração.
  - Arquivo: tests/session.test.js
  - Prioridade: Medium

- 1.10 Invalidação de sessão no logout
  - Tipo: Integração
  - Caso: chamar `POST /api/auth/logout` e validar que token/sessão é invalidado (se for blacklist ou cookie removido).
  - Prioridade: Medium

- 1.11 Proteção contra força bruta
  - Tipo: Integração
  - Caso: repetir `POST /api/auth/login` > limite e validar resposta de rate-limit e log de bloqueio.
  - Arquivo: tests/rateLimit.test.js
  - Prioridade: High

2) Recuperação de Senha
- 2.1–2.5 Fluxo de recuperação
  - Tipo: Integração
  - Arquivo: tests/passwordReset.test.js
  - Casos:
    - Solicitação cria token criptograficamente seguro (UUID) e salva com `expiresAt` (testar campo existence). (2.1,2.2,2.3)
    - Uso do token atualiza senha e marca `usedAt`. (2.4)
    - Uso de token expirado retorna 401 com mensagem adequada. (2.5)
  - Mocks: `EmailService.sendPasswordResetEmail` stub para não enviar email e capturar token enviado.
  - Critério: tokens criados, expirados e invalidados conforme regras.
  - Prioridade: Alta

- 2.6–2.7 Logs da recuperação
  - Tipo: Integração
  - Caso: assert que `logger` recebeu entradas `forgot_password_requested`, `password_reset_email_failed` e `password_reset_success` conforme cenários.
  - Estratégia: mock do `logger.info`/`logger.error` para capturar chamadas.
  - Prioridade: High

3) Criptografia e Comunicação Segura
- 3.1–3.2 TLS/HTTPS e bloqueio conexões não seguras
  - Tipo: Integração (middleware)
  - Arquivo: tests/tls.test.js
  - Caso: definir `NODE_ENV=production` e simular request sem `x-forwarded-proto: https`, assert redirect 301.
  - Prioridade: Medium

- 3.3–3.8 (dados em repouso, algoritmos, chaves)
  - Tipo: Documentação + revisão de config
  - Caso: provas através de documentação e inspeção de configs; não são 100% testáveis via unidade.
  - Prioridade: Low/Medium

4) Conformidade LGPD
- 4.1–4.11
  - Tipo: Integração + documentação
  - Arquivo: tests/lgpd.test.js
  - Casos: `GET /api/auth/my-data` retorna somente campos permitidos; `POST /api/auth/export-data` gera arquivo/JSON; `delete-account` marca/exclui dados; `consent` grava consentimento com timestamp. Testar revogação.
  - Prioridade: Medium

5) Auditoria e Logs
- 5.1–5.4
  - Tipo: Integração
  - Caso: para eventos críticos (login success/fail, 2FA, password reset) capturar e validar formato e presença de campos (`action`, `email`, `userId`, `ip`, `timestamp`).
  - Estratégia: mock do `logger` para verificar chamadas e serialização.
  - Prioridade: High

**Estrutura de arquivos de teste (exemplo)**
- tests/hash.test.js
- tests/2fa.test.js
- tests/passwordReset.test.js
- tests/auth.integration.test.js
- tests/rateLimit.test.js
- tests/session.test.js
- tests/lgpd.test.js
- jest.setup.js (mocks globais: prisma, EmailService, logger)

**Critérios de aceitação gerais**
- Todas as specs críticas (hash, 2FA, password reset, rate-limit, logs) passam com 100% de asserts relevantes.
- Nenhum teste faz envio de email real (EmailService mockado).
- DB: prefer usar um banco em memória ou test DB; se usar `prisma`, configurar `DATABASE_URL` para um DB de teste durante CI/local.

**Próximos passos sugeridos (após aprovação do plano)**
1. Instalar dev-deps e configurar `jest` + `supertest`.
2. Implementar `jest.setup.js` com mocks para `EmailService` e `logger`.
3. Escrever e rodar os 3 testes prioritários: `hash`, `passwordReset` (integração com mock SMTP), `rateLimit`.
4. Expandir cobertura para os demais casos.

--
Gerado automaticamente como primeiro passo antes de codificar os testes.
