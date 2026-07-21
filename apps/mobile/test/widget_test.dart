import 'package:flutter_test/flutter_test.dart';

import 'package:m2_admin/features/auth/admin.dart';

void main() {
  test('Admin.fromJson lê os campos essenciais', () {
    final admin = Admin.fromJson({
      'id': '123',
      'name': 'Fulano',
      'email': 'fulano@m2.com',
      'role': 'ADMIN',
    });
    expect(admin.id, '123');
    expect(admin.name, 'Fulano');
    expect(admin.email, 'fulano@m2.com');
    expect(admin.role, 'ADMIN');
  });

  test('Admin.fromJson tolera campos ausentes', () {
    final admin = Admin.fromJson({});
    expect(admin.id, '');
    expect(admin.role, 'STAFF');
  });
}
