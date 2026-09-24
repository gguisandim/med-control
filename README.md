# Controle de Medicamentos — família

Aplicação web simples para registrar administração de medicamentos por turno, com persistência imediata no Supabase.

## Regras configuradas

- Turno **DIA**: 07:30 até 19:29.
- Turno **NOITE**: 19:30 até 07:29 do dia seguinte.
- Acesso por **uma única senha compartilhada**, sem e-mail.
- A sessão do aparelho dura até **7 dias**; existe o botão **Sair deste dispositivo**.
- Na primeira abertura de cada turno, o sistema pede o nome do responsável.
- O nome do responsável fica salvo e pode ser corrigido durante o próprio turno.
- O aplicativo troca automaticamente de turno às 07:30 e 19:30.
- Não existe mais a etapa obrigatória de **finalizar turno**.
- Cada medicamento é salvo **individualmente e imediatamente** no banco.
- Depois de salvar um medicamento, é seguro fechar o aplicativo e retornar mais tarde: o progresso do turno será recarregado do Supabase.
- Ao iniciar um turno, o sistema cria um **snapshot** dos medicamentos ativos. Alterações futuras no cadastro não modificam os registros já criados.
- Itens podem ser `Administrado`, `Não administrado` ou `Pendente`.
- Ao registrar como administrado, a pessoa informa o **horário real** ou toca em **Agora**.
- Um item já registrado pode ser editado durante o turno atual ou corrigido posteriormente no Histórico.
- O Histórico permite corrigir responsável, data, turno, observações, status e data/hora real dos itens.
- O cadastro de medicamentos pode ser editado, suspenso ou reativado sem apagar registros antigos.
- Em **Ajustes > Teste da aplicação** é possível criar e remover dados fictícios para testar Histórico e Resumo.

> Este projeto é um registro operacional. Não contém lógica para decidir dose, via, horário, suspensão ou qualquer conduta clínica. Essas informações devem reproduzir a orientação do profissional de saúde responsável.

## Stack

- Next.js 16 + TypeScript
- Supabase/PostgreSQL
- Vercel
- CSS responsivo, pensado para celular

## Atualizando da versão 1.1

Esta versão **não exige alteração no banco**. Ela usa as mesmas tabelas e colunas existentes.

O campo `finished_at` da tabela `shifts` pode continuar no banco por compatibilidade com registros antigos, mas o fluxo novo não depende dele.

## 1. Criar o banco no Supabase

Se estiver instalando do zero:

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Cole todo o conteúdo de `supabase/schema.sql`.
4. Execute.

## 2. Configurar o projeto local

Copie `.env.example` para `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Preencha:

```env
APP_PASSWORD=uma-senha-compartilhada-forte
SESSION_SECRET=um-segredo-grande-e-aleatorio
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_SUA_CHAVE
APP_TIMEZONE=America/Belem
```

Importante:

- `SUPABASE_URL` deve terminar em `.supabase.co`, sem `/rest/v1/`.
- Use a chave secreta de servidor (`sb_secret_...`) em `SUPABASE_SERVICE_ROLE_KEY`.
- Nunca use `NEXT_PUBLIC_` nessa chave.

Para gerar `SESSION_SECRET` com Node:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Rodar no VS Code

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## 4. Publicar na Vercel

Em **Project > Settings > Environment Variables**, cadastre as mesmas variáveis do `.env.local` e faça um novo deploy.

## Fluxo diário

### Primeira abertura do turno

1. Abra o aplicativo.
2. Informe o nome do responsável.
3. O sistema cria o registro do turno e copia a lista atual de medicamentos.

### Registrar um medicamento

1. Abra o app.
2. Toque em **Administrado** ou **Não administrado**.
3. Se administrado, confira/informe o horário real ou use **Agora**.
4. Toque em **Salvar registro**.
5. O dado é gravado imediatamente no Supabase.
6. O aplicativo pode ser fechado.

Ao voltar mais tarde, os medicamentos já registrados continuam marcados e os demais permanecem pendentes.

### Histórico

O Histórico é independente do cadastro atual dos medicamentos. Alterar um registro antigo não modifica a medicação configurada para os próximos turnos.

### Dados fake

Em **Ajustes > Teste da aplicação**, use **Adicionar dados fake** para preencher Histórico e Resumo com registros de demonstração. Depois, **Remover dados fake** exclui apenas turnos cujo responsável começa com `[DEMO]`.
