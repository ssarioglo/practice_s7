# Этап 1: Сборка приложения внутри Docker
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Копируем файл конфигурации зависимостей
COPY pom.xml .

# Скачиваем зависимости (кешируем их)
RUN mvn dependency:go-offline -B

# Копируем исходный код проекта
COPY src ./src

# Собираем JAR-файл, игнорируя тесты
RUN mvn clean package -DskipTests

# Этап 2: Финальный легковесный образ для запуска
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Копируем собранный JAR-файл из первого этапа
COPY --from=build /app/target/*.jar app.jar

# Открываем порт шлюза
EXPOSE 9800

# Запуск приложения
ENTRYPOINT ["java", "-jar", "app.jar"]
