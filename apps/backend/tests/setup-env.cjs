// Valores fictícios só para os testes carregarem a configuração; nenhum teste abre conexão com banco.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/m2_test';
process.env.JWT_SECRET ??= 'test-only-secret-not-used-anywhere-else';
