# Imagem oficial do SWI-Prolog (inclui a biblioteca HTTP).
# Para builds reprodutíveis, troca "stable" por uma versão fixa (ex.: 9.2.9).
FROM swipl:stable

ENV LANG=C.UTF-8 \
    PORT=8080 \
    KB_PATH=/data/kb.journal

WORKDIR /app
COPY . .
VOLUME ["/data"]
EXPOSE 8080
CMD ["swipl", "/app/server.pl"]
