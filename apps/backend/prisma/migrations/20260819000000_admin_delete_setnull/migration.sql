-- Excluir um admin passa a desvincular o historico em vez de ser bloqueado
-- pela FK. O trabalho realizado continua registrado; so perde o responsavel
-- atribuido, cujo nome ja fica em cache (mechanicName) nas proprias tabelas.

ALTER TABLE "revisions" DROP CONSTRAINT IF EXISTS "revisions_assignedMechanicId_fkey";
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_assignedMechanicId_fkey"
  FOREIGN KEY ("assignedMechanicId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revision_appointments" DROP CONSTRAINT IF EXISTS "revision_appointments_assignedMechanicId_fkey";
ALTER TABLE "revision_appointments" ADD CONSTRAINT "revision_appointments_assignedMechanicId_fkey"
  FOREIGN KEY ("assignedMechanicId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_orders" DROP CONSTRAINT IF EXISTS "service_orders_assignedMechanicId_fkey";
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assignedMechanicId_fkey"
  FOREIGN KEY ("assignedMechanicId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_assignedToId_fkey";
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
