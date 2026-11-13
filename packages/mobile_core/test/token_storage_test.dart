import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:m2_core/m2_core.dart';

void main() {
  test('apaga o token só na primeira abertura após instalar', () async {
    FlutterSecureStorage.setMockInitialValues({'session_token': 'antigo'});
    final dir = await Directory.systemTemp.createTemp('m2_token');
    addTearDown(() => dir.delete(recursive: true));
    final tokens = TokenStorage();

    await clearTokenAfterReinstall(tokens, appDir: dir.path);
    expect(await tokens.read(), isNull);

    await tokens.write('novo');
    await clearTokenAfterReinstall(tokens, appDir: dir.path);
    expect(await tokens.read(), 'novo');
  });
}
