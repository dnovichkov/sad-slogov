# Сайт для https://sad-slogov.dmdp.ru/ — собирается тем же npm run build, что и GitHub Pages.
# build — это check.mjs (согласованность материала), test.mjs (прогон занятия) и копирование
# public/ в dist/ без служебного art-sheet.html, поэтому образ не соберётся на битых данных.

FROM node:22-alpine AS build
WORKDIR /app
# Внешних зависимостей нет: ни npm install, ни lock-файл не нужны.
COPY package.json ./
COPY check.mjs test.mjs build.mjs ./
COPY public public
RUN npm run build

# Минорная версия закреплена: новый nginx не должен внезапно иначе прочитать конфиг.
FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
