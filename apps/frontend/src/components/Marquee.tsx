import { colorOrGradientToCSS } from '@/components/admin/LandingPageEditor/StyleControls';
import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';
import { useMarqueeMessages } from '@/hooks/useMarqueeMessages';
import type { MarqueeConfig } from '@/types/landingPage';

interface MarqueeProps {
  previewConfig?: MarqueeConfig;
}

export function Marquee({ previewConfig }: MarqueeProps = {}) {
  const { messages, loading } = useMarqueeMessages();
  const { config, loading: configLoading } = useLandingPageConfig();

  const effectiveConfig = previewConfig ?? config.marquee;
  const isPreview = Boolean(previewConfig);
  const isConfigLoading = isPreview ? false : configLoading;

  if (!isConfigLoading && effectiveConfig.enabled === false) {
    return null;
  }

  const cmsMessages =
    !isConfigLoading && effectiveConfig.items && effectiveConfig.items.length > 0
      ? effectiveConfig.items.map((item) => `${item.icon} ${item.text}`)
      : null;

  const apiMessages = messages
    .filter((msg) => msg.active)
    .sort((a, b) => a.order - b.order)
    .map((msg) => msg.message);

  const displayMessages = cmsMessages ||
    (apiMessages.length > 0
      ? apiMessages
      : [
          '🔧 PEÇAS ORIGINAIS COM ATÉ 30% DE DESCONTO',
          '⚡ SERVIÇOS ESPECIALIZADOS - ORÇAMENTO GRÁTIS',
          '🚗 ENTREGA RÁPIDA EM TODA A CIDADE',
          '🛠️ QUALIDADE GARANTIDA - ESPECIALISTAS HÁ MAIS DE 15 ANOS',
          '💰 PROMOÇÕES IMPERDÍVEIS - CONFIRA NOSSAS OFERTAS',
        ]);

  const backgroundStyle = !isConfigLoading
    ? colorOrGradientToCSS(effectiveConfig.backgroundColor)
    : { background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' };
  const textStyle = !isConfigLoading
    ? colorOrGradientToCSS(effectiveConfig.textColor, { forText: true })
    : { color: '#ffffff' };
  const speed = !isConfigLoading ? effectiveConfig.speed : 30;

  if (!isPreview && loading && messages.length === 0 && isConfigLoading) {
    return (
      <div className="gradient-marquee text-white py-2 overflow-hidden">
        <div className="marquee whitespace-nowrap text-sm font-bold">
          🔧 PEÇAS ORIGINAIS COM ATÉ 30% DE DESCONTO • ⚡ SERVIÇOS ESPECIALIZADOS - ORÇAMENTO
          GRÁTIS • 🚗 ENTREGA RÁPIDA EM TODA A CIDADE
        </div>
      </div>
    );
  }

  return (
    <div
      className="py-2 overflow-hidden"
      style={{
        ...backgroundStyle,
        ...textStyle,
      }}
    >
      <div
        className="marquee whitespace-nowrap text-sm font-bold"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {displayMessages.join(' • ')} • {displayMessages.join(' • ')} • {displayMessages.join(' • ')} •{' '}
        {displayMessages.join(' • ')}
      </div>
    </div>
  );
}
