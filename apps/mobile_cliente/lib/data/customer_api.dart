import 'package:dio/dio.dart';
import 'package:m2_core/m2_core.dart';

import 'models.dart';

class AuthResult {
  const AuthResult(this.customer, this.token);

  final Customer customer;
  final String token;
}

/// Acesso à API do cliente: as mesmas rotas do painel web, com Bearer no lugar
/// do cookie.
class CustomerApi {
  CustomerApi(this._dio);

  final Dio _dio;

  // ---- Sessão ----

  Future<AuthResult> login(String identifier, String password) {
    return _auth('/auth/login', {
      'identifier': identifier,
      'password': password,
      'rememberMe': true,
    });
  }

  Future<AuthResult> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    String? cpf,
  }) {
    return _auth('/auth/register', {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
      if (cpf != null) 'cpf': cpf,
      'rememberMe': true,
    });
  }

  Future<AuthResult> _auth(String path, Map<String, dynamic> body) {
    return guardApi(() async {
      final res = await _dio.post(path, data: body, options: allowUnauthorized());
      final data = unwrapObject(res.data);
      final token = data['token']?.toString() ?? '';
      if (token.isEmpty) {
        throw ApiException('Não foi possível iniciar a sessão.');
      }
      return AuthResult(
        Customer.fromJson(Map<String, dynamic>.from(data['customer'] as Map)),
        token,
      );
    });
  }

  Future<void> forgotPassword(String email) => guardApi(() async {
        await _dio.post('/auth/forgot-password', data: {'email': email});
      });

  Future<Customer> profile() => guardApi(() async {
        final res = await _dio.get('/auth/profile');
        return Customer.fromJson(unwrapObject(res.data));
      });

  Future<void> updateProfile(Map<String, dynamic> data) => guardApi(() async {
        await _dio.put(
          '/auth/profile',
          data: data,
          options: allowUnauthorized(),
        );
      });

  Future<void> changePassword(String current, String next) => guardApi(() async {
        await _dio.put(
          '/auth/change-password',
          data: {
            'currentPassword': current,
            'newPassword': next,
            'confirmPassword': next,
          },
          options: allowUnauthorized(),
        );
      });

  // ---- Compras ----

  Future<List<Order>> orders() => guardApi(() async {
        final res = await _dio.get('/customers/me/orders');
        return unwrapItems(res.data, Order.fromJson);
      });

  Future<List<Quote>> quotes() => guardApi(() async {
        final res = await _dio.get('/customers/me/quotes');
        return unwrapItems(res.data, Quote.fromJson);
      });

  Future<void> approveQuote(String id) => guardApi(() async {
        await _dio.patch('/customers/me/quotes/$id/approve');
      });

  Future<void> rejectQuote(String id) => guardApi(() async {
        await _dio.patch('/customers/me/quotes/$id/reject');
      });

  Future<void> requestQuote({
    required Map<String, int> quantityByService,
    String? addressId,
    String? observations,
  }) {
    return guardApi(() async {
      await _dio.post('/customers/me/quotes', data: {
        if (addressId != null) 'addressId': addressId,
        if (observations != null) 'observations': observations,
        'items': [
          for (final entry in quantityByService.entries)
            {'serviceId': entry.key, 'quantity': entry.value},
        ],
      });
    });
  }

  Future<List<ServiceOption>> services() => guardApi(() async {
        final res = await _dio.get(
          '/services',
          queryParameters: {'page': 1, 'limit': 100, 'status': 'ACTIVE'},
        );
        return unwrapItems(res.data, ServiceOption.fromJson);
      });

  // ---- Veículos e revisões ----

  Future<List<Vehicle>> vehicles() => guardApi(() async {
        final res = await _dio.get('/customer-vehicles');
        return unwrapItems(res.data, Vehicle.fromJson);
      });

  Future<void> saveVehicle(String? id, Map<String, dynamic> data) {
    return guardApi(() async {
      if (id == null) {
        await _dio.post('/customer-vehicles', data: data);
      } else {
        await _dio.put('/customer-vehicles/$id', data: data);
      }
    });
  }

  Future<void> deleteVehicle(String id) => guardApi(() async {
        await _dio.delete('/customer-vehicles/$id');
      });

  Future<List<Revision>> revisions() => guardApi(() async {
        final res = await _dio.get('/customer-revisions');
        return unwrapItems(res.data, Revision.fromJson);
      });

  Future<List<Appointment>> appointments() => guardApi(() async {
        final res = await _dio.get(
          '/customer-revisions/appointments',
          queryParameters: {'page': 1, 'limit': 50},
        );
        return unwrapItems(res.data, Appointment.fromJson);
      });

  Future<void> scheduleRevision({
    required String vehicleId,
    required DateTime preferredDate,
    String? notes,
  }) {
    return guardApi(() async {
      await _dio.post('/customer-revisions/appointments', data: {
        'vehicleId': vehicleId,
        'preferredDate': preferredDate.toUtc().toIso8601String(),
        if (notes != null) 'notes': notes,
      });
    });
  }

  Future<void> cancelAppointment(String id) => guardApi(() async {
        await _dio.patch('/customer-revisions/appointments/$id/cancel', data: {});
      });

  // ---- Benefícios ----

  Future<List<FavoriteProduct>> favorites() => guardApi(() async {
        final res = await _dio.get(
          '/favorites',
          queryParameters: {'page': 1, 'limit': 100},
        );
        return asMapList(unwrapObject(res.data)['favorites'])
            .map(FavoriteProduct.fromJson)
            .toList();
      });

  Future<void> removeFavorite(String productId) => guardApi(() async {
        await _dio.delete('/favorites/product/$productId');
      });

  Future<List<Coupon>> coupons() => guardApi(() async {
        final res = await _dio.get('/coupons/active');
        return unwrapItems(res.data, Coupon.fromJson);
      });

  // ---- Endereços ----

  Future<void> saveAddress(String? id, Map<String, dynamic> data) {
    return guardApi(() async {
      if (id == null) {
        await _dio.post('/addresses', data: data);
      } else {
        await _dio.put('/addresses/$id', data: data);
      }
    });
  }

  Future<void> deleteAddress(String id) => guardApi(() async {
        await _dio.delete('/addresses/$id');
      });

  Future<void> setDefaultAddress(String id) => guardApi(() async {
        await _dio.patch('/addresses/$id/default');
      });

  // ---- Notificações ----

  Future<List<AppNotification>> notifications() => guardApi(() async {
        final res = await _dio.get('/customer/notifications');
        return unwrapItems(res.data, AppNotification.fromJson);
      });

  Future<int> unreadCount() => guardApi(() async {
        final res = await _dio.get('/customer/notifications/unread-count');
        return asInt(unwrapObject(res.data)['count']);
      });

  Future<void> markRead(String id) => guardApi(() async {
        await _dio.patch('/customer/notifications/$id/read');
      });

  Future<void> markAllRead() => guardApi(() async {
        await _dio.patch('/customer/notifications/mark-all-read');
      });

  // ---- Suporte ----

  Future<List<Ticket>> tickets() => guardApi(() async {
        final res = await _dio.get('/support/tickets');
        return unwrapItems(res.data, Ticket.fromJson);
      });

  Future<void> createTicket({
    required String subject,
    required String category,
    required String message,
    String priority = 'MEDIUM',
  }) {
    return guardApi(() async {
      await _dio.post('/support/tickets', data: {
        'subject': subject,
        'category': category,
        'priority': priority,
        'message': message,
      });
    });
  }

  Future<Ticket> ticket(String id) => guardApi(() async {
        final res = await _dio.get('/support/tickets/$id');
        return Ticket.fromJson(unwrapObject(res.data));
      });

  Future<List<TicketMessage>> ticketMessages(String id) => guardApi(() async {
        final res = await _dio.get('/support/tickets/$id/messages');
        return unwrapItems(res.data, TicketMessage.fromJson);
      });

  Future<void> sendTicketMessage(String id, String message) {
    return guardApi(() async {
      await _dio.post('/support/tickets/$id/messages', data: {'message': message});
    });
  }

  Future<void> closeTicket(String id) => guardApi(() async {
        await _dio.delete('/support/tickets/$id');
      });

  Future<void> rateTicket(String id, int rating) => guardApi(() async {
        await _dio.post('/support/tickets/$id/rating', data: {'rating': rating});
      });

  Future<List<FaqCategory>> faq() => guardApi(() async {
        final res = await _dio.get('/support/faq');
        return unwrapItems(res.data, FaqCategory.fromJson);
      });

  Future<SupportContacts> supportContacts() => guardApi(() async {
        final res = await _dio.get('/support/config');
        return SupportContacts.fromJson(unwrapObject(res.data));
      });

  // ---- Privacidade ----

  /// Abre uma solicitação LGPD. `DELETION` é a exclusão de conta exigida pela
  /// Google Play para apps com cadastro.
  Future<void> privacyRequest(String type) => guardApi(() async {
        await _dio.post('/privacy/me/requests', data: {'type': type});
      });
}
