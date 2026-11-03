## Как запустить

В папке `PYM` выполнить:

```bash
docker compose up --build
```

### Ссылки после запуска

- Страница приложения: [http://localhost:3000/](http://localhost:3000/)
- Админка управления БД: [http://localhost:5050/browser/](http://localhost:5050/browser/)

## Учетные данные для входа

### Вход в приложение ([http://localhost:3000/](http://localhost:3000/))
- Логин: `sarioglo` / Пароль: `123456`
- Логин: `admin` / Пароль: `admin123`

### Вход в админку БД pgAdmin ([http://localhost:5050/browser/](http://localhost:5050/browser/))
- Email: `admin@pym.ru` / Пароль: `admin_password`
- Сервер `pym_db` (`Host: pym_db`, `Port: 5432`, `Maintenance DB: postgres`, `Username: pym_user`, `Password: pym_password`) добавляется в группу `Servers` автоматически.
