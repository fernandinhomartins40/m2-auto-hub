import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Item da tabela FIPE (marca, modelo ou ano).
class FipeOption {
  const FipeOption(this.code, this.name);

  final String code;
  final String name;
}

/// Tabela FIPE pública, a mesma fonte do `fipeService` do PWA (carros).
/// Usa um Dio próprio de propósito: o token da sessão não vai para terceiros.
class FipeApi {
  FipeApi([Dio? dio])
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: 'https://fipe.parallelum.com.br/api/v2/cars',
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 30),
            ));

  final Dio _dio;

  Future<List<FipeOption>> brands() => _list('/brands');

  Future<List<FipeOption>> models(String brand) =>
      _list('/brands/$brand/models');

  Future<List<FipeOption>> years(String brand, String model) =>
      _list('/brands/$brand/models/$model/years');

  Future<List<FipeOption>> _list(String path) async {
    final res = await _dio.get<List<dynamic>>(path);
    return [
      for (final item in res.data ?? const [])
        if (item is Map) FipeOption('${item['code']}', '${item['name']}'),
    ];
  }

  /// "2020-1" ou "2020 Gasolina" viram 2020, como `extractYear` do PWA.
  static int? yearOf(String code) {
    final match = RegExp(r'^(\d{4})').firstMatch(code);
    return match == null ? null : int.parse(match.group(1)!);
  }
}

final fipeApiProvider = Provider<FipeApi>((ref) => FipeApi());

// Sem autoDispose: a tabela fica em memória durante o uso do app, como o
// cache do PWA, e não repete a consulta a cada cadastro.
final fipeBrandsProvider = FutureProvider<List<FipeOption>>(
  (ref) => ref.watch(fipeApiProvider).brands(),
);

final fipeModelsProvider = FutureProvider.family<List<FipeOption>, String>(
  (ref, brand) => ref.watch(fipeApiProvider).models(brand),
);

final fipeYearsProvider =
    FutureProvider.family<List<FipeOption>, (String, String)>(
  (ref, key) => ref.watch(fipeApiProvider).years(key.$1, key.$2),
);
