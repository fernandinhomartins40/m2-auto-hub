# Artes de destaque para Google Play

Propostas geradas com a ferramenta integrada de geração de imagens, usando como referências a logo oficial e o ícone atual fornecidos na conversa. As imagens foram reenquadradas e redimensionadas para 1024 × 500 pixels, PNG RGB sem transparência.

- `mecanico-feature.png`: arte para o aplicativo do mecânico.
- `cliente-feature.png`: arte para o aplicativo do cliente.
- `mecanico-icone.png`: ícone da ficha da Play Store, com chave para identificar o mecânico.
- `cliente-icone.png`: ícone da ficha da Play Store, com carro para identificar o cliente.

Os ícones foram gerados a partir da referência 3D enviada, depois redimensionados para 512 × 512 pixels em PNG de 32 bits; cada arquivo tem menos de 1 MB. São imagens para a ficha da loja, não recursos adaptativos de launcher. A integração em um app Android requer camadas próprias e verificação da área segura em diferentes máscaras. A geração recria o símbolo, portanto sua fidelidade deve ser conferida. Especificações: [ícone para Google Play](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) e [ícones adaptativos](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

A logo presente em cada cena foi **redesenhada pela ferramenta de geração** a partir da referência; não é uma cópia exata do arquivo original. Confira a fidelidade da marca antes de publicar. As imagens são gráficos promocionais, não capturas de tela. Para screenshots, use telas reais dos respectivos aplicativos. O Flutter neste repositório é documentado como aplicativo administrativo; confirme os nomes e as funcionalidades dos apps de cliente e mecânico antes do envio.

Os arquivos atendem às dimensões e ao formato de gráfico de destaque indicados nas [orientações do Google Play](https://support.google.com/googleplay/android-developer/answer/9866151?hl=pt-BR). A aprovação depende também da experiência real e das demais políticas da loja.

## Prompts

Para cada público, gerar uma única cena fotográfica limpa de oficina moderna, com uma pessoa ao lado de um veículo. Usar a logo oficial enviada como referência para símbolo, letras e texto; usar o ícone atual como referência para azul luminoso e fundo escuro. Incluir somente “Área do Mecânico” ou “Área do Cliente”, conforme o público. Evitar colagens, telas simuladas, selos, marcas de terceiros e textos adicionais.

Para os ícones: preservar o símbolo de três barras em acabamento 3D azul e ciano brilhante sobre fundo azul-escuro, com margens amplas; diferenciar com uma chave discreta para o mecânico e um carro para o cliente, sem texto.
