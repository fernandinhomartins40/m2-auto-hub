import 'package:intl/intl.dart';

final _money = NumberFormat.currency(locale: 'pt_BR', symbol: r'R$');
final _date = DateFormat('dd/MM/yyyy');
final _dateTime = DateFormat('dd/MM/yyyy HH:mm');
final _thousands = NumberFormat.decimalPattern('pt_BR');

String formatMoney(num value) => _money.format(value);

String formatDate(DateTime? value) =>
    value == null ? 'Não informado' : _date.format(value);

String formatDateTime(DateTime? value) =>
    value == null ? 'Não informado' : _dateTime.format(value);

String formatKm(int? value) => value == null || value == 0
    ? 'Não informada'
    : '${_thousands.format(value)} km';

/// Só os dígitos, como a API espera telefone e CPF.
String digitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

/// Placa em maiúsculas, sem traço nem espaço.
String normalizePlate(String value) =>
    value.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');

/// Aceita o padrão antigo (ABC1234) e o Mercosul (ABC1D23).
bool isValidPlate(String value) =>
    RegExp(r'^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$').hasMatch(normalizePlate(value));

/// Quem digita "óleo" precisa achar "Oleo do motor": o cadastro nem sempre
/// usa acento. Mesma regra da busca do checklist no painel web.
String withoutAccents(String value) {
  const from = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
  const to = 'aaaaaeeeeiiiiooooouuuucn';
  final buffer = StringBuffer();
  for (final char in value.toLowerCase().trim().split('')) {
    final index = from.indexOf(char);
    buffer.write(index >= 0 ? to[index] : char);
  }
  return buffer.toString();
}

final _specialChar = RegExp('[!@#\$%^&*(),.?":{}|<>_\\-+=\\[\\]\\\\/;\'`~]');

/// Regra de senha do backend (`register.dto.ts`). Devolve o que falta ou null.
String? passwordProblem(String password) {
  if (password.length < 8) return 'Use pelo menos 8 caracteres';
  if (!RegExp(r'[A-Z]').hasMatch(password)) return 'Inclua uma letra maiúscula';
  if (!RegExp(r'[a-z]').hasMatch(password)) return 'Inclua uma letra minúscula';
  if (!RegExp(r'\d').hasMatch(password)) return 'Inclua um número';
  if (!_specialChar.hasMatch(password)) return 'Inclua um caractere especial';
  return null;
}
