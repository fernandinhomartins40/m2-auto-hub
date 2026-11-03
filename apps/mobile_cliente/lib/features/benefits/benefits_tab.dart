import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/models.dart';
import '../../data/providers.dart';
import '../../shared/links.dart';

class BenefitsTab extends StatelessWidget {
  const BenefitsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(tabs: [Tab(text: 'Favoritos'), Tab(text: 'Cupons')]),
          Expanded(child: TabBarView(children: [_Favorites(), _Coupons()])),
        ],
      ),
    );
  }
}

class _Favorites extends ConsumerWidget {
  const _Favorites();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncPage<List<FavoriteProduct>>(
      value: ref.watch(favoritesProvider),
      onRefresh: () => ref.refresh(favoritesProvider.future),
      isEmpty: (items) => items.isEmpty,
      emptyIcon: Icons.favorite_border,
      emptyMessage: 'Os produtos que você favoritar na loja aparecem aqui.',
      emptyAction: OutlinedButton(
        onPressed: () => openStore(context),
        child: const Text('Explorar produtos'),
      ),
      builder: (items) => [
        for (final item in items)
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: _ProductImage(url: item.imageUrl),
              title: Text(item.name),
              subtitle: Text(formatMoney(item.promoPrice ?? item.price)),
              trailing: IconButton(
                tooltip: 'Remover dos favoritos',
                icon: const Icon(Icons.favorite),
                onPressed: () async {
                  final done = await runAction(
                    context,
                    () => ref.read(apiProvider).removeFavorite(item.productId),
                    success: 'Removido dos favoritos',
                  );
                  if (done) ref.invalidate(favoritesProvider);
                },
              ),
            ),
          ),
      ],
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    const placeholder = Icon(Icons.inventory_2_outlined);
    final image = url;
    return SizedBox.square(
      dimension: 48,
      child: image == null
          ? placeholder
          : ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                image,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => placeholder,
              ),
            ),
    );
  }
}

class _Coupons extends ConsumerWidget {
  const _Coupons();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncPage<List<Coupon>>(
      value: ref.watch(couponsProvider),
      onRefresh: () => ref.refresh(couponsProvider.future),
      isEmpty: (items) => items.isEmpty,
      emptyIcon: Icons.confirmation_number_outlined,
      emptyMessage: 'Nenhum cupom disponível no momento.',
      builder: (items) => [
        for (final coupon in items)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    coupon.discountLabel,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (coupon.description.isNotEmpty) Text(coupon.description),
                  const SizedBox(height: 8),
                  if ((coupon.minValue ?? 0) > 0)
                    InfoRow('Compra mínima', formatMoney(coupon.minValue!)),
                  if ((coupon.maxDiscount ?? 0) > 0)
                    InfoRow('Desconto máximo', formatMoney(coupon.maxDiscount!)),
                  InfoRow('Válido até', formatDate(coupon.expiresAt)),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: coupon.code));
                      if (context.mounted) {
                        showMessage(context, 'Cupom ${coupon.code} copiado');
                      }
                    },
                    icon: const Icon(Icons.copy),
                    label: Text(coupon.code),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
