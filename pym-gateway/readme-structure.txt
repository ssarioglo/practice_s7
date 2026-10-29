pym-gateway/
├── pom.xml                        # Манифест проекта Maven (зависимости и сборка)
├── Dockerfile                     # Инструкция для сборки шлюза в Docker-контейнер
└── src/
    └── main/
        ├── java/
        │   └── ru/
        │       └── pym/
        │           └── gateway/
        │               └── GatewayApplication.java # Точка входа (Главный класс)
        └── resources/
            └── application.yml    # Тот самый конфигурационный файл с картой портов


user@pym.ru
my_secure_password123