import 'package:m2_core/m2_core.dart';

/// Modelos do app do cliente. Os campos seguem as respostas reais da API; o que
/// a tela não usa fica de fora.

class Address {
  const Address({
    required this.id,
    required this.type,
    required this.street,
    required this.number,
    required this.neighborhood,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.isDefault,
    this.complement,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'].toString(),
        type: json['type']?.toString() ?? 'HOME',
        street: json['street']?.toString() ?? '',
        number: json['number']?.toString() ?? '',
        complement: json['complement']?.toString(),
        neighborhood: json['neighborhood']?.toString() ?? '',
        city: json['city']?.toString() ?? '',
        state: json['state']?.toString() ?? '',
        zipCode: json['zipCode']?.toString() ?? '',
        isDefault: json['isDefault'] == true,
      );

  final String id;
  final String type;
  final String street;
  final String number;
  final String? complement;
  final String neighborhood;
  final String city;
  final String state;
  final String zipCode;
  final bool isDefault;

  String get typeLabel => switch (type) {
        'WORK' => 'Trabalho',
        'OTHER' => 'Outro',
        _ => 'Casa',
      };

  String get line => [
        '$street, $number',
        if ((complement ?? '').isNotEmpty) complement,
        neighborhood,
        '$city/$state',
      ].join(' · ');
}

class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.level,
    required this.addresses,
    this.cpf,
    this.birthDate,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'].toString(),
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        cpf: json['cpf']?.toString(),
        birthDate: asDate(json['birthDate']),
        level: json['level']?.toString() ?? 'BRONZE',
        addresses: asMapList(json['addresses']).map(Address.fromJson).toList(),
      );

  final String id;
  final String name;
  final String email;
  final String phone;
  final String? cpf;
  final DateTime? birthDate;
  final String level;
  final List<Address> addresses;

  String get firstName => name.trim().split(' ').first;

  String get levelLabel => switch (level) {
        'SILVER' => 'Prata',
        'GOLD' => 'Ouro',
        'PLATINUM' => 'Platina',
        _ => 'Bronze',
      };
}

class OrderItem {
  const OrderItem({
    required this.name,
    required this.quantity,
    required this.price,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        name: json['name']?.toString() ?? 'Item',
        quantity: asInt(json['quantity']),
        price: asDouble(json['price']),
      );

  final String name;
  final int quantity;
  final double price;
}

class Order {
  const Order({
    required this.id,
    required this.status,
    required this.total,
    required this.items,
    this.createdAt,
    this.trackingCode,
    this.paymentMethod,
    this.discount = 0,
    this.address,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final address = asMap(json['address']);
    return Order(
      id: json['id'].toString(),
      status: json['status']?.toString().toUpperCase() ?? 'PENDING',
      total: asDouble(json['total']),
      discount: asDouble(json['discountAmount']),
      items: asMapList(json['items']).map(OrderItem.fromJson).toList(),
      createdAt: asDate(json['createdAt']),
      trackingCode: json['trackingCode']?.toString(),
      paymentMethod: json['paymentMethod']?.toString(),
      address: address == null ? null : Address.fromJson(address),
    );
  }

  final String id;
  final String status;
  final double total;
  final double discount;
  final List<OrderItem> items;
  final DateTime? createdAt;
  final String? trackingCode;
  final String? paymentMethod;
  final Address? address;

  String get shortId => id.length > 8 ? id.substring(0, 8).toUpperCase() : id;

  (String, StatusTone) get statusView => switch (status) {
        'CONFIRMED' => ('Confirmado', StatusTone.info),
        'IN_PRODUCTION' || 'PREPARING' => ('Preparando', StatusTone.warning),
        'SHIPPED' => ('Enviado', StatusTone.info),
        'DELIVERED' => ('Entregue', StatusTone.success),
        'CANCELLED' => ('Cancelado', StatusTone.danger),
        _ => ('Pendente', StatusTone.warning),
      };
}

class QuoteItem {
  const QuoteItem({
    required this.name,
    required this.quantity,
    required this.price,
    this.quotedPrice,
  });

  factory QuoteItem.fromJson(Map<String, dynamic> json) => QuoteItem(
        name: json['name']?.toString() ?? 'Serviço',
        quantity: asInt(json['quantity']),
        price: asDouble(json['price']),
        quotedPrice:
            json['quotedPrice'] == null ? null : asDouble(json['quotedPrice']),
      );

  final String name;
  final int quantity;
  final double price;
  final double? quotedPrice;

  double get unitPrice => quotedPrice ?? price;
}

class Quote {
  const Quote({
    required this.id,
    required this.status,
    required this.total,
    required this.items,
    this.notes,
    this.createdAt,
    this.quotedAt,
    this.expiresAt,
    this.address,
  });

  factory Quote.fromJson(Map<String, dynamic> json) {
    final address = asMap(json['address']);
    return Quote(
      id: json['id'].toString(),
      status: json['status']?.toString() ?? 'PENDING',
      total: asDouble(json['total']),
      items: asMapList(json['items']).map(QuoteItem.fromJson).toList(),
      notes: json['quoteNotes']?.toString() ?? json['observations']?.toString(),
      createdAt: asDate(json['createdAt']),
      quotedAt: asDate(json['quotedAt']),
      expiresAt: asDate(json['publicApprovalExpiresAt']),
      address: address == null ? null : Address.fromJson(address),
    );
  }

  final String id;
  final String status;
  final double total;
  final List<QuoteItem> items;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? quotedAt;
  final DateTime? expiresAt;
  final Address? address;

  String get shortId => id.length > 8 ? id.substring(0, 8).toUpperCase() : id;

  bool get awaitsApproval => status == 'QUOTED';

  (String, StatusTone) get statusView => switch (status) {
        'ANALYZING' => ('Em análise', StatusTone.info),
        'QUOTED' => ('Aguardando sua aprovação', StatusTone.warning),
        'APPROVED' => ('Aprovado por você', StatusTone.success),
        'REJECTED' => ('Recusado por você', StatusTone.danger),
        _ => ('Pendente', StatusTone.neutral),
      };
}

class Vehicle {
  const Vehicle({
    required this.id,
    required this.brand,
    required this.model,
    required this.year,
    required this.plate,
    required this.color,
    this.mileage,
    this.chassisNumber,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'].toString(),
        brand: json['brand']?.toString() ?? '',
        model: json['model']?.toString() ?? '',
        year: asInt(json['year']),
        plate: json['plate']?.toString() ?? '',
        color: json['color']?.toString() ?? '',
        mileage: json['mileage'] == null ? null : asInt(json['mileage']),
        chassisNumber: json['chassisNumber']?.toString(),
      );

  final String id;
  final String brand;
  final String model;
  final int year;
  final String plate;
  final String color;
  final int? mileage;
  final String? chassisNumber;

  String get label => '$brand $model'.trim();
}

class Appointment {
  const Appointment({
    required this.id,
    required this.status,
    this.preferredDate,
    this.scheduledAt,
    this.notes,
    this.adminNotes,
    this.mechanicName,
    this.vehicle,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    final vehicle = asMap(json['vehicle']);
    return Appointment(
      id: json['id'].toString(),
      status: json['status']?.toString() ?? 'REQUESTED',
      preferredDate: asDate(json['preferredDate']),
      scheduledAt: asDate(json['scheduledAt']),
      notes: json['notes']?.toString(),
      adminNotes: json['adminNotes']?.toString(),
      mechanicName: json['mechanicName']?.toString(),
      vehicle: vehicle == null ? null : Vehicle.fromJson(vehicle),
    );
  }

  final String id;
  final String status;
  final DateTime? preferredDate;
  final DateTime? scheduledAt;
  final String? notes;
  final String? adminNotes;
  final String? mechanicName;
  final Vehicle? vehicle;

  bool get canCancel => status == 'REQUESTED' || status == 'SCHEDULED';

  (String, StatusTone) get statusView => switch (status) {
        'SCHEDULED' => ('Agendado', StatusTone.info),
        'IN_SERVICE' => ('Em atendimento', StatusTone.warning),
        'COMPLETED' => ('Concluído', StatusTone.success),
        'CANCELLED' => ('Cancelado', StatusTone.danger),
        _ => ('Solicitado', StatusTone.neutral),
      };
}

class RevisionCheck {
  const RevisionCheck({
    required this.name,
    required this.category,
    required this.status,
    this.notes,
  });

  factory RevisionCheck.fromJson(Map<String, dynamic> json) => RevisionCheck(
        name: json['itemName']?.toString() ?? 'Item',
        category: json['categoryName']?.toString() ?? 'Geral',
        status: json['status']?.toString() ?? 'NOT_CHECKED',
        notes: json['notes']?.toString(),
      );

  final String name;
  final String category;
  final String status;
  final String? notes;

  bool get evaluated => status != 'NOT_CHECKED';

  (String, StatusTone) get statusView => switch (status) {
        'OK' => ('Bom', StatusTone.success),
        'ATTENTION' => ('Atenção', StatusTone.warning),
        'CRITICAL' => ('Crítico', StatusTone.danger),
        'NOT_APPLICABLE' => ('Não se aplica', StatusTone.neutral),
        _ => ('Não avaliado', StatusTone.neutral),
      };
}

class Revision {
  const Revision({
    required this.id,
    required this.status,
    required this.checks,
    this.date,
    this.mileage,
    this.generalNotes,
    this.recommendations,
    this.mechanicName,
    this.vehicle,
  });

  factory Revision.fromJson(Map<String, dynamic> json) {
    final vehicle = asMap(json['vehicle']);
    return Revision(
      id: json['id'].toString(),
      status: json['status']?.toString().toUpperCase() ?? 'DRAFT',
      checks:
          asMapList(json['checklistItems']).map(RevisionCheck.fromJson).toList(),
      date: asDate(json['date']),
      mileage: json['mileage'] == null ? null : asInt(json['mileage']),
      generalNotes: json['generalNotes']?.toString(),
      recommendations: json['recommendations']?.toString(),
      mechanicName: json['mechanicName']?.toString(),
      vehicle: vehicle == null ? null : Vehicle.fromJson(vehicle),
    );
  }

  final String id;
  final String status;
  final List<RevisionCheck> checks;
  final DateTime? date;
  final int? mileage;
  final String? generalNotes;
  final String? recommendations;
  final String? mechanicName;
  final Vehicle? vehicle;

  int countOf(String checkStatus) =>
      checks.where((check) => check.status == checkStatus).length;

  (String, StatusTone) get statusView => switch (status) {
        'IN_PROGRESS' => ('Em andamento', StatusTone.info),
        'COMPLETED' => ('Concluída', StatusTone.success),
        'CANCELLED' => ('Cancelada', StatusTone.danger),
        _ => ('Aguardando início', StatusTone.neutral),
      };
}

class FavoriteProduct {
  const FavoriteProduct({
    required this.productId,
    required this.name,
    required this.price,
    this.promoPrice,
    this.imageUrl,
  });

  factory FavoriteProduct.fromJson(Map<String, dynamic> json) {
    final product = asMap(json['product']) ?? const <String, dynamic>{};
    final images = product['images'];
    final promo = product['promoPrice'];
    return FavoriteProduct(
      productId: json['productId'].toString(),
      name: product['name']?.toString() ?? 'Produto indisponível',
      price: asDouble(product['salePrice']),
      promoPrice: promo == null ? null : asDouble(promo),
      imageUrl: images is List && images.isNotEmpty
          ? imageUrlFrom(images.first.toString())
          : null,
    );
  }

  final String productId;
  final String name;
  final double price;
  final double? promoPrice;
  final String? imageUrl;
}

/// Imagens enviadas pelo painel chegam como caminho relativo (`/uploads/...`).
String imageUrlFrom(String path) =>
    path.startsWith('http') ? path : '${Env.apiOrigin}$path';

class Coupon {
  const Coupon({
    required this.id,
    required this.code,
    required this.description,
    required this.discountType,
    required this.discountValue,
    this.minValue,
    this.maxDiscount,
    this.expiresAt,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) => Coupon(
        id: json['id'].toString(),
        code: json['code']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        discountType: json['discountType']?.toString() ?? 'FIXED',
        discountValue: asDouble(json['discountValue']),
        minValue: json['minValue'] == null ? null : asDouble(json['minValue']),
        maxDiscount: json['maxDiscount'] == null
            ? null
            : asDouble(json['maxDiscount']),
        expiresAt: asDate(json['expiresAt']),
      );

  final String id;
  final String code;
  final String description;
  final String discountType;
  final double discountValue;
  final double? minValue;
  final double? maxDiscount;
  final DateTime? expiresAt;

  String get discountLabel => discountType == 'PERCENTAGE'
      ? '${discountValue.toStringAsFixed(0)}% de desconto'
      : '${formatMoney(discountValue)} de desconto';
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.read,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'].toString(),
        title: json['title']?.toString() ?? '',
        message: json['message']?.toString() ?? '',
        read: json['read'] == true,
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final String title;
  final String message;
  final bool read;
  final DateTime? createdAt;
}

class ServiceOption {
  const ServiceOption({
    required this.id,
    required this.name,
    required this.category,
    this.basePrice,
  });

  factory ServiceOption.fromJson(Map<String, dynamic> json) => ServiceOption(
        id: json['id'].toString(),
        name: json['name']?.toString() ?? '',
        category: json['category']?.toString() ?? '',
        basePrice:
            json['basePrice'] == null ? null : asDouble(json['basePrice']),
      );

  final String id;
  final String name;
  final String category;
  final double? basePrice;
}

class Ticket {
  const Ticket({
    required this.id,
    required this.subject,
    required this.category,
    required this.status,
    this.rating,
    this.updatedAt,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) => Ticket(
        id: json['id'].toString(),
        subject: json['subject']?.toString() ?? '',
        category: json['category']?.toString() ?? 'OTHER',
        status: json['status']?.toString() ?? 'OPEN',
        rating: json['rating'] == null ? null : asInt(json['rating']),
        updatedAt: asDate(json['updatedAt']),
      );

  final String id;
  final String subject;
  final String category;
  final String status;
  final int? rating;
  final DateTime? updatedAt;

  bool get isOpen => status != 'RESOLVED' && status != 'CLOSED';

  (String, StatusTone) get statusView => switch (status) {
        'IN_PROGRESS' => ('Em atendimento', StatusTone.info),
        'WAITING_CUSTOMER' => ('Aguardando você', StatusTone.warning),
        'WAITING_SUPPORT' => ('Aguardando suporte', StatusTone.info),
        'RESOLVED' => ('Resolvido', StatusTone.success),
        'CLOSED' => ('Fechado', StatusTone.neutral),
        _ => ('Aberto', StatusTone.warning),
      };
}

class TicketMessage {
  const TicketMessage({
    required this.id,
    required this.fromCustomer,
    required this.message,
    this.createdAt,
  });

  factory TicketMessage.fromJson(Map<String, dynamic> json) => TicketMessage(
        id: json['id'].toString(),
        fromCustomer:
            json['senderType']?.toString().toLowerCase() == 'customer',
        message: json['message']?.toString() ?? '',
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final bool fromCustomer;
  final String message;
  final DateTime? createdAt;
}

class FaqItem {
  const FaqItem({required this.question, required this.answer});

  factory FaqItem.fromJson(Map<String, dynamic> json) => FaqItem(
        question: json['question']?.toString() ?? '',
        answer: json['answer']?.toString() ?? '',
      );

  final String question;
  final String answer;
}

class FaqCategory {
  const FaqCategory({required this.name, required this.items});

  factory FaqCategory.fromJson(Map<String, dynamic> json) => FaqCategory(
        name: json['name']?.toString() ?? '',
        items: asMapList(json['items']).map(FaqItem.fromJson).toList(),
      );

  final String name;
  final List<FaqItem> items;
}

class SupportContacts {
  const SupportContacts({
    this.whatsapp,
    this.whatsappMessage,
    this.email,
    this.phone,
    this.hours = const [],
  });

  factory SupportContacts.fromJson(Map<String, dynamic> json) {
    final contacts = asMap(json['contacts']) ?? const <String, dynamic>{};
    final whatsapp = asMap(contacts['whatsapp']) ?? const <String, dynamic>{};
    final business = asMap(json['businessHours']) ?? const <String, dynamic>{};
    return SupportContacts(
      whatsapp: whatsapp['number']?.toString(),
      whatsappMessage: whatsapp['message']?.toString(),
      email: contacts['email']?.toString(),
      phone: contacts['phone']?.toString(),
      hours: [
        for (final key in const ['weekdays', 'saturday', 'sunday'])
          if (asMap(business[key]) case final day?)
            '${day['label']}: ${day['hours']}',
      ],
    );
  }

  final String? whatsapp;
  final String? whatsappMessage;
  final String? email;
  final String? phone;
  final List<String> hours;
}
