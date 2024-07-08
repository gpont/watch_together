# Используем официальный Node.js образ в качестве базового
FROM node:14

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Компилируем TypeScript
RUN npm run build

# Открываем порт 3000 для работы бота
EXPOSE 3000

# Определяем команду для запуска приложения
CMD ["node", "dist/controllers/bot.js"]
