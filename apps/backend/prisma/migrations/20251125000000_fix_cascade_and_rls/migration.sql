-- ============================================================================
-- Migration: Fix CASCADE Delete + Enable RLS
-- ============================================================================
-- Data: 2025-11-25
-- Objetivo: Ajustar constraints e habilitar RLS sem recriar tabelas existentes
--
-- CONTEXT:
-- - Todas as tabelas já existem no banco (criadas pela migration init fantasma)
-- - Esta migration apenas AJUSTA configurações que estão faltando
-- ============================================================================

-- ============================================================================
-- PARTE 1: Alterar constraint de CASCADE DELETE em revisions
-- ============================================================================

-- Remover constraint antiga (ON DELETE RESTRICT)
ALTER TABLE "revisions" DROP CONSTRAINT IF EXISTS "revisions_vehicleId_fkey";

-- Adicionar nova constraint com CASCADE
ALTER TABLE "revisions"
  ADD CONSTRAINT "revisions_vehicleId_fkey"
  FOREIGN KEY ("vehicleId")
  REFERENCES "customer_vehicles"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================================================
-- PARTE 2: Enable Row-Level Security (RLS) for Revisions
-- ============================================================================

-- Enable RLS on revisions table (idempotente - não falha se já estiver ativo)
ALTER TABLE "revisions" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (para idempotência)
DROP POLICY IF EXISTS mechanic_select_own_revisions ON "revisions";
DROP POLICY IF EXISTS mechanic_update_own_revisions ON "revisions";
DROP POLICY IF EXISTS manager_insert_revisions ON "revisions";
DROP POLICY IF EXISTS admin_delete_revisions ON "revisions";

-- Policy 1: Mechanics (STAFF) can only SELECT their assigned revisions
-- Managers+ can SELECT all revisions
CREATE POLICY mechanic_select_own_revisions ON "revisions"
  FOR SELECT
  USING (
    -- Allow if assigned to current user OR user is MANAGER/ADMIN/SUPER_ADMIN
    ("assignedMechanicId"::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_role', true) IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN'))
  );

-- Policy 2: Mechanics can only UPDATE their assigned revisions
-- Managers+ can UPDATE all revisions
CREATE POLICY mechanic_update_own_revisions ON "revisions"
  FOR UPDATE
  USING (
    ("assignedMechanicId"::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_role', true) IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN'))
  );

-- Policy 3: Only MANAGER+ can INSERT revisions
CREATE POLICY manager_insert_revisions ON "revisions"
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_role', true) IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF')
  );

-- Policy 4: Only ADMIN+ can DELETE revisions
CREATE POLICY admin_delete_revisions ON "revisions"
  FOR DELETE
  USING (
    current_setting('app.current_role', true) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Add comments for documentation
COMMENT ON POLICY mechanic_select_own_revisions ON "revisions" IS 'STAFF (mechanics) can only view their assigned revisions. Managers and above can view all.';
COMMENT ON POLICY mechanic_update_own_revisions ON "revisions" IS 'STAFF can only update their assigned revisions. Managers and above can update all.';
COMMENT ON POLICY manager_insert_revisions ON "revisions" IS 'All authenticated admin staff can create revisions.';
COMMENT ON POLICY admin_delete_revisions ON "revisions" IS 'Only ADMIN and SUPER_ADMIN can delete revisions.';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se a constraint CASCADE foi criada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'revisions_vehicleId_fkey'
    AND confdeltype = 'c'  -- 'c' = CASCADE
  ) THEN
    RAISE NOTICE '✅ Constraint CASCADE criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Constraint CASCADE não foi criada corretamente';
  END IF;
END $$;

-- Verificar se RLS está ativo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = 'revisions'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS habilitado com sucesso';
  ELSE
    RAISE EXCEPTION '❌ RLS não foi habilitado';
  END IF;
END $$;

-- Verificar se as 4 policies foram criadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'revisions';

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ 4 policies criadas com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Esperado 4 policies, encontrado: %', policy_count;
  END IF;
END $$;
