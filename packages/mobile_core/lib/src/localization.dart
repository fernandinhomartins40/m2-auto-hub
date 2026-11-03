import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

const appLocale = Locale('pt', 'BR');

const appLocalizationsDelegates = <LocalizationsDelegate<dynamic>>[
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
];

/// Prepara datas e moeda em pt-BR. Chamar antes do `runApp`.
Future<void> initLocale() async {
  await initializeDateFormatting('pt_BR');
  Intl.defaultLocale = 'pt_BR';
}
