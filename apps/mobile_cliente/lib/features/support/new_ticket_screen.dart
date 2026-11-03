import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';

const _categories = {
  'ORDER_ISSUE': 'Problema com pedido',
  'PRODUCT_QUESTION': 'Dúvida sobre produto',
  'PAYMENT_ISSUE': 'Pagamento',
  'DELIVERY_ISSUE': 'Entrega',
  'REVISION_QUESTION': 'Dúvida sobre revisão',
  'TECHNICAL_SUPPORT': 'Suporte técnico',
  'SUGGESTION': 'Sugestão',
  'COMPLAINT': 'Reclamação',
  'OTHER': 'Outro',
};

class NewTicketScreen extends ConsumerStatefulWidget {
  const NewTicketScreen({super.key});

  @override
  ConsumerState<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends ConsumerState<NewTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  String _category = 'OTHER';
  bool _busy = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final done = await runAction(
      context,
      () => ref.read(apiProvider).createTicket(
            subject: _subject.text.trim(),
            category: _category,
            message: _message.text.trim(),
          ),
      success: 'Atendimento aberto',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (done) {
      ref.invalidate(ticketsProvider);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Novo atendimento')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(labelText: 'Assunto geral'),
              items: [
                for (final entry in _categories.entries)
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)),
              ],
              onChanged: (value) =>
                  setState(() => _category = value ?? _category),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _subject,
              decoration: const InputDecoration(labelText: 'Título'),
              validator: (v) =>
                  (v ?? '').trim().length < 5 ? 'Descreva em poucas palavras' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _message,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Mensagem'),
              validator: (v) =>
                  (v ?? '').trim().length < 10 ? 'Conte um pouco mais' : null,
            ),
            const SizedBox(height: 24),
            BusyButton(label: 'Enviar', busy: _busy, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}
