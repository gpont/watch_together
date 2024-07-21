# Watch Together Telegram Bot

[![CI](https://github.com/gpont/watch_together/actions/workflows/ci.yml/badge.svg)](https://github.com/gpont/watch_together/actions/workflows/ci.yml)

Telegram bot for selecting movies to watch together.

## Bot commands

- `/start` - Welcome message and information about commands.
- `/help` - Show the list of commands and their descriptions.
- `/create_group` - Create a new group for group movie watching.
- `/join_group <code>` - Join an existing group by code.
- `/suggest_movie <movie name>` - Suggest a movie for watching.
- `/vote <movie number>` - Vote for a suggested movie.
- `/list_movies` - Show the list of suggested movies.
- `/watched <movie number>` - Mark a movie as watched.
- `/veto <movie number>` - Veto a movie.

## Development

### Install

```bash
git clone https://github.com/gpont/watch_together.git
cd watch_together
npm i
```

### Run

```bash
npm start
```

### Testing

```bash
npm test
```

### Lint and format

```bash
npm run lint:fix
npm run format
```

### Build

```bash
npm run build
```

### Run Docker

```bash
docker build -t watch_together .
docker run -d watch_together
```

### Docker compose

```bash
docker compose up -d
```
