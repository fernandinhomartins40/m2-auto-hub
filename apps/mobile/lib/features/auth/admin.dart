/// Representa o admin autenticado (subconjunto do model `Admin` do backend).
///
/// Tolerante a campos extras — pega só o que a UI precisa.
class Admin {
  Admin({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  final String id;
  final String name;
  final String email;
  final String role;

  factory Admin.fromJson(Map<String, dynamic> json) {
    return Admin(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'STAFF',
    );
  }
}
