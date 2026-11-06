# Как обновлять проект через `git pull` в VS Code

Подробная инструкция для Windows. Обновление занимает 10 секунд, когда всё настроено,
и делается один раз подготовка — если проект был скачан ZIP-архивом.

- Репозиторий: **https://github.com/Roses1s/rebrand.git**
- Ветка с работой: **`arena/53b90abe-rebrand`**
- Репозиторий публичный — логин и токен не нужны.

---

## 0. Главное, что нужно понять

| Как у вас сейчас | Работает ли `git pull` |
|---|---|
| Папка получена командой `git clone` | Да, сразу |
| Папка распакована из ZIP-архива | Нет: внутри нет истории Git → `fatal: not a git repository` |
| Git не установлен | Нет: `git: command not found` |

Проверить просто: в папке проекта должна быть **скрытая папка `.git`**
(Проводник → вкладка **Вид** → **Показать** → **Скрытые элементы**).

Двадцать секунд на проверку — и вы точно знаете, с какого шага начинать.

---

## 1. Проверить, установлен ли Git

1. В VS Code откройте терминал: меню **Terminal → New Terminal** (или `Ctrl + ~`).
2. Выполните:

```powershell
git --version
```

- **Хорошо:** `git version 2.4x.x.windows.1` → идите к шагу 2.
- **Плохо:** `git : Имя "git" не распознано…` / `'git' is not recognized` → Git не установлен.

### Установка Git

Способ А — одна команда в PowerShell:

```powershell
winget install Git.Git
```

Способ Б — установщик: **https://git-scm.com/download/win** → скачать → запустить →
7 раз «Next» → **Install**. Все настройки по умолчанию подходят.

После установки **полностью закройте и заново откройте VS Code** (важно: PATH обновится
только у новых процессов), затем снова проверьте `git --version`.

> В VS Code при первом открытии может появиться уведомление «Git is not installed» —
> там есть кнопка **Download Git**.

---

## 2. Проверить, является ли папка git-копией

В терминале VS Code (он уже открыт в папке проекта) выполните:

```powershell
git status
```

**Вариант 1 — уже git-копия.** Вы увидите что-то вроде:

```
On branch arena/53b90abe-rebrand
Your branch is up to date with 'origin/arena/53b90abe-rebrand'.
nothing to commit, working tree clean
```

→ Переходите к **шагу 4**.

**Вариант 2 — папка из ZIP.** Вы увидите:

```
fatal: not a git repository (or any of the parent directories): .git
```

→ Сначала выполните **шаг 3** (один раз), потом шаг 4.

---

## 3. Один раз подключить папку к GitHub (только для ZIP-версии)

### Способ А (рекомендую): склонировать проект рядом

1. В терминале VS Code:
   ```powershell
   cd C:\Users\ВашеИмя
   git clone -b arena/53b90abe-rebrand https://github.com/Roses1s/rebrand.git
   ```
   Появится новая папка `C:\Users\ВашеИмя\rebrand`.
2. В VS Code: **File → Close Folder**, затем **File → Open Folder…** → выберите **новую** папку `rebrand`.
3. Проверьте: `git status` → `On branch arena/53b90abe-rebrand … working tree clean`.
4. Старую ZIP-папку можно переименовать в `rebrand-old` или удалить
   (если вы что-то правили вручную — сначала скопируйте эти правки).

Дальше любые обновления — это один `git pull`, без скачивания архивов.

### Способ Б: превратить текущую папку в git-копию

Подходит, если не хочется переносить папку. **Внимание:** последняя команда перезапишет
файлы проекта версией из GitHub — ваши локальные правки в них пропадут.

```powershell
git init
git remote add origin https://github.com/Roses1s/rebrand.git
git fetch origin
git checkout -f -B arena/53b90abe-rebrand origin/arena/53b90abe-rebrand
git branch --set-upstream-to=origin/arena/53b90abe-rebrand
```

Проверка: `git status` → `On branch arena/53b90abe-rebrand`, `git pull` → `Already up to date.`

---

## 4. Сделать `git pull` — четыре способа

### Способ 1. Панель Source Control (самый наглядный)

1. Нажмите `Ctrl + Shift + G` — откроется панель **Source Control** (иконка с ветвлением слева).
2. Нажмите **`⋯`** (три точки) в правом верхнем углу панели.
3. Выберите **Pull, Push → Pull** (в русской версии — **Извлечь, отправить → Извлечь**).

Чуть быстрее: в том же меню `⋯` есть пункт **Pull from… / Извлечь из…** — но для обычного
обновления достаточно **Pull**: он тянет изменения из уже привязанной ветки.

### Способ 2. Командная палитра

1. `Ctrl + Shift + P`.
2. Наберите **Git: Pull** и нажмите Enter.

### Способ 3. Кнопка синхронизации в строке состояния

Внизу слева, рядом с названием ветки `arena/53b90abe-rebrand`, есть значок **⟳**
(появляется, когда есть новые коммиты на GitHub). Клик по нему делает fetch + pull
(+ push, если у вас есть свои коммиты — при обычной работе их нет).

### Способ 4. Терминал

```powershell
git pull
```

Если Git пожалуется, что не знает, откуда тянуть:

```powershell
git pull origin arena/53b90abe-rebrand
```

---

## 5. Что вы увидите после успешного обновления

В терминале:

```
remote: Enumerating objects: 12, done.
From https://github.com/Roses1s/rebrand
   83b5fa8..9a1c0d2  arena/53b90abe-rebrand -> origin/arena/53b90abe-rebrand
Updating 83b5fa8..9a1c0d2
Fast-forward
 assets/requests.js | 312 ++++++++++++++++++++++++++++++++
 requests.html      | 420 ++++++++++++++++++++++++++++++++++++++
 3 files changed, 800 insertions(+)
```

Что это значит:
- **`Fast-forward`** — файлы просто обновились, конфликтов не было (обычный и желаемый результат);
- список файлов с `++++` — что именно изменилось;
- в панели Source Control счётчик входящих коммитов исчезнет.

Дальше:
1. Live Server сам перезагрузит открытую страницу (при необходимости — `Ctrl + F5`).
2. Новые страницы открываются по адресу `http://127.0.0.1:5500/<имя>.html`,
   например `http://127.0.0.1:5500/requests.html` — или просто кликом в меню.

Проверить, что пришло именно новое:

```powershell
git log --oneline -3
```

Верхняя строка должна совпадать с последним коммитом, например
`83b5fa8 feat: страница «Заявки» — реестр перевозок, статусы, маржа, карточка заявки`.

---

## 6. Если что-то пошло не так

| Сообщение | Причина | Решение |
|---|---|---|
| `git: command not found` / «не распознано» | Git не установлен | Шаг 1, затем перезапустить VS Code |
| `fatal: not a git repository` | Папка из ZIP, нет `.git` | Шаг 3 |
| `Your local changes to the following files would be overwritten by merge` | Вы правили те же файлы, что пришли из GitHub | `git stash` → `git pull` → `git stash pop` (свои правки вернутся, возможны конфликты) — или проще: `git checkout -- .` (отменить свои правки) и повторить pull |
| `fatal: refusing to merge unrelated histories` | Папка была инициализирована отдельно от репозитория | `git pull origin arena/53b90abe-rebrand --allow-unrelated-histories` либо переклонировать (шаг 3А) |
| `fatal: Need to specify how to reconcile divergent branches` | Git не знает, сливать или перебазировать | `git pull --no-rebase` |
| `There is no tracking information for the current branch` | Ветка не привязана к origin | `git pull origin arena/53b90abe-rebrand` или `git branch --set-upstream-to=origin/arena/53b90abe-rebrand` |
| `detected dubious ownership in repository` | Папка принадлежит другому пользователю Windows | `git config --global --add safe.directory "C:/Users/ВашеИмя/rebrand"` |
| `Authentication failed` / просит логин | Обычно в адресе остался неверный remote | `git remote set-url origin https://github.com/Roses1s/rebrand.git` — публичный репозиторий работает без логина |
| Предупреждения про `LF will be replaced by CRLF` | Разные переводы строк Windows/Linux | Не ошибка, игнорируйте |
| `error: Your local changes ... Untracked working tree files would be overwritten` | В папке есть файлы, которых нет в Git | Переименуйте/удалите мешающие файлы либо используйте `git pull` после `git stash -u` |

### Откат, если обновление что-то сломало

```powershell
git reset --hard origin/arena/53b90abe-rebrand
```

Вернёт папку ровно к состоянию GitHub (локальные правки будут потеряны).

---

## 7. Обновление без Git (напоминание)

Если возиться с Git не хочется — скачайте архив заново и распакуйте **поверх** папки
с заменой файлов, затем `Ctrl + F5` в браузере:

**https://github.com/Roses1s/rebrand/archive/refs/heads/arena/53b90abe-rebrand.zip**

Минус: каждый раз качать весь проект (~100 КБ) и вручную заменять файлы.
Плюс: ничего устанавливать не нужно.

---

## 8. Шпаргалка

```powershell
git --version                     # установлен ли Git
git status                        # в какой ветке, есть ли изменения
git pull                          # обновить проект
git pull origin arena/53b90abe-rebrand   # если не знает, откуда тянуть
git log --oneline -3              # что пришло
git stash                         # временно убрать свои правки
git stash pop                     # вернуть их обратно
git reset --hard origin/arena/53b90abe-rebrand   # откатить всё к версии GitHub
```

| Действие в VS Code | Как |
|---|---|
| Панель Git | `Ctrl + Shift + G` |
| Pull через меню | `⋯` → **Pull, Push → Pull** |
| Pull через палитру | `Ctrl + Shift + P` → **Git: Pull** |
| Терминал | `Ctrl + ~` |
| Обновить страницу | `Ctrl + F5` |
