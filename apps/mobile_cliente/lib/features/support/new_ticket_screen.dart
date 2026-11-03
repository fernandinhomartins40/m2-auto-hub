import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:m2_core/m2_core.dart';

import '../../data/providers.dart';
import '../../shared/ui.dart';

/// Categorias aceitas pela API de suporte.
const ticketCategories = {
  'ORDER_ISSUE': 'Problema com Pedido',
  'PRODUCT_QUESTION': 'Dúvida sobre Produto',
  'PAYMENT_ISSUE': 'Problema com Pagamento',
  'DELIVERY_ISSUE': 'Problema com Entrega',
  'REVISION_QUESTION': 'Dúvida sobre Revisão',
  'TECHNICAL_SUPPORT': 'Suporte Técnico',
  'SUGGESTION': 'Sugestão',
  'COMPLAINT': 'Reclamação',
  'OTHER': 'Outro',
};

const _priorities = {
  'LOW': 'Baixa',
  'MEDIUM': 'Média',
  'HIGH': 'Alta',
  'URGENT': 'Urgente',
};

/// Novo atendimento (`CreateTicketModal` do PWA).
class NewTicketScreen extends ConsumerStatefulWidget {
  const NewTicketScreen({
    super.key,
    this.initialCategory = 'OTHER',
    this.initialSubject,
  });

  final String initialCategory;
  final String? initialSubject;

  @override
  ConsumerState<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends ConsumerState<NewTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _subject = TextEditingController(text: widget.initialSubject);
  final _message = TextEditingController();
  late String _category = widget.initialCategory;
  String _priority = 'MEDIUM';
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
            priority: _priority,
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
    return FormPage(
      title: 'Criar Novo Ticket',
      formKey: _formKey,
      header: const PanelPageHeader(
        icon: LucideIcons.messageCircle,
        title: 'Criar Novo Ticket',
        description: 'Descreva o problema ou dúvida que você está '
            'enfrentando. Nossa equipe responderá em breve.',
      ),
      children: [
        LabeledField(
          label: 'Assunto *',
          child: TextFormField(
            controller: _subject,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Descreva brevemente o problema...',
            ),
            validator: (v) => (v ?? '').trim().length < 5
                ? 'Descreva em poucas palavras'
                : null,
          ),
        ),
        LabeledField(
          label: 'Categoria *',
          child: FilterSelect<String>(
            value: _category,
            options: ticketCategories,
            onChanged: (value) => setState(() => _category = value),
          ),
        ),
        LabeledField(
          label: 'Prioridade *',
          child: FilterSelect<String>(
            value: _priority,
            options: _priorities,
            onChanged: (value) => setState(() => _priority = value),
          ),
        ),
        LabeledField(
          label: 'Mensagem *',
          child: TextFormField(
            controller: _message,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Descreva detalhadamente o problema...',
            ),
            validator: (v) =>
                (v ?? '').trim().length < 10 ? 'Conte um pouco mais' : null,
          ),
        ),
        Row(
          children: [
            OutlinedButton(
              onPressed: _busy ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: BusyButton(
                label: 'Criar Ticket',
                busy: _busy,
                onPressed: _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
