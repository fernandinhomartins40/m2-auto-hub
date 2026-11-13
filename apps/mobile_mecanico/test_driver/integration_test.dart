import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// Recebe as imagens do teste e grava em `screenshots/` (vira artifact no CI).
Future<void> main() => integrationDriver(
      onScreenshot: (name, bytes, [args]) async {
        final file = File('screenshots/$name.png');
        await file.create(recursive: true);
        await file.writeAsBytes(bytes);
        return true;
      },
    );
