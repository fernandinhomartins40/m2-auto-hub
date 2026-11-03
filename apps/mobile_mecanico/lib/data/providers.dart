import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../features/auth/auth_controller.dart';
import 'mechanic_api.dart';
import 'models.dart';

final apiProvider = Provider<MechanicApi>(
  (ref) => MechanicApi(ref.watch(dioProvider)),
);

class RevisionQueue {
  const RevisionQueue(this.revisions, this.appointments);

  final List<Revision> revisions;

  /// Só os agendamentos que ainda podem virar revisão.
  final List<Appointment> appointments;
}

final revisionQueueProvider = FutureProvider.autoDispose<RevisionQueue>(
  (ref) async {
    final api = ref.watch(apiProvider);
    final revisions = api.revisions();
    final appointments = api.appointments();
    return RevisionQueue(
      await revisions,
      (await appointments).where((a) => a.status == 'SCHEDULED').toList(),
    );
  },
);

class OrderBoard {
  const OrderBoard(this.orders, this.stats);

  final List<ServiceOrder> orders;
  final OrderStats stats;
}

final orderBoardProvider = FutureProvider.autoDispose<OrderBoard>(
  (ref) async {
    final mechanicId = ref.watch(mechanicIdProvider);
    if (mechanicId == null) {
      throw ApiException('Não foi possível carregar seu perfil.');
    }
    final api = ref.watch(apiProvider);
    final orders = api.orders(mechanicId);
    final stats = api.orderStats(mechanicId);
    return OrderBoard(await orders, await stats);
  },
);

final orderProvider = FutureProvider.autoDispose.family<ServiceOrder, String>(
  (ref, id) => ref.watch(apiProvider).order(id),
);

final productsProvider = FutureProvider.autoDispose<List<CatalogProduct>>(
  (ref) => ref.watch(apiProvider).products(),
);

final servicesProvider = FutureProvider.autoDispose<List<CatalogService>>(
  (ref) => ref.watch(apiProvider).services(),
);

final statsProvider = FutureProvider.autoDispose<MechanicStats>(
  (ref) => ref.watch(apiProvider).stats(),
);

final activityProvider = FutureProvider.autoDispose<List<Activity>>(
  (ref) => ref.watch(apiProvider).activity(),
);
