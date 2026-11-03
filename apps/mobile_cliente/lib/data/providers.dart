import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import 'customer_api.dart';
import 'models.dart';

final apiProvider = Provider<CustomerApi>(
  (ref) => CustomerApi(ref.watch(dioProvider)),
);

/// `autoDispose` em tudo: ao sair da conta as telas somem e nenhum dado do
/// cliente anterior fica em memória para a próxima sessão.
final ordersProvider = FutureProvider.autoDispose<List<Order>>(
  (ref) => ref.watch(apiProvider).orders(),
);

final quotesProvider = FutureProvider.autoDispose<List<Quote>>(
  (ref) => ref.watch(apiProvider).quotes(),
);

final vehiclesProvider = FutureProvider.autoDispose<List<Vehicle>>(
  (ref) => ref.watch(apiProvider).vehicles(),
);

final revisionsProvider = FutureProvider.autoDispose<List<Revision>>(
  (ref) => ref.watch(apiProvider).revisions(),
);

final appointmentsProvider = FutureProvider.autoDispose<List<Appointment>>(
  (ref) => ref.watch(apiProvider).appointments(),
);

final favoritesProvider = FutureProvider.autoDispose<List<FavoriteProduct>>(
  (ref) => ref.watch(apiProvider).favorites(),
);

final couponsProvider = FutureProvider.autoDispose<List<Coupon>>(
  (ref) => ref.watch(apiProvider).coupons(),
);

final notificationsProvider = FutureProvider.autoDispose<List<AppNotification>>(
  (ref) => ref.watch(apiProvider).notifications(),
);

final unreadCountProvider = FutureProvider.autoDispose<int>(
  (ref) => ref.watch(apiProvider).unreadCount(),
);

final servicesProvider = FutureProvider.autoDispose<List<ServiceOption>>(
  (ref) => ref.watch(apiProvider).services(),
);

final ticketsProvider = FutureProvider.autoDispose<List<Ticket>>(
  (ref) => ref.watch(apiProvider).tickets(),
);

final ticketProvider = FutureProvider.autoDispose.family<Ticket, String>(
  (ref, id) => ref.watch(apiProvider).ticket(id),
);

final ticketMessagesProvider =
    FutureProvider.autoDispose.family<List<TicketMessage>, String>(
  (ref, id) => ref.watch(apiProvider).ticketMessages(id),
);

final faqProvider = FutureProvider.autoDispose<List<FaqCategory>>(
  (ref) => ref.watch(apiProvider).faq(),
);

final supportContactsProvider = FutureProvider.autoDispose<SupportContacts>(
  (ref) => ref.watch(apiProvider).supportContacts(),
);
