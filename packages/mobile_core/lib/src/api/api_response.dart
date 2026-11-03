/// Helpers para desembrulhar o envelope `{ success, data, meta? }` da API.
library;

Map<String, dynamic> unwrapObject(dynamic body) {
  final data = _extract(body);
  if (data is Map) return Map<String, dynamic>.from(data);
  throw const FormatException('Resposta inesperada da API (esperava objeto).');
}

List<dynamic> unwrapList(dynamic body) {
  final data = _extract(body);
  if (data is List) return data;
  throw const FormatException('Resposta inesperada da API (esperava lista).');
}

/// Converte cada item de uma coleção da API com [parse].
List<T> unwrapItems<T>(
  dynamic body,
  T Function(Map<String, dynamic> json) parse,
) {
  return unwrapList(body)
      .map((item) => parse(Map<String, dynamic>.from(item as Map)))
      .toList();
}

dynamic _extract(dynamic body) {
  if (body is Map && body.containsKey('data')) return body['data'];
  return body;
}

/// A API serializa Decimal como string ("120.50") em várias rotas.
double asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int asInt(dynamic value) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

DateTime? asDate(dynamic value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value)?.toLocal();
  }
  return null;
}

Map<String, dynamic>? asMap(dynamic value) {
  return value is Map ? Map<String, dynamic>.from(value) : null;
}

List<Map<String, dynamic>> asMapList(dynamic value) {
  if (value is! List) return const [];
  return value.whereType<Map>().map(Map<String, dynamic>.from).toList();
}
