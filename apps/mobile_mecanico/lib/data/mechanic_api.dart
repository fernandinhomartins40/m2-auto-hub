import 'package:dio/dio.dart';
import 'package:m2_core/m2_core.dart';

import 'models.dart';

class LoginResult {
  const LoginResult(this.mechanic, this.token);

  final Mechanic mechanic;
  final String token;
}

/// Consulta de placa pode abrir um navegador real no backend e levar ~8s.
const _slowLookup = Duration(seconds: 45);

/// Acesso à API do painel da oficina, com Bearer no lugar do cookie.
class MechanicApi {
  MechanicApi(this._dio);

  final Dio _dio;

  // ---- Sessão e perfil ----

  Future<LoginResult> login(String email, String password) {
    return guardApi(() async {
      final res = await _dio.post(
        '/auth/admin/login',
        data: {'email': email, 'password': password, 'rememberMe': true},
        options: allowUnauthorized(),
      );
      final data = unwrapObject(res.data);
      final token = data['token']?.toString() ?? '';
      if (token.isEmpty) {
        throw ApiException('Não foi possível iniciar a sessão.');
      }
      return LoginResult(
        Mechanic.fromJson(Map<String, dynamic>.from(data['admin'] as Map)),
        token,
      );
    });
  }

  Future<void> forgotPassword(String email) => guardApi(() async {
        await _dio.post('/auth/admin/forgot-password', data: {'email': email});
      });

  Future<Mechanic> profile() => guardApi(() async {
        final res = await _dio.get('/auth/admin/profile');
        return Mechanic.fromJson(unwrapObject(res.data));
      });

  Future<void> updateProfile(Map<String, dynamic> data) => guardApi(() async {
        await _dio.put(
          '/auth/admin/profile',
          data: data,
          options: allowUnauthorized(),
        );
      });

  Future<void> changePassword(String current, String next) {
    return guardApi(() async {
      await _dio.put(
        '/auth/admin/change-password',
        data: {
          'currentPassword': current,
          'newPassword': next,
          'confirmPassword': next,
        },
        options: allowUnauthorized(),
      );
    });
  }

  Future<MechanicStats> stats() => guardApi(() async {
        final res = await _dio.get('/auth/admin/stats');
        return MechanicStats.fromJson(unwrapObject(res.data));
      });

  Future<List<Activity>> activity() => guardApi(() async {
        final res = await _dio.get(
          '/auth/admin/activity-history',
          queryParameters: {'page': 1, 'limit': 50},
        );
        return unwrapItems(res.data, Activity.fromJson);
      });

  Future<Preferences> preferences() => guardApi(() async {
        final res = await _dio.get('/auth/admin/preferences');
        return Preferences.fromJson(unwrapObject(res.data));
      });

  Future<void> savePreferences(Preferences preferences) => guardApi(() async {
        await _dio.put('/auth/admin/preferences', data: preferences.raw);
      });

  // ---- Revisões ----

  /// A API já restringe a lista às revisões atribuídas a quem é `STAFF`.
  Future<List<Revision>> revisions() => guardApi(() async {
        final res = await _dio.get(
          '/admin/revisions',
          queryParameters: {'page': 1, 'limit': 100},
        );
        return unwrapItems(res.data, Revision.fromJson);
      });

  Future<Revision> revision(String id) => guardApi(() async {
        final res = await _dio.get('/admin/revisions/$id');
        return Revision.fromJson(unwrapObject(res.data));
      });

  /// Devolve o corpo salvo: ele traz os `checks` que ligam a OS ao checklist.
  Future<Map<String, dynamic>> saveRevision(
    String id,
    Map<String, dynamic> data,
  ) {
    return guardApi(() async {
      final res = await _dio.put('/admin/revisions/$id', data: data);
      return unwrapObject(res.data);
    });
  }

  Future<void> startRevision(String id) => guardApi(() async {
        await _dio.patch('/admin/revisions/$id/start');
      });

  Future<void> completeRevision(String id) => guardApi(() async {
        await _dio.patch('/admin/revisions/$id/complete');
      });

  Future<List<CatalogCategory>> checklist() => guardApi(() async {
        final res = await _dio.get('/checklist/structure');
        return asMapList(unwrapObject(res.data)['categories'])
            .map(CatalogCategory.fromJson)
            .toList();
      });

  Future<List<Appointment>> appointments() => guardApi(() async {
        final res = await _dio.get(
          '/admin/revision-appointments',
          queryParameters: {'page': 1, 'limit': 100},
        );
        return unwrapItems(res.data, Appointment.fromJson);
      });

  Future<void> startAppointment(String id) => guardApi(() async {
        await _dio.patch('/admin/revision-appointments/$id/start');
      });

  // ---- Ordens de serviço ----

  Future<List<ServiceOrder>> orders(String mechanicId) => guardApi(() async {
        final res = await _dio.get(
          '/service-orders',
          queryParameters: {'limit': 100, 'mechanicId': mechanicId},
        );
        return unwrapItems(res.data, ServiceOrder.fromJson);
      });

  Future<OrderStats> orderStats(String mechanicId) => guardApi(() async {
        final res = await _dio.get(
          '/service-orders/statistics',
          queryParameters: {'mechanicId': mechanicId},
        );
        return OrderStats.fromJson(unwrapObject(res.data));
      });

  Future<ServiceOrder> order(String id) => guardApi(() async {
        final res = await _dio.get('/service-orders/$id');
        return ServiceOrder.fromJson(unwrapObject(res.data));
      });

  Future<void> createOrder(Map<String, dynamic> data) => guardApi(() async {
        await _dio.post('/service-orders', data: data);
      });

  /// A API substitui a lista inteira ao receber `items`.
  Future<void> updateOrder(String id, Map<String, dynamic> data) {
    return guardApi(() async {
      await _dio.put('/service-orders/$id', data: data);
    });
  }

  Future<void> startOrder(String id) => guardApi(() async {
        await _dio.patch('/service-orders/$id/start');
      });

  Future<void> completeOrder(String id) => guardApi(() async {
        await _dio.patch('/service-orders/$id/complete');
      });

  // ---- Clientes (assistente de OS) ----

  /// `GET /admin/customers` devolve `{ customers, totalCount }`, sem envelope.
  Future<List<CustomerRef>> searchCustomers(String term) => guardApi(() async {
        final res = await _dio.get(
          '/admin/customers',
          queryParameters: {'page': 1, 'limit': 8, 'search': term},
        );
        final body = res.data;
        final list = body is Map && body['customers'] is List
            ? body['customers']
            : unwrapList(body);
        return asMapList(list).map(CustomerRef.fromJson).toList();
      });

  Future<List<VehicleRef>> customerVehicles(String customerId) {
    return guardApi(() async {
      final res = await _dio.get('/admin/customers/$customerId/vehicles');
      return unwrapItems(res.data, VehicleRef.fromJson);
    });
  }

  Future<CustomerRef> createCustomer({
    required String name,
    required String email,
    required String phone,
    String? cpf,
  }) {
    return guardApi(() async {
      final res = await _dio.post('/admin/customers', data: {
        'name': name,
        'email': email,
        'phone': phone,
        if ((cpf ?? '').isNotEmpty) 'cpf': cpf,
      });
      return CustomerRef.fromJson(unwrapObject(res.data));
    });
  }

  /// `POST /admin/customers/:id/vehicles` devolve o veículo sem envelope.
  Future<VehicleRef> createVehicle(
    String customerId,
    Map<String, dynamic> data,
  ) {
    return guardApi(() async {
      final res = await _dio.post(
        '/admin/customers/$customerId/vehicles',
        data: data,
      );
      return VehicleRef.fromJson(unwrapObject(res.data));
    });
  }

  // ---- Catálogo e placa ----

  Future<List<CatalogProduct>> products() => guardApi(() async {
        final res = await _dio.get(
          '/products',
          queryParameters: {'page': 1, 'limit': 100, 'status': 'ACTIVE'},
        );
        return unwrapItems(res.data, CatalogProduct.fromJson);
      });

  Future<List<CatalogService>> services() => guardApi(() async {
        final res = await _dio.get(
          '/services',
          queryParameters: {'page': 1, 'limit': 100, 'status': 'ACTIVE'},
        );
        return unwrapItems(res.data, CatalogService.fromJson);
      });

  Future<PlateLookup> lookupPlate(String plate) => guardApi(() async {
        final res = await _dio.get(
          '/admin/vehicles/lookup',
          queryParameters: {'plate': plate},
          options: Options(receiveTimeout: _slowLookup),
        );
        return PlateLookup.fromJson(unwrapObject(res.data));
      });

  /// Lê a placa na foto com o serviço ALPR. Devolve null se não reconhecer.
  Future<String?> recognizePlate(String imagePath) => guardApi(() async {
        final form = FormData.fromMap({
          'image': await MultipartFile.fromFile(
            imagePath,
            filename: 'plate-capture.jpg',
          ),
        });
        final res = await _dio.post(
          '/admin/vehicles/recognize',
          data: form,
          options: Options(
            sendTimeout: _slowLookup,
            receiveTimeout: _slowLookup,
          ),
        );
        return unwrapObject(res.data)['plate']?.toString();
      });
}
