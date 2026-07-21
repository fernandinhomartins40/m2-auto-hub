import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/providers.dart';

/// Resultado da consulta por placa.
///
/// Atenção: este endpoint (`GET /admin/vehicles/lookup`) NÃO usa o envelope
/// `{ success, data }` — retorna o objeto direto `{ found, plate, vehicle, customer }`.
class PlateLookupResult {
  PlateLookupResult({
    required this.found,
    required this.plate,
    this.vehicle,
    this.customer,
  });

  final bool found;
  final String plate;
  final Map<String, dynamic>? vehicle;
  final Map<String, dynamic>? customer;

  factory PlateLookupResult.fromJson(Map<String, dynamic> json) {
    return PlateLookupResult(
      found: json['found'] == true,
      plate: json['plate']?.toString() ?? '',
      vehicle: json['vehicle'] as Map<String, dynamic>?,
      customer: json['customer'] as Map<String, dynamic>?,
    );
  }
}

class PlateLookupRepository {
  PlateLookupRepository(this._dio);
  final Dio _dio;

  Future<PlateLookupResult> lookup(String plate) async {
    try {
      final res = await _dio.get(
        '/admin/vehicles/lookup',
        queryParameters: {'plate': plate},
      );
      return PlateLookupResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final plateLookupRepositoryProvider = Provider<PlateLookupRepository>(
  (ref) => PlateLookupRepository(ref.watch(dioProvider)),
);
