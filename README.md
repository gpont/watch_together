# Watch Together Telegram Bot

[![CI](https://github.com/gpont/watch_together/actions/workflows/ci.yml/badge.svg)](https://github.com/gpont/watch_together/actions/workflows/ci.yml) ![Last commit](https://img.shields.io/github/last-commit/gpont/watch_together) ![Issues](https://img.shields.io/github/issues/gpont/watch_together)

![preview-image](./docs/preview-image.png)

Telegram bot for selecting movies to watch together.
[@watch_together_tg_bot](https://t.me/watch_together_tg_bot)

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

### Run and developing

1. Create `.env` file with `BOT_TOKEN` variable;
2. Run `npm init:db`;
3. Run `npm start`;

### Testing

```bash
npm test
```

### Lint and format

```bash
npm run lint-format
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

or

```bash
docker run -d ghcr.io/gpont/watch_together:latest
```

### Docker compose

```bash
docker compose up -d
```

## Other links

[Tech info](./docs/tech_info.md)
