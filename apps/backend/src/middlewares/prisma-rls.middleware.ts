import { AsyncLocalStorage } from 'node:async_hooks';

interface RLSContext {
  adminId: string;
  adminRole: string;
}

const rlsContextStorage = new AsyncLocalStorage<RLSContext>();

export function runWithRLSContext<T>(adminId: string, adminRole: string, callback: () => T): T {
  return rlsContextStorage.run({ adminId, adminRole }, callback);
}

export function getRLSContext(): RLSContext | null {
  return rlsContextStorage.getStore() || null;
}

/*
 * O contexto acima continua sendo populado a cada request autenticado: e o canal
 * por onde a aplicacao sabe quem esta agindo.
 *
 * O que existia aqui e foi removido era um middleware do Prisma que disparava um
 * `set_config(...)` antes de cada operacao sobre Revision. Ele nao protegia nada
 * e custava uma ida extra ao banco por operacao, em 64 pontos do codigo:
 *
 *  1. `set_config(..., true)` e local a transacao. Como rodava em transacao
 *     implicita propria, sobre uma conexao do pool, o valor ja tinha sido
 *     descartado quando a query seguinte chegava - possivelmente ate em outra
 *     conexao.
 *  2. As policies de `revisions` usam ENABLE ROW LEVEL SECURITY, sem FORCE, e o
 *     Prisma conecta como dono das tabelas. Dono ignora RLS, entao as policies
 *     nunca chegavam a ser avaliadas.
 *
 * A restricao "mecanico so enxerga as proprias revisoes" e aplicada na camada de
 * aplicacao, que e onde de fato vigora hoje: revisions.controller.ts força
 * `filters.mechanicId` para o papel STAFF, e getRevisionById, updateRevision e
 * exportRevisionPdf recebem `role` + `adminId` e validam o acesso no service.
 */
