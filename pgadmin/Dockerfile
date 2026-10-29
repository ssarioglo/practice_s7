FROM dpage/pgadmin4:8.5

USER root

# копируем конфиг сервера и скрипт запуска
COPY servers.json /pgadmin4/servers.json
COPY entrypoint-wrap.sh /entrypoint-wrap.sh

RUN sed -i 's/\r$//' /entrypoint-wrap.sh && \
    chmod +x /entrypoint-wrap.sh && \
    chown 5050:5050 /pgadmin4/servers.json && \
    chmod 644 /pgadmin4/servers.json

USER pgadmin

ENV PGADMIN_SERVER_JSON_FILE=/pgadmin4/servers.json
ENV PGADMIN_REPLACE_SERVERS_ON_STARTUP=True
ENV PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
ENV PGPASSFILE=/var/lib/pgadmin/pgpass

ENTRYPOINT ["/entrypoint-wrap.sh"]