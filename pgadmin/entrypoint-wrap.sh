#!/bin/sh

# создаем файл с паролем от базы, чтобы не вводить его руками в браузере
mkdir -p /var/lib/pgadmin/storage/admin_pym.ru
echo "pym_db:5432:*:pym_user:pym_password" > /var/lib/pgadmin/pgpass
chmod 600 /var/lib/pgadmin/pgpass

echo "pym_db:5432:*:pym_user:pym_password" > /var/lib/pgadmin/storage/admin_pym.ru/pgpass
chmod 600 /var/lib/pgadmin/storage/admin_pym.ru/pgpass

# если контейнер уже запускался раньше и volume не пустой, все равно обновляем список серверов
if [ -f /var/lib/pgadmin/pgadmin4.db ]; then
    /venv/bin/python3 /pgadmin4/setup.py load-servers /pgadmin4/servers.json --user "${PGADMIN_DEFAULT_EMAIL:-admin@pym.ru}" --replace || true
fi

exec /entrypoint.sh "$@"
