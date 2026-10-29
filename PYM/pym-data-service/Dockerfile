# Этап 1: Сборка бинарного файла
FROM golang:alpine AS builder

WORKDIR /app

# Скачиваем зависимости (используем кэширование слоев Docker)
COPY go.mod go.sum ./
RUN go mod download

# Копируем исходный код
COPY . .

# Компилируем легковесный статический бинарник под Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o pym-data-service ./cmd

# Этап 2: Финальный минималистичный образ
FROM alpine:latest

WORKDIR /app

# Копируем скомпилированный файл из прошлого этапа
COPY --from=builder /app/pym-data-service .

# Открываем служебный порт
EXPOSE 9801

# Запуск приложения
CMD ["./pym-data-service"]
