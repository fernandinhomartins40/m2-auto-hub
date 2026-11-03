import 'package:flutter/material.dart';

/// Tema dos apps. O azul é o `--primary` do site (217 94% 53%).
class AppTheme {
  AppTheme._();

  static const Color primary = Color(0xFF2563EB);

  /// Cor das telas de marca, a mesma `themeColor` padrão dos PWAs.
  static const Color brandDark = Color(0xFF0F172A);

  static const Color success = Color(0xFF15803D);
  static const Color warning = Color(0xFFB45309);
  static const Color danger = Color(0xFFB91C1C);

  static ThemeData light() => _base(
        ColorScheme.fromSeed(seedColor: primary, primary: primary),
      );

  static ThemeData dark() => _base(
        ColorScheme.fromSeed(seedColor: primary, brightness: Brightness.dark),
      );

  static ThemeData _base(ColorScheme scheme) {
    final shape =
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(12));
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: scheme.surfaceContainerLow,
        shape: shape,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 52),
          shape: shape,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 48),
          shape: shape,
        ),
      ),
      snackBarTheme:
          const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
