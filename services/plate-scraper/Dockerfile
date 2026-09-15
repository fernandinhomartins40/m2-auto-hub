# PLANO ITEM 3: a base era mcr.microsoft.com/playwright:v1.49.1-jammy (3,39 GB
# de imagem), que traz Chromium, Firefox, WebKit e o ferramental de teste.
# server.js importa apenas `chromium`, entao Firefox e WebKit sao peso morto.
#
# node:20-slim + `playwright install --with-deps chromium` instala o Chromium e
# as bibliotecas de sistema que ele exige. Aqui NAO se usa `--only-shell`: o
# scraper roda headful (headless leva 403), e o headless shell nao serve -
# e preciso o Chromium completo. Medido na VPS: 3,39 GB -> 485 MB.
#
# Validado com o Xvfb de verdade: navegador sobe headful, DOM responde e o
# user-agent nao contem "Headless" - que e o que faz a consulta nao levar 403.
FROM node:20-slim

ENV NODE_ENV=production \
    PORT=8100 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    # O Chrome precisa rodar headful (headless leva 403), entao ha um display
    # virtual servido pelo Xvfb (criado no entrypoint).
    DISPLAY=:99

WORKDIR /app

# xvfb: o display virtual. xdpyinfo (x11-utils): usado pelo entrypoint para
# saber quando o display ficou pronto. Ambos vinham de graca na base anterior.
RUN npx --yes playwright@1.49.1 install --with-deps chromium \
    && apt-get update \
    && apt-get install -y --no-install-recommends xvfb x11-utils \
    && rm -rf /root/.npm /var/lib/apt/lists/*

# PLANO ITEM 5: era `npm install` sem lockfile. `playwright` ja estava fixo em
# 1.49.1, mas as transitivas (playwright-core) resolviam do zero a cada build -
# o mesmo mecanismo que quebrou o backend em agosto, em escala menor. Com o
# lockfile e `npm ci`, o build falha explicitamente se lock e package.json
# divergirem, em vez de instalar silenciosamente outra coisa.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server.js entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8100

# `xvfb-run --auto-servernum` escolhe um display proprio e ignora o DISPLAY
# definido acima, o que deixava o node sem tela. O entrypoint sobe o Xvfb no
# display fixo e so entao inicia o servidor.
ENTRYPOINT ["./entrypoint.sh"]
