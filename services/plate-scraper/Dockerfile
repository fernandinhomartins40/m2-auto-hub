FROM mcr.microsoft.com/playwright:v1.49.1-jammy

ENV NODE_ENV=production \
    PORT=8100 \
    # O Chrome precisa rodar headful (headless leva 403), entao ha um display
    # virtual servido pelo Xvfb (criado no entrypoint).
    DISPLAY=:99

WORKDIR /app

# xdpyinfo e usado pelo entrypoint para saber quando o display ficou pronto.
RUN apt-get update \
    && apt-get install -y --no-install-recommends x11-utils \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8100

# `xvfb-run --auto-servernum` escolhe um display proprio e ignora o DISPLAY
# definido acima, o que deixava o node sem tela. O entrypoint sobe o Xvfb no
# display fixo e so entao inicia o servidor.
ENTRYPOINT ["./entrypoint.sh"]
