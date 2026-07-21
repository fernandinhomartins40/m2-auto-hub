/// Helpers para desembrulhar o envelope padrão da API do M2.
///
/// O backend responde sempre `{ success: true, data: <payload>, meta?: {...} }`.
/// Espelha o `return response.data.data` usado nos serviços do painel web.
library;

/// Extrai `data` de uma resposta como [Map] (objeto único).
Map<String, dynamic> unwrapObject(dynamic responseData) {
  final data = _extractData(responseData);
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Resposta inesperada da API (esperava objeto).');
}

/// Extrai `data` de uma resposta como [List] (coleção).
List<dynamic> unwrapList(dynamic responseData) {
  final data = _extractData(responseData);
  if (data is List) return data;
  throw const FormatException('Resposta inesperada da API (esperava lista).');
}

dynamic _extractData(dynamic responseData) {
  if (responseData is Map && responseData.containsKey('data')) {
    return responseData['data'];
  }
  return responseData;
}
