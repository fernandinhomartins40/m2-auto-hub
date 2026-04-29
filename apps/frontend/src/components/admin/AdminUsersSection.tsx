import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Loader2, Power, PowerOff, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/api/adminService';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminPageHeader } from './AdminPageHeader';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'STAFF' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS = {
  STAFF: 'MecÃ¢nico',
  MANAGER: 'Gerente',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  STAFF: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-green-100 text-green-800',
  ADMIN: 'bg-orange-100 text-orange-800',
  SUPER_ADMIN: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

export default function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [debouncedSearchEmail, setDebouncedSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const permissions = useAdminPermissions();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};

      if (debouncedSearchEmail) filters.email = debouncedSearchEmail;
      if (filterRole) filters.role = filterRole;
      if (filterStatus) filters.status = filterStatus;

      const response = await adminService.getAdminUsers(filters);
      setUsers(response.data || []);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Erro ao carregar usuÃ¡rios', {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchEmail(searchEmail.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchEmail]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearchEmail, filterRole, filterStatus]);

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuÃ¡rio ${userName}?`)) {
      return;
    }

    try {
      await adminService.deleteAdminUser(userId);
      toast.success('UsuÃ¡rio excluÃ­do com sucesso');
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Erro ao excluir usuÃ¡rio', {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchUsers();
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleToggleStatus = async (userId: string, currentStatus: string, userName: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'ativar' : 'desativar';

    if (!window.confirm(`Tem certeza que deseja ${action} o usuÃ¡rio ${userName}?`)) {
      return;
    }

    try {
      await adminService.updateAdminUser(userId, { status: newStatus });
      toast.success(`UsuÃ¡rio ${action === 'ativar' ? 'ativado' : 'desativado'} com sucesso`);
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(`Erro ao ${action} usuÃ¡rio`, {
        description: err.response?.data?.message || 'Erro desconhecido',
      });
    }
  };

  if (!permissions.canManageAdmins) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">VocÃª nÃ£o tem permissÃ£o para acessar esta seÃ§Ã£o.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="mb-6 space-y-4">
        <AdminPageHeader
          icon={UserCog}
          title="Gestão de Usuários"
          description="Gerencie acessos administrativos, mecânicos e permissões do sistema."
          actions={
            permissions.canCreateAdmins ? (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            ) : null
          }
        />
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar por email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full md:max-w-xs"
          />
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full md:max-w-[200px]">
              <SelectValue placeholder="Filtrar por cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STAFF">Mecânico</SelectItem>
              <SelectItem value="MANAGER">Gerente</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:max-w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {(searchEmail || filterRole || filterStatus) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchEmail('');
                setFilterRole('');
                setFilterStatus('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>
      {/* Users Table */}
      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Nenhum usuÃ¡rio encontrado.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-center">AÃ§Ãµes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[user.status]}>
                      {user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      {permissions.canUpdateAdmins && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.status, user.name)}
                            title={user.status === 'ACTIVE' ? 'Desativar usuÃ¡rio' : 'Ativar usuÃ¡rio'}
                          >
                            {user.status === 'ACTIVE' ? (
                              <PowerOff className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {permissions.canDeleteAdmins && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedUser && (
        <EditUserModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={handleEditSuccess}
          user={selectedUser}
        />
      )}
    </div>
  );
}


