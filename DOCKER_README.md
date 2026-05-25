# Docker Compose — Guia Rápido

Este projeto já contém um `Dockerfile`. O `docker-compose.yml` criado roda três serviços:

- `app` — sua aplicação Node.js (porta 3000)
- `mysql` — banco MySQL (porta 3306)
- `adminer` — interface web para inspecionar o banco (porta 8080)

Arquivos criados:
- `docker-compose.yml`

Como usar (desenvolvimento):

1. Verifique se existe um arquivo `.env` com as variáveis necessárias (copie de `.env.example`).

2. Subir os containers:

```bash
docker compose up --build
```

3. A aplicação ficará disponível em http://localhost:3000

4. Acesse o Adminer em http://localhost:8080
   - System: MySQL
   - Server: mysql
   - Username: user (ou root)
   - Password: password
   - Database: authdb

Notas importantes:
- O `app` executa `npx prisma migrate deploy` durante o start para aplicar migrations automaticamente.
- As credenciais do MySQL usadas no `docker-compose.yml` são de exemplo (`root/password` e `user/password`). Ajuste no `.env` e no arquivo se necessário.
- Em produção, nunca use senhas em texto no `docker-compose.yml`; use segredos/variáveis de ambiente gerenciadas.

Observação sobre `DATABASE_URL`:

- O `docker-compose.yml` configura o `app` para ler `DATABASE_URL` diretamente do arquivo `.env` (variável `DATABASE_URL`). Garanta que seu `.env` tenha uma linha parecida com:

```
DATABASE_URL=mysql://user:password@mysql:3306/authdb
```

Exemplo mínimo de `.env` para desenvolvimento:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://user:password@mysql:3306/authdb
JWT_SECRET=your_jwt_secret_here
ALLOWED_ORIGINS=http://localhost:3000
```

Se preferir, atualize as credenciais do MySQL no `docker-compose.yml` ou crie variáveis de ambiente no seu sistema; em ambientes de produção, use Docker secrets ou orquestradores que gerenciem segredos.

Comandos úteis:

- Subir em background:

```bash
docker compose up --build -d
```

- Ver logs do app:

```bash
docker compose logs -f app
```

- Parar e remover containers:

```bash
docker compose down -v
```

---

Se quiser, eu posso:
- Ajustar `DATABASE_URL` para ler diretamente de `.env` (se você já tem `DATABASE_URL` configurada),
- Adicionar healthchecks mais robustos,
- Criar um `Makefile` com comandos úteis.
