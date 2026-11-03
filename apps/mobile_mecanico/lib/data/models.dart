import 'package:m2_core/m2_core.dart';

/// Modelos do app do mecânico. Os campos seguem as respostas reais da API.

class Mechanic {
  const Mechanic({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory Mechanic.fromJson(Map<String, dynamic> json) => Mechanic(
        id: json['id'].toString(),
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        role: json['role']?.toString() ?? '',
      );

  final String id;
  final String name;
  final String email;
  final String role;

  /// O PWA do mecânico também só abre para `STAFF`; os demais papéis usam o
  /// painel da loja.
  bool get isMechanic => role == 'STAFF';
}

class CustomerRef {
  const CustomerRef({
    required this.id,
    required this.name,
    this.phone,
    this.email,
  });

  factory CustomerRef.fromJson(Map<String, dynamic> json) => CustomerRef(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Cliente',
        phone: (json['phone'] ?? json['whatsapp'])?.toString(),
        email: json['email']?.toString(),
      );

  final String id;
  final String name;
  final String? phone;
  final String? email;
}

class VehicleRef {
  const VehicleRef({
    required this.id,
    required this.brand,
    required this.model,
    required this.plate,
    this.year,
    this.mileage,
    this.color,
  });

  factory VehicleRef.fromJson(Map<String, dynamic> json) => VehicleRef(
        id: json['id']?.toString() ?? '',
        brand: json['brand']?.toString() ?? '',
        model: json['model']?.toString() ?? '',
        plate: json['plate']?.toString() ?? '',
        year: json['year'] == null ? null : asInt(json['year']),
        mileage: json['mileage'] == null ? null : asInt(json['mileage']),
        color: json['color']?.toString(),
      );

  final String id;
  final String brand;
  final String model;
  final String plate;
  final int? year;
  final int? mileage;
  final String? color;

  String get label => '$brand $model'.trim();
}

enum CheckStatus {
  notChecked('NOT_CHECKED'),
  ok('OK'),
  attention('ATTENTION'),
  critical('CRITICAL'),
  notApplicable('NOT_APPLICABLE');

  const CheckStatus(this.api);

  final String api;

  static CheckStatus parse(String? value) => CheckStatus.values.firstWhere(
        (status) => status.api == value,
        orElse: () => CheckStatus.notChecked,
      );

  bool get isProblem => this == attention || this == critical;
}

/// Um item do checklist dentro de uma revisão.
class CheckEntry {
  const CheckEntry({
    required this.itemId,
    required this.itemName,
    required this.categoryId,
    required this.categoryName,
    this.status = CheckStatus.notChecked,
    this.notes = '',
  });

  factory CheckEntry.fromJson(Map<String, dynamic> json) => CheckEntry(
        itemId: json['itemId']?.toString() ?? '',
        itemName: json['itemName']?.toString() ?? '',
        categoryId: json['categoryId']?.toString() ?? '',
        categoryName: json['categoryName']?.toString() ?? 'Geral',
        status: CheckStatus.parse(json['status']?.toString()),
        notes: json['notes']?.toString() ?? '',
      );

  final String itemId;
  final String itemName;
  final String categoryId;
  final String categoryName;
  final CheckStatus status;
  final String notes;

  CheckEntry copyWith({CheckStatus? status, String? notes}) => CheckEntry(
        itemId: itemId,
        itemName: itemName,
        categoryId: categoryId,
        categoryName: categoryName,
        status: status ?? this.status,
        notes: notes ?? this.notes,
      );

  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'categoryName': categoryName,
        'itemId': itemId,
        'itemName': itemName,
        'status': status.api,
        if (notes.isNotEmpty) 'notes': notes,
        'photos': const <String>[],
      };
}

class CatalogItem {
  const CatalogItem({required this.id, required this.name});

  final String id;
  final String name;
}

class CatalogCategory {
  const CatalogCategory({
    required this.id,
    required this.name,
    required this.items,
  });

  factory CatalogCategory.fromJson(Map<String, dynamic> json) =>
      CatalogCategory(
        id: json['id'].toString(),
        name: json['name']?.toString() ?? '',
        items: [
          for (final item in asMapList(json['items']))
            CatalogItem(
              id: item['id'].toString(),
              name: item['name']?.toString() ?? '',
            ),
        ],
      );

  final String id;
  final String name;
  final List<CatalogItem> items;
}

class Revision {
  const Revision({
    required this.id,
    required this.customerId,
    required this.vehicleId,
    required this.status,
    required this.checks,
    this.date,
    this.completedAt,
    this.createdAt,
    this.mileage,
    this.generalNotes,
    this.recommendations,
    this.assignedMechanicId,
    this.customer,
    this.vehicle,
  });

  factory Revision.fromJson(Map<String, dynamic> json) {
    final customer = asMap(json['customer']);
    final vehicle = asMap(json['vehicle']);
    return Revision(
      id: json['id'].toString(),
      customerId: json['customerId']?.toString() ?? '',
      vehicleId: json['vehicleId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'DRAFT',
      checks: asMapList(json['checklistItems']).map(CheckEntry.fromJson).toList(),
      date: asDate(json['date']),
      completedAt: asDate(json['completedAt']),
      createdAt: asDate(json['createdAt']),
      mileage: json['mileage'] == null ? null : asInt(json['mileage']),
      generalNotes: json['generalNotes']?.toString(),
      recommendations: json['recommendations']?.toString(),
      assignedMechanicId: json['assignedMechanicId']?.toString(),
      customer: customer == null ? null : CustomerRef.fromJson(customer),
      vehicle: vehicle == null ? null : VehicleRef.fromJson(vehicle),
    );
  }

  final String id;
  final String customerId;
  final String vehicleId;
  final String status;
  final List<CheckEntry> checks;
  final DateTime? date;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final int? mileage;
  final String? generalNotes;
  final String? recommendations;
  final String? assignedMechanicId;
  final CustomerRef? customer;
  final VehicleRef? vehicle;

  bool get isClosed => status == 'COMPLETED' || status == 'CANCELLED';

  (String, StatusTone) get statusView => switch (status) {
        'IN_PROGRESS' => ('Em andamento', StatusTone.info),
        'COMPLETED' => ('Concluída', StatusTone.success),
        'CANCELLED' => ('Cancelada', StatusTone.danger),
        _ => ('Pendente', StatusTone.warning),
      };
}

/// Mapa de item avaliado para a linha relacional criada pela API ao salvar.
Map<String, String> revisionCheckIds(Map<String, dynamic> savedRevision) {
  return {
    for (final check in asMapList(savedRevision['checks']))
      (check['itemId'] ?? check['itemName']).toString(): check['id'].toString(),
  };
}

class Appointment {
  const Appointment({
    required this.id,
    required this.status,
    this.scheduledAt,
    this.notes,
    this.customer,
    this.vehicle,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    final customer = asMap(json['customer']);
    final vehicle = asMap(json['vehicle']);
    return Appointment(
      id: json['id'].toString(),
      status: json['status']?.toString() ?? 'REQUESTED',
      scheduledAt: asDate(json['scheduledAt']),
      notes: json['notes']?.toString(),
      customer: customer == null ? null : CustomerRef.fromJson(customer),
      vehicle: vehicle == null ? null : VehicleRef.fromJson(vehicle),
    );
  }

  final String id;
  final String status;
  final DateTime? scheduledAt;
  final String? notes;
  final CustomerRef? customer;
  final VehicleRef? vehicle;
}

class OrderItem {
  const OrderItem({
    required this.type,
    required this.name,
    required this.unitPrice,
    required this.quantity,
    this.productId,
    this.serviceId,
    this.revisionCheckId,
    this.stock,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        type: json['type']?.toString() ?? 'SERVICE',
        name: json['name']?.toString() ?? '',
        unitPrice: asDouble(json['unitPrice']),
        quantity: asInt(json['quantity']),
        productId: json['productId']?.toString(),
        serviceId: json['serviceId']?.toString(),
        revisionCheckId: json['revisionCheckId']?.toString(),
      );

  final String type;
  final String name;
  final double unitPrice;
  final int quantity;
  final String? productId;
  final String? serviceId;
  final String? revisionCheckId;

  /// Só para avisar na tela; não é enviado à API.
  final int? stock;

  bool get isProduct => type == 'PRODUCT';
  double get subtotal => unitPrice * quantity;
  bool get exceedsStock => stock != null && quantity > stock!;

  OrderItem copyWith({int? quantity, double? unitPrice}) => OrderItem(
        type: type,
        name: name,
        unitPrice: unitPrice ?? this.unitPrice,
        quantity: quantity ?? this.quantity,
        productId: productId,
        serviceId: serviceId,
        revisionCheckId: revisionCheckId,
        stock: stock,
      );

  Map<String, dynamic> toJson() => {
        'type': type,
        'productId': productId,
        'serviceId': serviceId,
        'name': name,
        'unitPrice': unitPrice,
        'quantity': quantity,
        'revisionCheckId': revisionCheckId,
      };
}

class ServiceOrder {
  const ServiceOrder({
    required this.id,
    required this.number,
    required this.status,
    required this.customerName,
    required this.laborTotal,
    required this.partsTotal,
    required this.discount,
    required this.total,
    required this.items,
    this.customerId,
    this.vehicleId,
    this.customerPhone,
    this.vehicleLabel,
    this.vehiclePlate,
    this.mileage,
    this.description,
    this.internalNotes,
    this.revisionId,
    this.createdAt,
  });

  factory ServiceOrder.fromJson(Map<String, dynamic> json) => ServiceOrder(
        id: json['id'].toString(),
        number: asInt(json['number']),
        status: json['status']?.toString() ?? 'OPEN',
        customerId: json['customerId']?.toString(),
        vehicleId: json['vehicleId']?.toString(),
        customerName: json['customerName']?.toString() ?? '',
        customerPhone: json['customerPhone']?.toString(),
        vehicleLabel: json['vehicleLabel']?.toString(),
        vehiclePlate: json['vehiclePlate']?.toString(),
        mileage: json['mileage'] == null ? null : asInt(json['mileage']),
        description: json['description']?.toString(),
        internalNotes: json['internalNotes']?.toString(),
        laborTotal: asDouble(json['laborTotal']),
        partsTotal: asDouble(json['partsTotal']),
        discount: asDouble(json['discount']),
        total: asDouble(json['total']),
        revisionId: json['revisionId']?.toString(),
        createdAt: asDate(json['createdAt']),
        items: asMapList(json['items']).map(OrderItem.fromJson).toList(),
      );

  final String id;
  final int number;
  final String status;
  final String? customerId;
  final String? vehicleId;
  final String customerName;
  final String? customerPhone;
  final String? vehicleLabel;
  final String? vehiclePlate;
  final int? mileage;
  final String? description;
  final String? internalNotes;
  final double laborTotal;
  final double partsTotal;
  final double discount;
  final double total;
  final String? revisionId;
  final DateTime? createdAt;
  final List<OrderItem> items;

  bool get isOpen => status == 'OPEN' || status == 'IN_PROGRESS';

  String get vehicleText => [
        if ((vehicleLabel ?? '').isNotEmpty) vehicleLabel,
        if ((vehiclePlate ?? '').isNotEmpty) vehiclePlate,
      ].join(' · ');

  (String, StatusTone) get statusView => switch (status) {
        'IN_PROGRESS' => ('Em andamento', StatusTone.info),
        'COMPLETED' => ('Concluída', StatusTone.success),
        'CANCELLED' => ('Cancelada', StatusTone.danger),
        _ => ('Aberta', StatusTone.warning),
      };

  bool matches(String search) {
    final term = withoutAccents(search);
    return term.isEmpty ||
        '$number'.contains(term) ||
        withoutAccents(customerName).contains(term) ||
        withoutAccents(vehiclePlate ?? '').contains(term) ||
        withoutAccents(vehicleLabel ?? '').contains(term);
  }
}

class OrderStats {
  const OrderStats({
    required this.open,
    required this.inProgress,
    required this.completedToday,
    required this.total,
  });

  factory OrderStats.fromJson(Map<String, dynamic> json) => OrderStats(
        open: asInt(json['open']),
        inProgress: asInt(json['inProgress']),
        completedToday: asInt(json['completedToday']),
        total: asInt(json['total']),
      );

  final int open;
  final int inProgress;
  final int completedToday;
  final int total;
}

class CatalogProduct {
  const CatalogProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
  });

  factory CatalogProduct.fromJson(Map<String, dynamic> json) {
    final promo = asDouble(json['promoPrice']);
    return CatalogProduct(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      price: promo > 0 ? promo : asDouble(json['salePrice']),
      stock: asInt(json['stock']),
    );
  }

  final String id;
  final String name;
  final String category;
  final double price;
  final int stock;

  OrderItem toItem() => OrderItem(
        type: 'PRODUCT',
        name: name,
        unitPrice: price,
        quantity: 1,
        productId: id,
        stock: stock,
      );
}

class CatalogService {
  const CatalogService({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
  });

  factory CatalogService.fromJson(Map<String, dynamic> json) => CatalogService(
        id: json['id'].toString(),
        name: json['name']?.toString() ?? '',
        category: json['category']?.toString() ?? '',
        price: asDouble(json['basePrice']),
      );

  final String id;
  final String name;
  final String category;
  final double price;

  OrderItem toItem() => OrderItem(
        type: 'SERVICE',
        name: name,
        unitPrice: price,
        quantity: 1,
        serviceId: id,
      );
}

/// Resultado de `GET /admin/vehicles/lookup`, que vem sem envelope.
class PlateLookup {
  const PlateLookup({
    required this.found,
    required this.plate,
    this.customer,
    this.vehicle,
    this.vehicleLabel,
  });

  factory PlateLookup.fromJson(Map<String, dynamic> json) {
    final customer = asMap(json['customer']);
    final vehicle = asMap(json['vehicle']);
    final technical = asMap(json['technicalData']);
    final technicalLabel = [
      technical?['brand'],
      technical?['model'],
    ].whereType<Object>().join(' ');
    return PlateLookup(
      found: json['found'] == true,
      plate: json['plate']?.toString() ?? '',
      customer: customer == null ? null : CustomerRef.fromJson(customer),
      vehicle: vehicle == null ? null : VehicleRef.fromJson(vehicle),
      vehicleLabel: technicalLabel.isEmpty ? null : technicalLabel,
    );
  }

  final bool found;
  final String plate;
  final CustomerRef? customer;
  final VehicleRef? vehicle;
  final String? vehicleLabel;
}

class MechanicStats {
  const MechanicStats({
    required this.total,
    required this.completed,
    required this.inProgress,
    required this.pending,
    required this.completionRate,
    this.averageMinutes,
    this.averageHours,
  });

  factory MechanicStats.fromJson(Map<String, dynamic> json) => MechanicStats(
        total: asInt(json['totalRevisions']),
        completed: asInt(json['completedRevisions']),
        inProgress: asInt(json['inProgressRevisions']),
        pending: asInt(json['pendingRevisions']),
        completionRate: asDouble(json['completionRate']),
        averageHours: json['averageCompletionTime'] == null
            ? null
            : asDouble(json['averageCompletionTime']),
      );

  final int total;
  final int completed;
  final int inProgress;
  final int pending;
  final double completionRate;
  final double? averageMinutes;

  /// `averageCompletionTime` da API, em horas; nulo sem revisões concluídas.
  final double? averageHours;
}

class Activity {
  const Activity({
    required this.id,
    required this.vehicleInfo,
    required this.customerName,
    required this.status,
    this.date,
  });

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
        id: json['id'].toString(),
        vehicleInfo: json['vehicleInfo']?.toString() ?? '',
        customerName: json['customerName']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        date: asDate(json['date']),
      );

  final String id;
  final String vehicleInfo;
  final String customerName;
  final String status;
  final DateTime? date;
}

class Preferences {
  const Preferences(this.raw);

  factory Preferences.fromJson(Map<String, dynamic> json) => Preferences(json);

  /// Guarda o objeto inteiro: salvar não pode apagar o que o app não exibe,
  /// como o tema escolhido no painel web.
  final Map<String, dynamic> raw;

  Map<String, dynamic> get _notifications =>
      asMap(raw['notifications']) ?? const {};

  bool flag(String key) => _notifications[key] == true;

  Preferences withFlag(String key, bool value) => Preferences({
        ...raw,
        'notifications': {..._notifications, key: value},
      });
}
